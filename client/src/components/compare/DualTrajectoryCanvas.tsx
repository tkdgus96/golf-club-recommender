
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
import { useTranslation } from "react-i18next";

interface DualTrajectoryCanvasProps {
  currentResult: BallFlightResult | null;
  targetResult: BallFlightResult | null;
  isMetric: boolean;
  quality?: "ultra" | "balanced" | "safe";
  onRenderFailure?: (reason: string) => void;
  onPerformanceSample?: (sample: RenderPerformanceSample) => void;
}

export default function DualTrajectoryCanvas({
  currentResult,
  targetResult,
  isMetric,
  quality = "ultra",
  onRenderFailure,
  onPerformanceSample,
}: DualTrajectoryCanvasProps) {
  const { t } = useTranslation("compare");
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    trajectories: THREE.Object3D[];
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setRenderError(null);

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const qualityConfig =
      quality === "safe"
        ? { pixelRatioCap: 1.2, shadowMapSize: 1024, textureSize: 512, particleCount: 300 }
        : quality === "balanced"
        ? { pixelRatioCap: 1.8, shadowMapSize: 2048, textureSize: 1024, particleCount: 600 }
        : { pixelRatioCap: 2.5, shadowMapSize: 4096, textureSize: 2048, particleCount: 900 };

    // --- Scene Setup (Matches BallFlightCanvas) ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1a2f, 0.002);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000);
    camera.position.set(0, 5, 8); // Behind ball view

    // --- Renderer ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality !== "safe",
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      });
    } catch (_error) {
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // --- Environment / Lighting (PBR) ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;
    roomEnv.dispose();

    // Sky gradient
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0.0, "#020408");
    gradient.addColorStop(0.5, "#0a1a2f");
    gradient.addColorStop(1.0, "#1e3c55");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    scene.background = new THREE.CanvasTexture(canvas);

    // Subtle sky particles for depth
    const skyParticleGeo = new THREE.BufferGeometry();
    const skyParticleCount = qualityConfig.particleCount;
    const skyPos = new Float32Array(skyParticleCount * 3);
    for (let i = 0; i < skyParticleCount; i++) {
      skyPos[i * 3] = (Math.random() - 0.5) * 1200;
      skyPos[i * 3 + 1] = 80 + Math.random() * 280;
      skyPos[i * 3 + 2] = -Math.random() * 2200;
    }
    skyParticleGeo.setAttribute("position", new THREE.BufferAttribute(skyPos, 3));
    scene.add(
      new THREE.Points(
        skyParticleGeo,
        new THREE.PointsMaterial({
          color: 0x8dcfff,
          size: 1,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        })
      )
    );

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0a2a0a, 0.6);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

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
    sunLight.shadow.radius = 2;
    scene.add(sunLight);

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
      0.85, 0.28, 0.82
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
    controls.maxDistance = 500;
    controls.target.set(0, 10, -50);

    // --- Materials (PBR) ---
    
    // 1. Realistic Grass
    const { albedo, normal, roughness } = createRealisticGrassTextures(
      qualityConfig.textureSize
    );
    const textureRepeat = 60;
    [albedo, normal, roughness].forEach(t => t.repeat.set(textureRepeat, textureRepeat));

    const groundMat = new THREE.MeshStandardMaterial({ 
      map: albedo,
      normalMap: normal,
      roughnessMap: roughness,
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      normalScale: new THREE.Vector2(1.5, 1.5)
    });

    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -1000;
    ground.receiveShadow = true;
    scene.add(ground);

    const fairwayLane = new THREE.Mesh(
      new THREE.PlaneGeometry(54, 1800),
      new THREE.MeshStandardMaterial({
        color: 0x2f6b39,
        transparent: true,
        opacity: 0.32,
        roughness: 0.95,
      })
    );
    fairwayLane.rotation.x = -Math.PI / 2;
    fairwayLane.position.set(0, 0.06, -900);
    scene.add(fairwayLane);

    const centerLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.08, 0),
        new THREE.Vector3(0, 0.08, -1900),
      ]),
      new THREE.LineDashedMaterial({
        color: 0x88fff2,
        dashSize: 5,
        gapSize: 5,
        transparent: true,
        opacity: 0.55,
      })
    );
    centerLine.computeLineDistances();
    scene.add(centerLine);

    // 2. Holographic Grid
    const gridHelper = new THREE.GridHelper(2000, 200, 0x55ffff, 0x112233);
    gridHelper.position.set(0, 0.05, -1000);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.1;
    scene.add(gridHelper);

    // 3. Tee Box
    const teeGeo = new THREE.BoxGeometry(4, 0.1, 4);
    const teeMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111, roughness: 0.9, metalness: 0.1 
    });
    const teeBox = new THREE.Mesh(teeGeo, teeMat);
    teeBox.position.set(0, 0.05, 0);
    teeBox.receiveShadow = true;
    scene.add(teeBox);

    // 4. Ball (Static for comparison view)
    const ballGeo = new THREE.SphereGeometry(0.8, 64, 64);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.2, metalness: 0.0, envMapIntensity: 1.0
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    ball.position.set(0, 0.8, 0);
    scene.add(ball);

    // Distance Markers
    const createMarker = (dist: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 15;
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${dist}${isMetric ? 'm' : 'yd'}`, 128, 64);
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2, -dist);
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
      trajectories: [],
      animationId: 0,
    };

    let sampleStartAt = performance.now();
    let lastFrameAt = sampleStartAt;
    let frameCount = 0;
    let droppedFrames = 0;
    const frameBudgetMs =
      quality === "ultra" ? 21 : quality === "balanced" ? 26 : 31;
    const lowFpsThreshold =
      quality === "ultra" ? 45 : quality === "balanced" ? 36 : 28;

    // Animation loop
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
          source: "compare",
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

    // Handle resize
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
        pmremGenerator.dispose();
        controls.dispose();
        renderer.dispose();
        composer.dispose();
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [isMetric, onPerformanceSample, onRenderFailure, quality]);

  // Update trajectories when results change
  useEffect(() => {
    if (!sceneRef.current) return;

    const { scene, trajectories } = sceneRef.current;

    // Remove old trajectories
    trajectories.forEach((obj) => {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    sceneRef.current.trajectories = [];

    const addTrajectory = (
      result: BallFlightResult,
      color: number,
      label: string
    ) => {
      if (!result || result.trajectory.length === 0) return;

      // Coordinate Mapping: Z(Side) -> X, Y -> Y, X(Fwd) -> -Z
      const points = result.trajectory.map(
        (p) => new THREE.Vector3(p.z, p.y, -p.x)
      );

      // High-fidelity trajectory tube stack
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, 180, 0.42, 12, false);
      const tubeMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
      });
      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      
      const midGeometry = new THREE.TubeGeometry(curve, 180, 0.2, 12, false);
      const midMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const mid = new THREE.Mesh(midGeometry, midMaterial);

      const coreGeometry = new THREE.TubeGeometry(curve, 180, 0.08, 10, false);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);

      const group = new THREE.Group();
      group.add(tube);
      group.add(mid);
      group.add(core);

      const projectionGeo = new THREE.BufferGeometry().setFromPoints(
        points.map((pt) => new THREE.Vector3(pt.x, 0.09, pt.z))
      );
      const projectionLine = new THREE.Line(
        projectionGeo,
        new THREE.LineDashedMaterial({
          color,
          dashSize: 2.5,
          gapSize: 2,
          transparent: true,
          opacity: 0.6,
        })
      );
      projectionLine.computeLineDistances();
      group.add(projectionLine);
      scene.add(group);
      sceneRef.current!.trajectories.push(group);

      // Add landing marker
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        const markerGeometry = new THREE.RingGeometry(1, 3.2, 48);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(lastPoint.x, 0.1, lastPoint.z);
        scene.add(marker);
        sceneRef.current!.trajectories.push(marker);

        const verticalPin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 9, 12),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8,
          })
        );
        verticalPin.position.set(lastPoint.x, 4.6, lastPoint.z);
        scene.add(verticalPin);
        sceneRef.current!.trajectories.push(verticalPin);

        // Distance label at landing
        const distCanvas = document.createElement("canvas");
        distCanvas.width = 200;
        distCanvas.height = 100;
        const distCtx = distCanvas.getContext("2d")!;
        
        // Glow bg
        distCtx.shadowColor = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 1)`;
        distCtx.shadowBlur = 20;
        distCtx.fillStyle = `rgba(0, 0, 0, 0.8)`;
        distCtx.roundRect(10, 10, 180, 80, 10);
        distCtx.fill();
        distCtx.shadowBlur = 0;

        distCtx.fillStyle = "#ffffff";
        distCtx.font = "bold 36px Arial";
        distCtx.textAlign = "center";
        distCtx.textBaseline = "middle";
        distCtx.fillText(label, 100, 40);
        
        distCtx.font = "28px Arial";
        distCtx.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 1)`;
        distCtx.fillText(
          `${Math.round(result.carry)} ${isMetric ? "m" : "yd"}`,
          100,
          75
        );

        const distTexture = new THREE.CanvasTexture(distCanvas);
        const distMaterial = new THREE.SpriteMaterial({ map: distTexture, depthTest: false });
        const distSprite = new THREE.Sprite(distMaterial);
        distSprite.position.set(lastPoint.x, 15, lastPoint.z);
        distSprite.scale.set(20, 10, 1);
        distSprite.renderOrder = 999;
        scene.add(distSprite);
        sceneRef.current!.trajectories.push(distSprite);
      }
    };

    // Add current (blue) trajectory - Cyan/Blue neon
    if (currentResult) {
      addTrajectory(currentResult, 0x00ffff, t("legend.current"));
    }

    // Add target (green) trajectory - Orange/Gold neon (High contrast)
    if (targetResult) {
      addTrajectory(targetResult, 0xffaa00, t("legend.target"));
    }
  }, [currentResult, targetResult, t, isMetric]);

  if (renderError) {
    return (
      <div className="dual-trajectory-fallback">
        <h4>{t("fallback.title")}</h4>
        <p>{t("fallback.description")}</p>
      </div>
    );
  }

  return (
    <div className="dual-trajectory-container">
      <div ref={containerRef} className="dual-trajectory-canvas" />
      <div className="trajectory-legend">
        <div className="legend-item">
          <span className="legend-color current" style={{background: '#00ffff', boxShadow: '0 0 10px #00ffff'}} />
          <span>{t("legend.current")}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color target" style={{background: '#ffaa00', boxShadow: '0 0 10px #ffaa00'}} />
          <span>{t("legend.target")}</span>
        </div>
      </div>
    </div>
  );
}
