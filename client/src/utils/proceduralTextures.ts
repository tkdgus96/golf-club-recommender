
import * as THREE from 'three';

/**
 * Generates a set of realistic grass textures (Albedo, Normal, Roughness)
 * using procedural canvas drawing.
 * @param size Texture resolution (default 1024)
 */
export function createRealisticGrassTextures(size = 1024) {
  const canvasAlbedo = document.createElement('canvas');
  const canvasNormal = document.createElement('canvas');
  const canvasRoughness = document.createElement('canvas');

  [canvasAlbedo, canvasNormal, canvasRoughness].forEach(c => {
    c.width = size;
    c.height = size;
  });

  const ctxAlbedo = canvasAlbedo.getContext('2d')!;
  const ctxNormal = canvasNormal.getContext('2d')!;
  const ctxRoughness = canvasRoughness.getContext('2d')!;

  // 1. Base Fill
  // Albedo: Dark earthy green base
  ctxAlbedo.fillStyle = '#0a2a0a'; 
  ctxAlbedo.fillRect(0, 0, size, size);

  // Normal: Flat blue (0, 0, 1) -> (128, 128, 255)
  ctxNormal.fillStyle = 'rgb(128, 128, 255)';
  ctxNormal.fillRect(0, 0, size, size);

  // Roughness: Base roughness (0.8 - fairly rough ground)
  ctxRoughness.fillStyle = '#cccccc'; 
  ctxRoughness.fillRect(0, 0, size, size);

  // 2. Draw 100,000+ Grass Blades
  const bladeCount = 150000;
  
  for (let i = 0; i < bladeCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    // Length and angle
    const length = 15 + Math.random() * 20;
    const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8 - Math.PI / 2; // Mostly pointing up (-90deg) +/- variation
    
    const tipX = x + Math.cos(angle) * length * 0.2; // Slight tilt
    const tipY = y + Math.sin(angle) * length;

    // --- Albedo Blade ---
    // Varying shades of green/yellow/brown
    const r = 20 + Math.random() * 30;
    const g = 60 + Math.random() * 100;
    const b = 10 + Math.random() * 30;
    ctxAlbedo.strokeStyle = `rgb(${r},${g},${b})`;
    ctxAlbedo.lineWidth = 1 + Math.random() * 2;
    ctxAlbedo.globalAlpha = 0.8;
    ctxAlbedo.beginPath();
    ctxAlbedo.moveTo(x, y);
    ctxAlbedo.lineTo(tipX, tipY);
    ctxAlbedo.stroke();

    // --- Normal Blade ---
    // Calculate normal color based on tilt
    // Tilt Left = Red < 128, Tilt Right = Red > 128
    // Tilt Up = Green > 128
    const tiltX = (tipX - x) / length; // -1 to 1
    const nR = 128 + tiltX * 127; 
    const nG = 128 + Math.random() * 127; // Pointing somewhat "up" in texture space
    const nB = 200; // Z-component
    
    ctxNormal.strokeStyle = `rgb(${nR},${nG},${nB})`;
    ctxNormal.lineWidth = ctxAlbedo.lineWidth;
    ctxNormal.globalAlpha = 1.0;
    ctxNormal.beginPath();
    ctxNormal.moveTo(x, y);
    ctxNormal.lineTo(tipX, tipY);
    ctxNormal.stroke();

    // --- Roughness Blade ---
    // Tips are glossier (darker), base is rougher (lighter)
    const grad = ctxRoughness.createLinearGradient(x, y, tipX, tipY);
    grad.addColorStop(0, '#bbbbbb'); // Base rough
    grad.addColorStop(1, '#666666'); // Tip glossy (waxy cuticle)
    
    ctxRoughness.strokeStyle = grad;
    ctxRoughness.lineWidth = ctxAlbedo.lineWidth;
    ctxRoughness.beginPath();
    ctxRoughness.moveTo(x, y);
    ctxRoughness.lineTo(tipX, tipY);
    ctxRoughness.stroke();
  }

  // Create Textures
  const texAlbedo = new THREE.CanvasTexture(canvasAlbedo);
  const texNormal = new THREE.CanvasTexture(canvasNormal);
  const texRoughness = new THREE.CanvasTexture(canvasRoughness);

  [texAlbedo, texNormal, texRoughness].forEach(t => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    // Anisotropy helps with distant tiling look
    t.anisotropy = 4;
    t.colorSpace = THREE.NoColorSpace; // Maps are linear data
  });
  
  texAlbedo.colorSpace = THREE.SRGBColorSpace; // Albedo is color

  return { albedo: texAlbedo, normal: texNormal, roughness: texRoughness };
}
