"use client";

import { useEffect, useRef, useState } from "react";

export default function OrbitArt() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      height = 0,
      frame = 0,
      time = 0,
      visible = true;
    let pointerX = 0,
      pointerY = 0;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    });
    // The torus is a fixed grid of points. Angles are computed once; each frame only rotates them.
    const RINGS = 60,
      SEGMENTS = 100,
      COUNT = RINGS * SEGMENTS,
      BUCKETS = 14;
    const cosU = new Float32Array(COUNT),
      sinU = new Float32Array(COUNT),
      cosV = new Float32Array(COUNT),
      sinV = new Float32Array(COUNT),
      ringOf = new Uint8Array(COUNT);
    for (let ring = 0; ring < RINGS; ring++) {
      const u = (ring / RINGS) * Math.PI * 2;
      for (let segment = 0; segment < SEGMENTS; segment++) {
        const i = ring * SEGMENTS + segment;
        const v = (segment / SEGMENTS) * Math.PI * 2;
        cosU[i] = Math.cos(u);
        sinU[i] = Math.sin(u);
        cosV[i] = Math.cos(v);
        sinV[i] = Math.sin(v);
        ringOf[i] = ring;
      }
    }
    const screenX = new Float32Array(COUNT),
      screenY = new Float32Array(COUNT),
      bucketOf = new Uint8Array(COUNT),
      order = new Uint16Array(COUNT),
      bucketStart = new Uint16Array(BUCKETS + 1),
      ripples = new Float32Array(RINGS);
    const draw = () => {
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width, height) * 0.29;
      const tilt = 0.95 + pointerY * 0.12,
        turn = time * 0.12 + pointerX * 0.18;
      const cTilt = Math.cos(tilt),
        sTilt = Math.sin(tilt),
        cTurn = Math.cos(turn),
        sTurn = Math.sin(turn);
      for (let ring = 0; ring < RINGS; ring++) {
        ripples[ring] = 0.07 * Math.sin((ring / RINGS) * Math.PI * 2 * 3 + time);
      }
      bucketStart.fill(0);
      for (let i = 0; i < COUNT; i++) {
        const radius = 1.03 + (0.39 + ripples[ringOf[i]]) * cosV[i];
        const x = radius * cosU[i],
          y = radius * sinU[i],
          z = 0.39 * sinV[i];
        const a = x * cTurn - z * sTurn,
          b = x * sTurn + z * cTurn;
        const py = y * cTilt - b * sTilt,
          pz = y * sTilt + b * cTilt;
        const perspective = 3.5 / (3.5 - pz);
        screenX[i] = width / 2 + a * scale * perspective;
        screenY[i] = height / 2 + py * scale * perspective;
        const depth = Math.min(0.999, Math.max(0, (pz + 1.5) / 3));
        const bucket = (depth * BUCKETS) | 0;
        bucketOf[i] = bucket;
        bucketStart[bucket + 1]++;
      }
      for (let b = 0; b < BUCKETS; b++) bucketStart[b + 1] += bucketStart[b];
      const cursor = bucketStart.slice(0, BUCKETS);
      for (let i = 0; i < COUNT; i++) order[cursor[bucketOf[i]]++] = i;
      // Far to near, one path and one fill per depth band.
      for (let b = 0; b < BUCKETS; b++) {
        const depth = (b + 0.5) / BUCKETS;
        const radius = 0.45 + depth * 0.8;
        context.fillStyle = `rgba(${Math.round(160 + depth * 95)},${Math.round(85 + depth * 120)},${Math.round(30 + depth * 85)},${0.16 + depth * 0.75})`;
        context.beginPath();
        for (let k = bucketStart[b]; k < bucketStart[b + 1]; k++) {
          const i = order[k];
          context.moveTo(screenX[i] + radius, screenY[i]);
          context.arc(screenX[i], screenY[i], radius, 0, Math.PI * 2);
        }
        context.fill();
      }
    };
    const tick = () => {
      if (visible && !document.hidden && !paused && !motion.matches) {
        time += 0.012;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const pointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
      if (paused || motion.matches) draw();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);
    resize.observe(canvas);
    canvas.addEventListener("pointermove", pointer);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener("pointermove", pointer);
    };
  }, [paused]);
  return (
    <div className="orbit-art">
      <div className="orbit-grid" aria-hidden="true" />
      <span className="orbit-coordinate top-left">
        FIG. 01 / CONTINUOUS EXPLORATION
      </span>
      <canvas
        ref={canvasRef}
        aria-label="An evolving gold particle torus. Move your pointer to change its perspective."
        role="img"
      />
      <div className="orbit-caption">
        <span>
          <i /> SYSTEMS IN MOTION
        </span>
        <button onClick={() => setPaused(!paused)} aria-pressed={paused}>
          {paused ? "Resume motion ↗" : "Pause motion Ⅱ"}
        </button>
      </div>
    </div>
  );
}
