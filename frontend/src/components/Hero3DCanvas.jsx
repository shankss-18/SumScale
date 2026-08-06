import React, { useEffect, useRef } from 'react';

/**
 * Hero3DCanvas — Premium 3D Interactive Background
 * - Dual-layer system: deep aurora field + foreground neural constellation
 * - Flowing data streams connecting orbiting nodes
 * - Mouse parallax tilt + cursor repulsion field
 * - Self-contained, zero dependencies
 */
export default function Hero3DCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width  = canvas.parentElement?.clientWidth  || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Mouse state ────────────────────────────────────────────────
    let mx = 0, my = 0;
    let rotX = 0, rotY = 0;
    let tRotX = 0, tRotY = 0;
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      tRotY =  ((mx - canvas.width  / 2) / canvas.width)  * 1.4;
      tRotX = -((my - canvas.height / 2) / canvas.height) * 1.0;
    };
    window.addEventListener('mousemove', onMove);

    // ── Colour palette ─────────────────────────────────────────────
    const C = {
      deep:    '#006D77',
      mid:     '#83C5BE',
      light:   '#EDF6F9',
      accent:  '#52B788',
    };

    // ── Helper: project 3-D point to 2-D screen ────────────────────
    const FOV = 480;
    const project = (x, y, z, cx, cy) => {
      const s = FOV / (FOV + z + 350);
      return { sx: cx + x * s, sy: cy + y * s, scale: s };
    };

    // ═══════════════════════════════════════════════════════════════
    // LAYER 1: Deep aurora wave-field (large slow blobs)
    // ═══════════════════════════════════════════════════════════════
    const blobs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.28 + Math.random() * 0.22,
      dx: (Math.random() - 0.5) * 0.00025,
      dy: (Math.random() - 0.5) * 0.00015,
      hue: [186, 172, 155, 145, 195, 165][i],
    }));

    // ═══════════════════════════════════════════════════════════════
    // LAYER 2: 3-D Particle Sphere — Fibonacci lattice
    // ═══════════════════════════════════════════════════════════════
    const N = 90;
    const R = () => Math.min(canvas.width, canvas.height) * 0.34;
    const PHI = Math.PI * (3 - Math.sqrt(5));
    let pts = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const ry = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = PHI * i;
      pts.push({
        bx: Math.cos(theta) * ry,
        by: y,
        bz: Math.sin(theta) * ry,
        phase: Math.random() * Math.PI * 2,
        speed: 0.018 + Math.random() * 0.02,
        size:  1.4 + Math.random() * 1.6,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 3: Orbiting data-stream rings (3 rings)
    // ═══════════════════════════════════════════════════════════════
    const RINGS = [
      { axis: [1, 0.3, 0],  r: 0.62, speed: 0.006, particles: 22, phase: 0,           col: C.deep  },
      { axis: [0.2, 1, 0.5],r: 0.82, speed: -0.004, particles: 18, phase: Math.PI/3,  col: C.mid   },
      { axis: [0.5, 0.2, 1],r: 0.72, speed: 0.005,  particles: 16, phase: Math.PI*0.8,col: C.accent},
    ];
    const ringPts = RINGS.map(ring =>
      Array.from({ length: ring.particles }, (_, i) => ({
        angle: ring.phase + (i / ring.particles) * Math.PI * 2,
        size: 1.2 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      }))
    );

    // Normalise an axis vector
    const norm = ([x, y, z]) => {
      const m = Math.sqrt(x*x + y*y + z*z);
      return [x/m, y/m, z/m];
    };

    // Rotate point p around normalised axis n by angle θ (Rodrigues)
    const rodrigues = ([px, py, pz], [nx, ny, nz], theta) => {
      const cos = Math.cos(theta), sin = Math.sin(theta);
      const dot = px*nx + py*ny + pz*nz;
      return [
        px*cos + (ny*pz - nz*py)*sin + nx*dot*(1-cos),
        py*cos + (nz*px - nx*pz)*sin + ny*dot*(1-cos),
        pz*cos + (nx*py - ny*px)*sin + nz*dot*(1-cos),
      ];
    };

    // ── Y-axis rotation matrix ──────────────────────────────────────
    let globalAngleY = 0;
    let globalAngleX = 0;

    const rotateY = ([x, y, z], a) => [
      x * Math.cos(a) - z * Math.sin(a),
      y,
      z * Math.cos(a) + x * Math.sin(a),
    ];
    const rotateX = ([x, y, z], a) => [
      x,
      y * Math.cos(a) - z * Math.sin(a),
      z * Math.cos(a) + y * Math.sin(a),
    ];

    let t = 0;

    // ── Draw aurora layer ───────────────────────────────────────────
    const drawAurora = () => {
      const w = canvas.width, h = canvas.height;
      blobs.forEach(b => {
        b.x += b.dx; b.y += b.dy;
        if (b.x < 0 || b.x > 1) b.dx *= -1;
        if (b.y < 0 || b.y > 1) b.dy *= -1;

        const grd = ctx.createRadialGradient(
          b.x * w, b.y * h, 0,
          b.x * w, b.y * h, b.r * Math.max(w, h)
        );
        grd.addColorStop(0, `hsla(${b.hue},55%,52%,0.13)`);
        grd.addColorStop(0.5, `hsla(${b.hue},45%,60%,0.06)`);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      });
    };

    // ── Main render loop ────────────────────────────────────────────
    const render = () => {
      t += 0.012;
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const radius = R();

      ctx.clearRect(0, 0, w, h);

      // Smooth mouse tracking
      rotX += (tRotX - rotX) * 0.04;
      rotY += (tRotY - rotY) * 0.04;
      globalAngleY += 0.004 + rotY * 0.008;
      globalAngleX += 0.0008 + rotX * 0.005;

      // ── Aurora background ─────────────────────────────────────────
      drawAurora();

      // ── Rotating scan-line effect (horizontal aurora sweep) ────────
      const scanGrd = ctx.createLinearGradient(0, 0, 0, h);
      const scanY = ((Math.sin(t * 0.4) + 1) / 2) * h;
      scanGrd.addColorStop(Math.max(0, (scanY - 80) / h), 'transparent');
      scanGrd.addColorStop(scanY / h,  'rgba(131,197,190,0.05)');
      scanGrd.addColorStop(Math.min(1, (scanY + 80) / h), 'transparent');
      ctx.fillStyle = scanGrd;
      ctx.fillRect(0, 0, w, h);

      // ══════════════════════════════════════════════════════════════
      // Project sphere particles
      // ══════════════════════════════════════════════════════════════
      const projected = pts.map(p => {
        p.phase += p.speed * 0.18;
        let [x, y, z] = [p.bx * radius, p.by * radius, p.bz * radius];

        // Apply global rotation
        ;[x, y, z] = rotateY([x, y, z], globalAngleY);
        ;[x, y, z] = rotateX([x, y, z], globalAngleX);

        // Mouse repulsion
        const dx = x - (mx - cx), dy = y - (my - cy);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          const f = (100 - d) / 100;
          x += (dx / (d || 1)) * f * 18;
          y += (dy / (d || 1)) * f * 18;
        }

        const { sx, sy, scale } = project(x, y, z, cx, cy);
        return { sx, sy, z, scale, phase: p.phase, size: p.size * scale };
      });

      // ── Draw neural web lines (depth-attenuated) ──────────────────
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i], b = projected[j];
          const dx = a.sx - b.sx, dy = a.sy - b.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 70) continue;

          const alpha = (1 - dist / 70) * 0.18 * Math.min(a.scale, b.scale) * 1.8;
          ctx.strokeStyle = `rgba(0,109,119,${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }
      }

      // ── Draw sphere particles (depth sorted) ──────────────────────
      projected.sort((a, b) => a.z - b.z);
      projected.forEach(p => {
        const alpha = Math.max(0.08, (p.z / radius + 1) / 2);
        const pulse = p.size + Math.sin(p.phase) * 0.7;

        // Outer halo
        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, pulse * 4);
        g.addColorStop(0, `rgba(131,197,190,${alpha * 0.8})`);
        g.addColorStop(0.4, `rgba(0,109,119,${alpha * 0.3})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, pulse * 4, 0, Math.PI * 2);
        ctx.fill();

        // Solid core
        ctx.fillStyle = `rgba(0,109,119,${alpha * 0.95})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, pulse * 0.9, 0, Math.PI * 2);
        ctx.fill();
      });

      // ══════════════════════════════════════════════════════════════
      // Draw orbiting data-stream rings
      // ══════════════════════════════════════════════════════════════
      RINGS.forEach((ring, ri) => {
        const axis = norm(ring.axis);
        const perp1 = norm([-axis[1], axis[0], 0].map(v => v || 0.001));
        const perp2 = [
          axis[1] * perp1[2] - axis[2] * perp1[1],
          axis[2] * perp1[0] - axis[0] * perp1[2],
          axis[0] * perp1[1] - axis[1] * perp1[0],
        ];

        const rpts = ringPts[ri];
        rpts.forEach(rp => {
          rp.angle += ring.speed;
          rp.phase += 0.03;
        });

        const ringRadius = radius * ring.r;

        // Draw ring path as faded line
        const ringProj = rpts.map(rp => {
          let px = (Math.cos(rp.angle) * perp1[0] + Math.sin(rp.angle) * perp2[0]) * ringRadius;
          let py = (Math.cos(rp.angle) * perp1[1] + Math.sin(rp.angle) * perp2[1]) * ringRadius;
          let pz = (Math.cos(rp.angle) * perp1[2] + Math.sin(rp.angle) * perp2[2]) * ringRadius;

          ;[px, py, pz] = rotateY([px, py, pz], globalAngleY);
          ;[px, py, pz] = rotateX([px, py, pz], globalAngleX);

          const { sx, sy, scale } = project(px, py, pz, cx, cy);
          const depthAlpha = Math.max(0.05, (pz / radius + 1) / 2);
          return { sx, sy, scale, depthAlpha, pz, rp };
        });

        // Connect ring points as fading arcs
        for (let i = 0; i < ringProj.length; i++) {
          const a = ringProj[i];
          const b = ringProj[(i + 1) % ringProj.length];
          const alpha = 0.12 * a.depthAlpha;
          const hex = ring.col;
          ctx.strokeStyle = alpha > 0.01
            ? `rgba(${ri === 0 ? '0,109,119' : ri === 1 ? '131,197,190' : '82,183,136'},${alpha})`
            : 'transparent';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }

        // Ring node glows
        ringProj.forEach(({ sx, sy, scale, depthAlpha, rp }) => {
          const pulse = rp.size * scale + Math.sin(rp.phase) * 0.5 * scale;
          const alpha = depthAlpha * 0.85;
          const rgb = ri === 0 ? '0,109,119' : ri === 1 ? '131,197,190' : '82,183,136';

          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, pulse * 3.5);
          g.addColorStop(0,   `rgba(${rgb},${alpha})`);
          g.addColorStop(0.5, `rgba(${rgb},${alpha * 0.3})`);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, pulse * 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(${rgb},${alpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // ── Vignette to blend into page bg ───────────────────────────
      const vigGrd = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.6);
      vigGrd.addColorStop(0, 'transparent');
      vigGrd.addColorStop(1, 'rgba(237,246,249,0.55)');
      ctx.fillStyle = vigGrd;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
    />
  );
}
