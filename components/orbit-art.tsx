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
    const draw = () => {
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width, height) * 0.29;
      const points: { x: number; y: number; z: number }[] = [];
      for (let ring = 0; ring < 60; ring++) {
        const u = (ring / 60) * Math.PI * 2;
        for (let segment = 0; segment < 100; segment++) {
          const v = (segment / 100) * Math.PI * 2;
          const ripple = 0.07 * Math.sin(u * 3 + time);
          const radius = 1.03 + (0.39 + ripple) * Math.cos(v);
          const x = radius * Math.cos(u),
            y = radius * Math.sin(u),
            z = 0.39 * Math.sin(v);
          const tilt = 0.95 + pointerY * 0.12,
            turn = time * 0.12 + pointerX * 0.18;
          const a = x * Math.cos(turn) - z * Math.sin(turn),
            b = x * Math.sin(turn) + z * Math.cos(turn);
          points.push({
            x: a,
            y: y * Math.cos(tilt) - b * Math.sin(tilt),
            z: y * Math.sin(tilt) + b * Math.cos(tilt),
          });
        }
      }
      points.sort((a, b) => a.z - b.z);
      for (const p of points) {
        const depth = (p.z + 1.5) / 3;
        const perspective = 3.5 / (3.5 - p.z);
        context.fillStyle = `rgba(${Math.round(160 + depth * 95)},${Math.round(85 + depth * 120)},${Math.round(30 + depth * 85)},${0.16 + depth * 0.75})`;
        context.beginPath();
        context.arc(
          width / 2 + p.x * scale * perspective,
          height / 2 + p.y * scale * perspective,
          0.45 + depth * 0.8,
          0,
          Math.PI * 2,
        );
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
