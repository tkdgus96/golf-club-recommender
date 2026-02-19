
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createRealisticGrassTextures } from "../../utils/proceduralTextures";
import type { RenderPerformanceSample } from "../../utils/monitoring";
import type { BallFlightResult } from "../../types";

interface BallFlightCanvasProps {
  result: BallFlightResult | null;
  isMetric: boolean;
  quality?: "ultra" | "balanced" | "safe";
  onRenderFailure?: (reason: string) => void;
  onPerformanceSample?: (sample: RenderPerformanceSample) => void;
}

export default function BallFlightCanvas({
  result,
  isMetric,
  quality = "ultra",
  onRenderFailure,
  onPerformanceSample,
}: BallFlightCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    ball: THREE.Mesh;
    trajectoryLine: THREE.Object3D | null;
    animationId: number;
    ballAnimationId: number;
    impactParticles: THREE.Points;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setRenderError(null);

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const qualityConfig =
      quality === "safe"
        ? { pixelRatioCap: 1.2, shadowMapSize: 1024, textureSize: 512, starCount: 400 }
        : quality === "balanced"
        ? { pixelRatioCap: 1.8, shadowMapSize: 2048, textureSize: 1024, starCount: 800 }
        : { pixelRatioCap: 2.5, shadowMapSize: 4096, textureSize: 2048, starCount: 1200 };

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1a2f, 0.002);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000);
    camera.position.set(0, 5, 8); // Slightly higher and further back

    // --- Renderer ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality !== "safe",
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      });
    } catch (error) {
      const message = "WebGL renderer initialization failed";
      setRenderError(message);
      onRenderFailure?.(message);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityConfig.pixelRatioCap));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Ensure vivid colors
    container.appendChild(renderer.domElement);

    // --- Environment / Lighting (PBR) ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // Use RoomEnvironment for realistic reflections
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;
    roomEnv.dispose();

    // Sky gradient
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0.0, "#020408"); // Deep space
    gradient.addColorStop(0.5, "#0a1a2f"); // Mid
    gradient.addColorStop(1.0, "#1e3c55"); // Horizon
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    scene.background = new THREE.CanvasTexture(canvas);

    // Subtle star field for depth
    const starGeo = new THREE.BufferGeometry();
    const starCount = qualityConfig.starCount;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 1400;
      starPos[i * 3 + 1] = 80 + Math.random() * 320;
      starPos[i * 3 + 2] = -Math.random() * 2400;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x9ad9ff,
      size: 1.1,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
      depthWrite: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Lighting
    // 1. Hemisphere Light (Natural Ambient)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0a2a0a, 0.6);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    // 2. Main Sun/Stadium Light (Sharp shadows)
    // Positioned to cast shadows forward-right
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    sunLight.position.set(50, 150, 50); 
    sunLight.castShadow = true;
    
    // Optimized shadow properties
    sunLight.shadow.mapSize.width = qualityConfig.shadowMapSize;
    sunLight.shadow.mapSize.height = qualityConfig.shadowMapSize;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    const shadowSize = 150;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    sunLight.shadow.bias = -0.00005;
    sunLight.shadow.radius = 2; // Soft edges
    scene.add(sunLight);

    // Fill/rim lights to mimic monitor-bay lighting
    const fillLight = new THREE.DirectionalLight(0x7dc4ff, 0.9);
    fillLight.position.set(-80, 40, 30);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0x66ffd6, 0.8, 900);
    rimLight.position.set(0, 25, -220);
    scene.add(rimLight);

    // --- Post Processing ---
    const renderScene = new RenderPass(scene, camera);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.85,  // strength
      0.28,  // radius
      0.82  // threshold
    );

    const outputPass = new OutputPass();

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 500; // Allow zooming out to see full shot
    controls.target.set(0, 10, -50); // Look further down range and slightly up

    // --- Materials (PBR) ---
    
    // 1. Realistic Grass
    // Generate high-res texture maps
    const { albedo, normal, roughness } = createRealisticGrassTextures(
      qualityConfig.textureSize
    );
    
    const textureRepeat = 60; // High repetition for density
    [albedo, normal, roughness].forEach(t => {
      t.repeat.set(textureRepeat, textureRepeat);
    });

    const groundMat = new THREE.MeshStandardMaterial({ 
      map: albedo,
      normalMap: normal,
      roughnessMap: roughness,
      color: 0xffffff, // Let texture drive color
      roughness: 1.0, // Let map drive roughness
      metalness: 0.0,
      normalScale: new THREE.Vector2(1.5, 1.5) // Deep normal
    });

    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -1000; // Extend forward
    ground.receiveShadow = true;
    scene.add(ground);

    // Fairway lane overlays
    const laneMat = new THREE.MeshStandardMaterial({
      color: 0x2f6b39,
      transparent: true,
      opacity: 0.32,
      roughness: 0.95,
      metalness: 0.0,
    });
    const laneGeo = new THREE.PlaneGeometry(54, 1800);
    const centerLane = new THREE.Mesh(laneGeo, laneMat);
    centerLane.rotation.x = -Math.PI / 2;
    centerLane.position.set(0, 0.06, -900);
    centerLane.receiveShadow = true;
    scene.add(centerLane);

    // Centerline and side corridors
    const centerLineMat = new THREE.LineDashedMaterial({
      color: 0x88fff2,
      dashSize: 5,
      gapSize: 5,
      transparent: true,
      opacity: 0.6,
    });
    const centerLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.08, 0),
      new THREE.Vector3(0, 0.08, -1900),
    ]);
    const centerLine = new THREE.Line(centerLineGeo, centerLineMat);
    centerLine.computeLineDistances();
    scene.add(centerLine);

    const sideGuideMat = new THREE.LineBasicMaterial({
      color: 0x7fd2ff,
      transparent: true,
      opacity: 0.25,
    });
    [-20, 20].forEach((xOffset) => {
      const sideGuideGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xOffset, 0.08, 0),
        new THREE.Vector3(xOffset, 0.08, -1900),
      ]);
      scene.add(new THREE.Line(sideGuideGeo, sideGuideMat));
    });

    // 2. Holographic Grid (Subtle)
    const gridHelper = new THREE.GridHelper(2000, 200, 0x55ffff, 0x112233);
    gridHelper.position.set(0, 0.05, -1000);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.1;
    scene.add(gridHelper);

    // 3. Tee Box
    const teeGeo = new THREE.BoxGeometry(4, 0.1, 4);
    const teeMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1
    });
    const teeBox = new THREE.Mesh(teeGeo, teeMat);
    teeBox.position.set(0, 0.05, 0);
    teeBox.receiveShadow = true;
    scene.add(teeBox);

    // 4. Ball (High Gloss PBR)
    const ballGeo = new THREE.SphereGeometry(0.8, 64, 64);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.0,
      envMapIntensity: 1.0
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    ball.position.set(0, 0.8, 0);
    scene.add(ball);

    // Impact Particles
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 50;
    const posArray = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount*3; i++) posArray[i] = 0;
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    const impactParticles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(impactParticles);

    // Distance Markers
    const createMarker = (dist: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; 
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;
      
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${dist}${isMetric ? 'm' : 'yd'}`, 128, 64);
      
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ 
        map: tex, 
        transparent: true,
        blending: THREE.AdditiveBlending 
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2, -dist); // Markers along Z axis now
      sprite.scale.set(20, 10, 1);
      return sprite;
    };

    [50, 100, 150, 200, 250, 300, 350].forEach((d) => scene.add(createMarker(d)));

    // Store refs
    sceneRef.current = {
      renderer,
      composer,
      scene,
      camera,
      controls,
      ball,
      trajectoryLine: null,
      animationId: 0,
      ballAnimationId: 0,
      impactParticles
    };

    let sampleStartAt = performance.now();
    let lastFrameAt = sampleStartAt;
    let frameCount = 0;
    let droppedFrames = 0;
    const frameBudgetMs =
      quality === "ultra" ? 21 : quality === "balanced" ? 26 : 31;
    const lowFpsThreshold =
      quality === "ultra" ? 45 : quality === "balanced" ? 36 : 28;

    // Animation Loop
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = now - lastFrameAt;
      lastFrameAt = now;
      frameCount += 1;
      if (delta > frameBudgetMs) droppedFrames += 1;

      const elapsed = now - sampleStartAt;
      if (elapsed >= 1600) {
        const fps = (frameCount * 1000) / elapsed;
        const frameTimeMs = elapsed / Math.max(frameCount, 1);
        const droppedFrameRatio = droppedFrames / Math.max(frameCount, 1);
        onPerformanceSample?.({
          source: "simulator",
          quality,
          fps,
          frameTimeMs,
          droppedFrameRatio,
          lowFps: fps < lowFpsThreshold,
        });
        sampleStartAt = now;
        frameCount = 0;
        droppedFrames = 0;
      }
      controls.update();
      composer.render();
    };
    animate();

    // Resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        if (sceneRef.current.ballAnimationId) {
          cancelAnimationFrame(sceneRef.current.ballAnimationId);
        }
        pmremGenerator.dispose();
        controls.dispose();
        renderer.dispose();
        composer.dispose();
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [isMetric, onPerformanceSample, onRenderFailure, quality]);

  // Handle Result Changes (Same as before)
  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, ball } = sceneRef.current;

    if (sceneRef.current.trajectoryLine) {
      scene.remove(sceneRef.current.trajectoryLine);
      sceneRef.current.trajectoryLine = null;
    }

    if (!result || result.trajectory.length === 0) {
      ball.position.set(0, 0.8, 0);
      return;
    }

    // In Three.js standard coordinates: -Z is Forward, +X is Right, +Y is Up
    // Physics engine output: x = Right (?), y = Up, z = Forward distance (absolute value)
    
    // Check physics: 
    // In ballFlight.ts: vz = ballSpeed * cos(launch) * sin(face)
    // Typically faceAngle > 0 is right. sin(>0) > 0. So vz > 0 means Right?
    // Wait, let's assume physics output:
    // x = Horizontal deviation (Right is positive)
    // y = Vertical height
    // z = Forward distance (Down range)
    
    // Map to Three.js (-Z forward):
    // Three.x = Physics.x (Right)
    // Three.y = Physics.y (Up)
    // Three.z = -Physics.z (Forward)
    
    const points = result.trajectory.map((p) => new THREE.Vector3(p.z, p.y, -p.x));
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 180, 0.36, 12, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x3ad2ff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    });

    const midGeo = new THREE.TubeGeometry(curve, 180, 0.18, 12, false);
    const midMat = new THREE.MeshBasicMaterial({
      color: 0x95ecff,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
    });
    const midMesh = new THREE.Mesh(midGeo, midMat);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    });
    const coreGeo = new THREE.TubeGeometry(curve, 180, 0.07, 10, false);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);

    const group = new THREE.Group();
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    group.add(tubeMesh);
    group.add(midMesh);
    group.add(coreMesh);

    // Ground projection of shot shape for lateral dispersion readability
    const groundProjectionPts = points.map((pt) => new THREE.Vector3(pt.x, 0.09, pt.z));
    const projectionGeo = new THREE.BufferGeometry().setFromPoints(groundProjectionPts);
    const projectionMat = new THREE.LineDashedMaterial({
      color: 0x42d6ff,
      dashSize: 2.6,
      gapSize: 2.2,
      transparent: true,
      opacity: 0.6,
    });
    const projectionLine = new THREE.Line(projectionGeo, projectionMat);
    projectionLine.computeLineDistances();
    group.add(projectionLine);

    // Apex marker
    let apexPoint = points[0];
    for (const pt of points) {
      if (pt.y > apexPoint.y) apexPoint = pt;
    }
    const apexMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 18, 18),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      })
    );
    apexMarker.position.copy(apexPoint);
    group.add(apexMarker);

    // Landing ring pulse
    const landingPoint = points[points.length - 1];
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 2.2, 48),
      new THREE.MeshBasicMaterial({
        color: 0x3ad2ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(landingPoint.x, 0.11, landingPoint.z);
    group.add(ring);
    
    scene.add(group);
    sceneRef.current.trajectoryLine = group;

    if (sceneRef.current.ballAnimationId) {
      cancelAnimationFrame(sceneRef.current.ballAnimationId);
    }

    let frame = 0;
    const animateBall = () => {
      if (!sceneRef.current) return;
      if (frame < points.length) {
        ball.position.copy(points[frame]);
        // Camera assist: subtle follow for premium simulator feel
        sceneRef.current.controls.target.lerp(points[frame], 0.08);
        ring.scale.setScalar(1 + Math.sin(frame * 0.08) * 0.06);
        frame += 2; 
        sceneRef.current.ballAnimationId = requestAnimationFrame(animateBall);
      } else {
        const last = points[points.length-1];
        ball.position.set(last.x, 0.8, last.z);
        sceneRef.current.ballAnimationId = 0;
      }
    };
    animateBall();

  }, [result]);

  if (renderError) {
    return (
      <div className="ball-flight-fallback">
        <h4>3D simulator unavailable</h4>
        <p>WebGL could not be initialized on this device.</p>
      </div>
    );
  }

  return <div ref={containerRef} className="ball-flight-canvas" />;
}
