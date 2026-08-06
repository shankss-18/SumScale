import React, { useEffect, useRef } from 'react';

/**
 * Hero3DCanvas — Premium 3D Interactive Background
 * Fixed: uses window dimensions + ResizeObserver for reliable sizing
 * Features: Aurora field, Fibonacci sphere, 3 orbiting data rings, mouse parallax
 */
export default function Hero3DCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    // ── Reliable sizing: always use canvas's bounding rect ─────────
    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  || window.innerWidth;
      canvas.height = rect.height || window.innerHeight;
    };
    setSize();

    // ResizeObserver keeps canvas in sync as section reflows
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);

    // ── Mouse tracking ──────────────────────────────────────────────
    let mx = canvas.width / 2;
    let my = canvas.height / 2;
    let tRotX = 0, tRotY = 0;
    let rotX  = 0, rotY  = 0;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      tRotY =  ((e.clientX - canvas.width  / 2) / canvas.width)  * 1.6;
      tRotX = -((e.clientY - canvas.height / 2) / canvas.height) * 1.0;
    };
    window.addEventListener('mousemove', onMove);

    // ── Helpers ─────────────────────────────────────────────────────
    const FOV = 500;
    const proj = (x, y, z, cx, cy) => {
      const s = FOV / (FOV + z + 400);
      return { sx: cx + x * s, sy: cy + y * s, s };
    };

    const rotY3 = ([x, y, z], a) => [
      x * Math.cos(a) - z * Math.sin(a), y,
      z * Math.cos(a) + x * Math.sin(a),
    ];
    const rotX3 = ([x, y, z], a) => [
      x, y * Math.cos(a) - z * Math.sin(a),
      z * Math.cos(a) + y * Math.sin(a),
    ];
    const norm3 = ([x, y, z]) => {
      const m = Math.sqrt(x*x+y*y+z*z) || 1;
      return [x/m, y/m, z/m];
    };

    // ── LAYER 1: Aurora blobs ───────────────────────────────────────
    const blobs = Array.from({ length: 7 }, (_, i) => ({
      x:   Math.random(),
      y:   Math.random(),
      r:   0.30 + Math.random() * 0.25,
      dx:  (Math.random() - 0.5) * 0.0003,
      dy:  (Math.random() - 0.5) * 0.0002,
      hue: [186, 172, 160, 150, 195, 175, 165][i],
      sat: 40 + Math.random() * 20,
    }));

    // ── LAYER 2: Fibonacci sphere ───────────────────────────────────
    const N = 110;
    const PHI = Math.PI * (3 - Math.sqrt(5));
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const ry = Math.sqrt(Math.max(0, 1 - y * y));
      const t  = PHI * i;
      return {
        bx: Math.cos(t) * ry,
        by: y,
        bz: Math.sin(t) * ry,
        phase: Math.random() * Math.PI * 2,
        size:  1.8 + Math.random() * 2.0,
      };
    });

    // ── LAYER 3: Three orbiting rings ──────────────────────────────
    const RINGS = [
      { ax: [1, 0.4, 0.1], rFrac: 0.58, spd:  0.007,  n: 24, col: [0,  109, 119] },
      { ax: [0.3, 1, 0.6], rFrac: 0.80, spd: -0.005,  n: 20, col: [131,197, 190] },
      { ax: [0.6, 0.2, 1], rFrac: 0.70, spd:  0.006,  n: 18, col: [82, 183, 136] },
    ];
    const ringData = RINGS.map((ring) => {
      const axis = norm3(ring.ax);
      // perpendicular basis vectors for the ring plane
      const t = Math.abs(axis[0]) < 0.9 ? [1,0,0] : [0,1,0];
      const p1 = norm3([
        axis[1]*t[2] - axis[2]*t[1],
        axis[2]*t[0] - axis[0]*t[2],
        axis[0]*t[1] - axis[1]*t[0],
      ]);
      const p2 = [
        axis[1]*p1[2] - axis[2]*p1[1],
        axis[2]*p1[0] - axis[0]*p1[2],
        axis[0]*p1[1] - axis[1]*p1[0],
      ];
      return {
        ...ring, axis, p1, p2,
        angles: Array.from({ length: ring.n }, (_, i) => ({
          a:     (i / ring.n) * Math.PI * 2 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          sz:    1.4 + Math.random() * 2.0,
        })),
      };
    });

    // ── Globals ─────────────────────────────────────────────────────
    let gY = 0, gX = 0;
    let t  = 0;

    // ── Render loop ─────────────────────────────────────────────────
    const render = () => {
      t += 0.014;
      const W = canvas.width, H = canvas.height;
      if (W === 0 || H === 0) { raf = requestAnimationFrame(render); return; }

      const cx = W / 2, cy = H / 2;
      const SPHERE_R = Math.min(W, H) * 0.36;

      ctx.clearRect(0, 0, W, H);

      // Smooth rotation toward mouse
      rotX += (tRotX - rotX) * 0.045;
      rotY += (tRotY - rotY) * 0.045;
      gY   += 0.004 + rotY * 0.01;
      gX   += 0.0008 + rotX * 0.006;

      const cosGY = Math.cos(gY), sinGY = Math.sin(gY);
      const cosGX = Math.cos(gX), sinGX = Math.sin(gX);

      // ── Aurora ──────────────────────────────────────────────────
      blobs.forEach(b => {
        b.x += b.dx; b.y += b.dy;
        if (b.x < 0 || b.x > 1) b.dx *= -1;
        if (b.y < 0 || b.y > 1) b.dy *= -1;
        const g = ctx.createRadialGradient(
          b.x*W, b.y*H, 0,
          b.x*W, b.y*H, b.r * Math.max(W,H)
        );
        g.addColorStop(0,   `hsla(${b.hue},${b.sat}%,56%,0.16)`);
        g.addColorStop(0.5, `hsla(${b.hue},${b.sat}%,60%,0.07)`);
        g.addColorStop(1,   'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });

      // ── Scanline sweep ──────────────────────────────────────────
      const sy = ((Math.sin(t * 0.35) + 1) / 2) * H;
      const sg = ctx.createLinearGradient(0, sy - 100, 0, sy + 100);
      sg.addColorStop(0,   'transparent');
      sg.addColorStop(0.5, 'rgba(131,197,190,0.06)');
      sg.addColorStop(1,   'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);

      // ── Project sphere ──────────────────────────────────────────
      const projected = pts.map(p => {
        p.phase += 0.025;

        let [x, y, z] = [p.bx * SPHERE_R, p.by * SPHERE_R, p.bz * SPHERE_R];
        // Y rotation
        const nx = x * cosGY - z * sinGY;
        const nz = z * cosGY + x * sinGY;
        // X rotation
        const ny = y * cosGX - nz * sinGX;
        const nz2 = nz * cosGX + y * sinGX;

        // Mouse repulsion (screen-space)
        const { sx: px0, sy: py0 } = proj(nx, ny, nz2, cx, cy);
        const ddx = px0 - mx, ddy = py0 - my;
        const dd = Math.sqrt(ddx*ddx + ddy*ddy);
        let fx = nx, fy = ny;
        if (dd < 130) {
          const f = (130 - dd) / 130;
          fx += (ddx / (dd || 1)) * f * 22;
          fy += (ddy / (dd || 1)) * f * 22;
        }

        const { sx, sy: sy2, s } = proj(fx, fy, nz2, cx, cy);
        const depth = (nz2 / SPHERE_R + 1) / 2;
        return { sx, sy: sy2, z: nz2, s, depth, phase: p.phase, size: p.size * s };
      });

      // Neural web lines
      ctx.lineWidth = 0.7;
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          const dx = a.sx - b.sx, dy = a.sy - b.sy;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 80) continue;
          const alpha = (1 - dist / 80) * 0.22 * Math.min(a.s, b.s) * 2;
          if (alpha < 0.01) continue;
          ctx.strokeStyle = `rgba(0,109,119,${alpha.toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
        }
      }

      // Sphere nodes (depth sorted — back to front)
      projected.sort((a, b) => a.z - b.z);
      projected.forEach(p => {
        if (p.depth < 0.05) return;
        const pulse = p.size + Math.sin(p.phase) * 0.9;
        const alpha = Math.max(0.1, p.depth * 0.95);

        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, pulse * 4.5);
        g.addColorStop(0,   `rgba(131,197,190,${(alpha * 0.85).toFixed(3)})`);
        g.addColorStop(0.45,`rgba(0,109,119,${(alpha * 0.35).toFixed(3)})`);
        g.addColorStop(1,   'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, pulse * 4.5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(0,109,119,${(alpha * 0.92).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, pulse, 0, Math.PI * 2); ctx.fill();
      });

      // ── Orbiting rings ──────────────────────────────────────────
      ringData.forEach(ring => {
        ring.angles.forEach(rp => { rp.a += ring.spd; rp.phase += 0.03; });

        const RR = SPHERE_R * ring.rFrac;
        const rProj = ring.angles.map(rp => {
          // Point on ring in ring-local frame
          let x = (Math.cos(rp.a) * ring.p1[0] + Math.sin(rp.a) * ring.p2[0]) * RR;
          let y = (Math.cos(rp.a) * ring.p1[1] + Math.sin(rp.a) * ring.p2[1]) * RR;
          let z = (Math.cos(rp.a) * ring.p1[2] + Math.sin(rp.a) * ring.p2[2]) * RR;
          // Apply global rotation
          const nx2 = x * cosGY - z * sinGY, nz3 = z * cosGY + x * sinGY;
          const ny2  = y * cosGX - nz3 * sinGX, nz4 = nz3 * cosGX + y * sinGX;
          const { sx, sy, s } = proj(nx2, ny2, nz4, cx, cy);
          const depth = Math.max(0, (nz4 / SPHERE_R + 1) / 2);
          return { sx, sy, s, depth, phase: rp.phase, sz: rp.sz * s };
        });

        // Ring arcs
        for (let i = 0; i < rProj.length; i++) {
          const a2 = rProj[i], b2 = rProj[(i + 1) % rProj.length];
          const alpha = 0.13 * Math.min(a2.depth, b2.depth);
          if (alpha < 0.01) continue;
          ctx.strokeStyle = `rgba(${ring.col.join(',')},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath(); ctx.moveTo(a2.sx, a2.sy); ctx.lineTo(b2.sx, b2.sy); ctx.stroke();
        }

        // Ring nodes
        rProj.forEach(rp => {
          if (rp.depth < 0.05) return;
          const pulse = rp.sz + Math.sin(rp.phase) * 0.7;
          const alpha = rp.depth * 0.9;
          const g = ctx.createRadialGradient(rp.sx, rp.sy, 0, rp.sx, rp.sy, pulse * 4);
          g.addColorStop(0,   `rgba(${ring.col.join(',')},${(alpha * 0.9).toFixed(3)})`);
          g.addColorStop(0.5, `rgba(${ring.col.join(',')},${(alpha * 0.3).toFixed(3)})`);
          g.addColorStop(1,   'transparent');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(rp.sx, rp.sy, pulse * 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(${ring.col.join(',')},${(alpha * 0.95).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(rp.sx, rp.sy, pulse, 0, Math.PI * 2); ctx.fill();
        });
      });

      // Edge vignette — blends canvas into page
      const vg = ctx.createRadialGradient(cx, cy, SPHERE_R * 0.55, cx, cy, SPHERE_R * 1.7);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(237,246,249,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 0,
        pointerEvents: 'auto',
      }}
    />
  );
}
