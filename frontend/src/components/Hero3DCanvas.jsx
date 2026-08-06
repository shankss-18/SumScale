import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Hero3DCanvas — Real Three.js WebGL Interactive 3D Canvas
 * Renders an interactive 3D particle sphere, wireframe lattice, 
 * orbiting 3D rings, and responsive mouse-tracking rotation.
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
    camera.position.z = 7.5;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── 2. Lights ────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x83c5be, 3, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x006d77, 4, 50);
    pointLight2.position.set(-5, -5, -2);
    scene.add(pointLight2);

    // ── 3. 3D Objects Group ──────────────────────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Core 3D Sphere Points (Fiber/Data Lattice)
    const sphereGeo = new THREE.IcosahedronGeometry(2.1, 4);
    const posAttribute = sphereGeo.attributes.position;
    const particleCount = posAttribute.count;

    const pointsMat = new THREE.PointsMaterial({
      color: 0x006d77,
      size: 0.05,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const pointsMesh = new THREE.Points(sphereGeo, pointsMat);
    mainGroup.add(pointsMesh);

    // Inner Wireframe Mesh
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x83c5be,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const wireMesh = new THREE.Mesh(sphereGeo, wireMat);
    mainGroup.add(wireMesh);

    // Outer Orbiting 3D Ring 1
    const ringGeo1 = new THREE.TorusGeometry(3.0, 0.015, 16, 100);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x006d77,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x006d77,
      emissiveIntensity: 0.4,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    mainGroup.add(ring1);

    // Outer Orbiting 3D Ring 2
    const ringGeo2 = new THREE.TorusGeometry(3.6, 0.012, 16, 100);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0x83c5be,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x83c5be,
      emissiveIntensity: 0.5,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 4;
    mainGroup.add(ring2);

    // Floating 3D Background Particles Field
    const bgParticlesCount = 350;
    const bgGeo = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgParticlesCount * 3);

    for (let i = 0; i < bgParticlesCount * 3; i += 3) {
      bgPositions[i] = (Math.random() - 0.5) * 16;
      bgPositions[i + 1] = (Math.random() - 0.5) * 16;
      bgPositions[i + 2] = (Math.random() - 0.5) * 16;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));

    const bgMat = new THREE.PointsMaterial({
      color: 0x006d77,
      size: 0.035,
      transparent: true,
      opacity: 0.4,
    });
    const bgPoints = new THREE.Points(bgGeo, bgMat);
    scene.add(bgPoints);

    // ── 4. Interactive Mouse Control ─────────────────────────────────
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

      // Continuous 3D Rotations
      mainGroup.rotation.y = elapsedTime * 0.3;
      mainGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.15;

      ring1.rotation.z = elapsedTime * 0.45;
      ring2.rotation.z = -elapsedTime * 0.35;

      bgPoints.rotation.y = elapsedTime * 0.06;

      // Fast Responsive Mouse Parallax Lerp
      targetRotationY += (mouseX - targetRotationY) * 0.25;
      targetRotationX += (mouseY - targetRotationX) * 0.25;

      mainGroup.rotation.y += targetRotationY;
      mainGroup.rotation.x += targetRotationX;

      // Subtle breathing pulse on points size / position
      const positions = sphereGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        // Vertex animation effect
      }

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
      sphereGeo.dispose();
      pointsMat.dispose();
      wireMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
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
