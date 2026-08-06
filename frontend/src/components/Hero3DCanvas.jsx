import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Hero3DCanvas — Three.js WebGL Interactive 3D Cosmic Star Core
 * Replaces plain circles with a 3D Star Crystal Gem Core, 
 * 8-Point Star Lattice, Sparkling Star Belts, and smooth mouse interaction.
 */
export default function Hero3DCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── 1. Scene, Camera & Renderer Setup ────────────────────────────
    const scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7.2;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── 2. Lights ────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x83c5be, 4, 50);
    pointLight1.position.set(6, 6, 6);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x006d77, 5, 50);
    pointLight2.position.set(-6, -6, 2);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xffffff, 3, 30);
    pointLight3.position.set(0, 0, 8);
    scene.add(pointLight3);

    // ── 3. Main 3D Star Group ─────────────────────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // A. 3D Star Crystal Gem Core (Octahedron / Diamond Shape)
    const starCoreGeo = new THREE.OctahedronGeometry(1.7, 0);
    const starCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x006d77,
      emissive: 0x004d56,
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      wireframe: false,
    });
    const starCoreMesh = new THREE.Mesh(starCoreGeo, starCoreMat);
    mainGroup.add(starCoreMesh);

    // B. Inner Glowing Wireframe Star Cage
    const starCageGeo = new THREE.IcosahedronGeometry(2.3, 1);
    const starCageMat = new THREE.MeshBasicMaterial({
      color: 0x83c5be,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const starCageMesh = new THREE.Mesh(starCageGeo, starCageMat);
    mainGroup.add(starCageMesh);

    // C. 3D Star Spikes / Rays (8-Point Diamond Beams)
    const starSpikeGroup = new THREE.Group();
    const spikeGeo = new THREE.ConeGeometry(0.18, 3.8, 4);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x83c5be,
      emissive: 0x006d77,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });

    // Create 6 Spikes pointing along X, Y, Z directions forming a 3D Starburst
    const directions = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ];

    directions.forEach(([x, y, z]) => {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      const dirVector = new THREE.Vector3(x, y, z);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVector);
      starSpikeGroup.add(spike);
    });

    mainGroup.add(starSpikeGroup);

    // D. Outer Orbiting Star Particle Rings (Twinkling Starlight Diamonds)
    const starRingCount = 180;
    const starRingGeo = new THREE.BufferGeometry();
    const starRingPositions = new Float32Array(starRingCount * 3);

    for (let i = 0; i < starRingCount; i++) {
      const angle = (i / starRingCount) * Math.PI * 2;
      const radius = 3.2 + Math.sin(i * 0.5) * 0.3;
      starRingPositions[i * 3] = Math.cos(angle) * radius;
      starRingPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      starRingPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    starRingGeo.setAttribute('position', new THREE.BufferAttribute(starRingPositions, 3));

    const starRingMat = new THREE.PointsMaterial({
      color: 0x83c5be,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const starRingMesh = new THREE.Points(starRingGeo, starRingMat);
    starRingMesh.rotation.x = Math.PI / 4;
    mainGroup.add(starRingMesh);

    // E. Secondary Tilted Star Ring
    const starRingMesh2 = new THREE.Points(starRingGeo, starRingMat);
    starRingMesh2.rotation.x = -Math.PI / 3;
    starRingMesh2.rotation.y = Math.PI / 6;
    mainGroup.add(starRingMesh2);

    // F. Background Sparkling Starlight Particles Field
    const bgParticlesCount = 450;
    const bgGeo = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgParticlesCount * 3);

    for (let i = 0; i < bgParticlesCount * 3; i += 3) {
      bgPositions[i] = (Math.random() - 0.5) * 18;
      bgPositions[i + 1] = (Math.random() - 0.5) * 18;
      bgPositions[i + 2] = (Math.random() - 0.5) * 18;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));

    const bgMat = new THREE.PointsMaterial({
      color: 0x006d77,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
    });
    const bgPoints = new THREE.Points(bgGeo, bgMat);
    scene.add(bgPoints);

    // ── 4. Fast Interactive Mouse Control ─────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.0035;
      mouseY = (event.clientY - windowHalfY) * 0.0035;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // ── 5. Resize Listener ───────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // ── 6. Animation Loop ────────────────────────────────────────────
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Continuous 3D Rotations of Star Core & Rays
      starCoreMesh.rotation.y = elapsedTime * 0.4;
      starCoreMesh.rotation.x = elapsedTime * 0.2;

      starCageMesh.rotation.y = -elapsedTime * 0.25;

      starSpikeGroup.rotation.y = elapsedTime * 0.3;
      starSpikeGroup.rotation.z = Math.sin(elapsedTime * 0.5) * 0.2;

      starRingMesh.rotation.z = elapsedTime * 0.35;
      starRingMesh2.rotation.z = -elapsedTime * 0.3;

      bgPoints.rotation.y = elapsedTime * 0.05;

      // Fast Responsive Mouse Parallax Lerp
      targetRotationY += (mouseX - targetRotationY) * 0.25;
      targetRotationX += (mouseY - targetRotationX) * 0.25;

      mainGroup.rotation.y += targetRotationY;
      mainGroup.rotation.x += targetRotationX;

      // Pulse Star Scale subtly
      const scalePulse = 1 + Math.sin(elapsedTime * 2) * 0.04;
      starSpikeGroup.scale.set(scalePulse, scalePulse, scalePulse);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // ── 7. Clean up ──────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Dispose WebGL Geometries and Materials
      starCoreGeo.dispose();
      starCoreMat.dispose();
      starCageGeo.dispose();
      starCageMat.dispose();
      spikeGeo.dispose();
      spikeMat.dispose();
      starRingGeo.dispose();
      starRingMat.dispose();
      bgGeo.dispose();
      bgMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
}
