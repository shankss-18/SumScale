import React, { useEffect, useRef } from 'react';

/**
 * Hero3DCanvas — Continuously animated 3D scene.
 *
 * Fixes:
 *  - Canvas sized once at mount via window dimensions (no ResizeObserver clearing)
 *  - Debounced window resize so canvas.width is only reset when truly needed
 *  - Render loop never interrupted
 */
export default function Hero3DCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let raf;
    let W = 0, H = 0;

    // ── Size canvas from its own layout rect (one-shot + resize) ────
    const applySize = () => {
      const r = canvas.getBoundingClientRect();
      const nW = Math.round(r.width)  || window.innerWidth;
      const nH = Math.round(r.height) || Math.round(window.innerHeight * 0.92);
      if (nW === W && nH === H) return;   // nothing changed, skip clear
      W = nW; H = nH;
      canvas.width  = W;
      canvas.height = H;
    };

    applySize();

    // Debounced resize — only fires after user stops resizing for 120ms
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applySize, 120);
    };
    window.addEventListener('resize', onResize);

    // ── Mouse ────────────────────────────────────────────────────────
    let mx = W / 2, my = H / 2;
    let tRotX = 0, tRotY = 0;
    let rotX  = 0, rotY  = 0;

    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      tRotY =  ((e.clientX - W / 2) / W) * 1.6;
      tRotX = -((e.clientY - H / 2) / H) * 1.0;
    };
    window.addEventListener('mousemove', onMove);

    // ── 3-D helpers ──────────────────────────────────────────────────
    const proj = (x, y, z) => {
      const fov = 520;
      const s = fov / (fov + z + 380);
      return { px: W/2 + x*s, py: H/2 + y*s, s };
    };
    const ry3 = ([x,y,z], a) => [ x*Math.cos(a)-z*Math.sin(a), y,  z*Math.cos(a)+x*Math.sin(a) ];
    const rx3 = ([x,y,z], a) => [ x, y*Math.cos(a)-z*Math.sin(a),  z*Math.cos(a)+y*Math.sin(a) ];
    const nm3 = ([x,y,z])    => { const m=Math.sqrt(x*x+y*y+z*z)||1; return [x/m,y/m,z/m]; };

    // ── Layer 1: aurora blobs ────────────────────────────────────────
    const blobs = Array.from({length:8},(_,i)=>({
      x: Math.random(), y: Math.random(),
      r: 0.28+Math.random()*0.28,
      dx:(Math.random()-0.5)*0.00028,
      dy:(Math.random()-0.5)*0.00018,
      hue:[186,172,160,150,195,175,165,180][i],
      sat:38+Math.random()*22,
    }));

    // ── Layer 2: Fibonacci sphere ────────────────────────────────────
    const N   = 120;
    const PHI = Math.PI*(3-Math.sqrt(5));
    const pts = Array.from({length:N},(_,i)=>{
      const y  = 1-(i/(N-1))*2;
      const ry = Math.sqrt(Math.max(0,1-y*y));
      const th = PHI*i;
      return { bx:Math.cos(th)*ry, by:y, bz:Math.sin(th)*ry,
               phase:Math.random()*Math.PI*2, sz:1.8+Math.random()*2.0 };
    });

    // ── Layer 3: orbiting rings ──────────────────────────────────────
    const mkRing = (axRaw, rFrac, spd, n, col) => {
      const ax = nm3(axRaw);
      const tmp= Math.abs(ax[0])<0.9?[1,0,0]:[0,1,0];
      const p1 = nm3([ax[1]*tmp[2]-ax[2]*tmp[1], ax[2]*tmp[0]-ax[0]*tmp[2], ax[0]*tmp[1]-ax[1]*tmp[0]]);
      const p2 = [ ax[1]*p1[2]-ax[2]*p1[1], ax[2]*p1[0]-ax[0]*p1[2], ax[0]*p1[1]-ax[1]*p1[0] ];
      const nodes = Array.from({length:n},(_,i)=>({
        a: (i/n)*Math.PI*2+Math.random()*0.4,
        phase:Math.random()*Math.PI*2, sz:1.4+Math.random()*2.0,
      }));
      return {ax,p1,p2,rFrac,spd,col,nodes};
    };
    const rings = [
      mkRing([1,0.4,0.1], 0.58,  0.007, 26, [0,109,119]  ),
      mkRing([0.3,1,0.6], 0.80, -0.005, 22, [131,197,190]),
      mkRing([0.6,0.2,1], 0.70,  0.006, 20, [82,183,136] ),
    ];

    // ── Globals ──────────────────────────────────────────────────────
    let gY=0, gX=0, t=0;

    // ── Main loop ────────────────────────────────────────────────────
    const tick = () => {
      // Must re-read W/H each frame in case resize fired
      const cW = canvas.width, cH = canvas.height;
      if (!cW || !cH) { raf = requestAnimationFrame(tick); return; }

      t += 0.014;
      ctx.clearRect(0,0,cW,cH);

      rotX += (tRotX-rotX)*0.046;
      rotY += (tRotY-rotY)*0.046;
      gY   += 0.0045 + rotY*0.010;
      gX   += 0.0009 + rotX*0.006;

      const cosY=Math.cos(gY), sinY=Math.sin(gY);
      const cosX=Math.cos(gX), sinX=Math.sin(gX);

      // aurora
      blobs.forEach(b=>{
        b.x+=b.dx; b.y+=b.dy;
        if(b.x<0||b.x>1)b.dx*=-1;
        if(b.y<0||b.y>1)b.dy*=-1;
        const g=ctx.createRadialGradient(b.x*cW,b.y*cH,0,b.x*cW,b.y*cH,b.r*Math.max(cW,cH));
        g.addColorStop(0,  `hsla(${b.hue},${b.sat}%,56%,0.17)`);
        g.addColorStop(0.5,`hsla(${b.hue},${b.sat}%,60%,0.08)`);
        g.addColorStop(1,  'transparent');
        ctx.fillStyle=g; ctx.fillRect(0,0,cW,cH);
      });

      // scanline
      const sy=((Math.sin(t*0.35)+1)/2)*cH;
      const sg=ctx.createLinearGradient(0,sy-90,0,sy+90);
      sg.addColorStop(0,'transparent'); sg.addColorStop(0.5,'rgba(131,197,190,0.07)'); sg.addColorStop(1,'transparent');
      ctx.fillStyle=sg; ctx.fillRect(0,0,cW,cH);

      const SR = Math.min(cW,cH)*0.37;
      const CX=cW/2, CY=cH/2;

      // project sphere
      const proj3 = ([x,y,z]) => {
        const [x2,y2,z2] = rx3(ry3([x,y,z],gY),gX);
        const fov=520, s=fov/(fov+z2+380);
        return { px:CX+x2*s, py:CY+y2*s, s, z:z2 };
      };

      const nodes = pts.map(p=>{
        p.phase+=0.024;
        let [x,y,z]=[p.bx*SR,p.by*SR,p.bz*SR];
        const [x2,y2,z2]=rx3(ry3([x,y,z],gY),gX);
        // mouse repulsion (screen-space)
        const fov=520, sc=fov/(fov+z2+380);
        const sx0=CX+x2*sc, sy0=CY+y2*sc;
        const dx=sx0-mx, dy=sy0-my, dd=Math.sqrt(dx*dx+dy*dy);
        let rx=x2, ry=y2;
        if(dd<140){ const f=(140-dd)/140; rx+=dx/(dd||1)*f*24; ry+=dy/(dd||1)*f*24; }
        const ss=fov/(fov+z2+380);
        return { px:CX+rx*ss, py:CY+ry*ss, s:ss, z:z2, depth:(z2/SR+1)/2, phase:p.phase, sz:p.sz*ss };
      });

      // neural lines
      ctx.lineWidth=0.8;
      for(let i=0;i<nodes.length;i++){
        const a=nodes[i];
        for(let j=i+1;j<nodes.length;j++){
          const b=nodes[j];
          const dx=a.px-b.px, dy=a.py-b.py, d=Math.sqrt(dx*dx+dy*dy);
          if(d>85)continue;
          const al=(1-d/85)*0.25*Math.min(a.s,b.s)*2.2;
          if(al<0.008)continue;
          ctx.strokeStyle=`rgba(0,109,119,${al.toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.px,a.py); ctx.lineTo(b.px,b.py); ctx.stroke();
        }
      }

      // sphere nodes (back-to-front)
      nodes.sort((a,b)=>a.z-b.z);
      nodes.forEach(p=>{
        if(p.depth<0.04)return;
        const pulse=p.sz+Math.sin(p.phase)*0.95;
        const al=Math.max(0.08,p.depth*0.96);
        const g=ctx.createRadialGradient(p.px,p.py,0,p.px,p.py,pulse*5);
        g.addColorStop(0,  `rgba(131,197,190,${(al*0.9).toFixed(3)})`);
        g.addColorStop(0.4,`rgba(0,109,119,${(al*0.35).toFixed(3)})`);
        g.addColorStop(1,  'transparent');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.px,p.py,pulse*5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(0,109,119,${(al*0.93).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.px,p.py,pulse,0,Math.PI*2); ctx.fill();
      });

      // rings
      rings.forEach(ring=>{
        ring.nodes.forEach(nd=>{ nd.a+=ring.spd; nd.phase+=0.03; });
        const RR=SR*ring.rFrac;
        const rp=ring.nodes.map(nd=>{
          const [x,y,z]=[
            (Math.cos(nd.a)*ring.p1[0]+Math.sin(nd.a)*ring.p2[0])*RR,
            (Math.cos(nd.a)*ring.p1[1]+Math.sin(nd.a)*ring.p2[1])*RR,
            (Math.cos(nd.a)*ring.p1[2]+Math.sin(nd.a)*ring.p2[2])*RR,
          ];
          const [x2,y2,z2]=rx3(ry3([x,y,z],gY),gX);
          const fov=520, s=fov/(fov+z2+380);
          return { px:CX+x2*s, py:CY+y2*s, s, z:z2, depth:Math.max(0,(z2/SR+1)/2), phase:nd.phase, sz:nd.sz*s };
        });
        // arcs
        for(let i=0;i<rp.length;i++){
          const a=rp[i], b=rp[(i+1)%rp.length];
          const al=0.14*Math.min(a.depth,b.depth); if(al<0.01)continue;
          ctx.strokeStyle=`rgba(${ring.col.join(',')},${al.toFixed(3)})`; ctx.lineWidth=1.1;
          ctx.beginPath(); ctx.moveTo(a.px,a.py); ctx.lineTo(b.px,b.py); ctx.stroke();
        }
        // glows
        rp.forEach(p=>{
          if(p.depth<0.04)return;
          const pulse=p.sz+Math.sin(p.phase)*0.7;
          const al=p.depth*0.92;
          const g=ctx.createRadialGradient(p.px,p.py,0,p.px,p.py,pulse*4.5);
          g.addColorStop(0,  `rgba(${ring.col.join(',')},${(al*0.92).toFixed(3)})`);
          g.addColorStop(0.5,`rgba(${ring.col.join(',')},${(al*0.30).toFixed(3)})`);
          g.addColorStop(1,  'transparent');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.px,p.py,pulse*4.5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=`rgba(${ring.col.join(',')},${(al*0.95).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(p.px,p.py,pulse,0,Math.PI*2); ctx.fill();
        });
      });

      // edge vignette
      const vg=ctx.createRadialGradient(CX,CY,SR*0.5,CX,CY,SR*1.75);
      vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(237,246,249,0.52)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,cW,cH);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize',  onResize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:'absolute', inset:0,
        width:'100%', height:'100%',
        display:'block', zIndex:0,
        pointerEvents:'auto',
      }}
    />
  );
}
