import React, { useEffect, useRef } from 'react';

export default function Hero3DCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight || 550);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 550;
    };

    window.addEventListener('resize', handleResize);

    // 3D Particle Cloud settings
    const PARTICLE_COUNT = Math.min(100, Math.floor(width / 10));
    const particles = [];
    const radius = Math.min(width, height) * 0.38;

    // Mouse tracking for 3D tilt
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let rotationX = 0;
    let rotationY = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      mouseX = x;
      mouseY = y;
      targetRotationY = (x / width) * 1.2;
      targetRotationX = -(y / height) * 1.2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Generate 3D sphere particles (Fibonacci lattice)
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio angle
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // Radius at y
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      particles.push({
        baseX: x * radius,
        baseY: y * radius,
        baseZ: z * radius,
        x: x * radius,
        y: y * radius,
        z: z * radius,
        size: Math.random() * 2 + 1.5,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let angleY = 0;
    let angleX = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      rotationX += (targetRotationX - rotationX) * 0.05;
      rotationY += (targetRotationY - rotationY) * 0.05;

      angleY += 0.003 + rotationY * 0.01;
      angleX += 0.001 + rotationX * 0.01;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const fov = 400; // 3D Perspective field of view
      const centerX = width / 2;
      const centerY = height / 2;

      const projectedParticles = [];

      // Rotate and project 3D points to 2D screen coordinates
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.pulse += 0.03;

        // 3D Y Rotation
        let x1 = p.baseX * cosY - p.baseZ * sinY;
        let z1 = p.baseZ * cosY + p.baseX * sinY;

        // 3D X Rotation
        let y1 = p.baseY * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.baseY * sinX;

        // Interactive mouse magnetic push
        const dx = x1 - mouseX;
        const dy = y1 - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          x1 += (dx / (dist || 1)) * force * 15;
          y1 += (dy / (dist || 1)) * force * 15;
        }

        // Perspective scale
        const scale = fov / (fov + z2 + 300);
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y1 * scale;

        projectedParticles.push({
          x: screenX,
          y: screenY,
          z: z2,
          scale,
          pulse: p.pulse,
          size: p.size * scale,
        });
      }

      // Draw interconnecting 3D neural network lines
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projectedParticles.length; i++) {
        const p1 = projectedParticles[i];
        for (let j = i + 1; j < projectedParticles.length; j++) {
          const p2 = projectedParticles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Connect if close on 2D screen and similar 3D depth
          if (distance < 90) {
            const alpha = (1 - distance / 90) * 0.25 * Math.min(p1.scale, p2.scale);
            ctx.strokeStyle = `rgba(0, 109, 119, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Sort particles by Z for proper depth rendering
      projectedParticles.sort((a, b) => b.z - a.z);

      // Render 3D glowing nodes
      for (let i = 0; i < projectedParticles.length; i++) {
        const p = projectedParticles[i];
        const alpha = Math.max(0.1, Math.min(0.95, (p.z + radius) / (radius * 2)));
        const pulsedSize = p.size + Math.sin(p.pulse) * 0.6;

        // Outer glow
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, pulsedSize * 3
        );
        gradient.addColorStop(0, `rgba(131, 197, 190, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(0, 109, 119, ${alpha * 0.4})`);
        gradient.addColorStop(1, 'rgba(0, 109, 119, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulsedSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid core node
        ctx.fillStyle = `rgba(0, 109, 119, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulsedSize, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto opacity-70 transition-opacity duration-700"
      style={{ zIndex: 0 }}
    />
  );
}
