"use client";

import { useEffect, useRef } from "react";

// A field of "x" characters that drift in a slow blobby wave and light up
// near the cursor. Pure canvas, no deps.
const CHAR = "x";
const CELL = 26; // spacing between characters in px
const BASE_ALPHA = 0.05;
const PEAK_ALPHA = 0.4;
const MOUSE_RADIUS = 160;

export default function AsciiBg() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL) + 1;
      rows = Math.ceil(height / CELL) + 1;
    }

    function handleMove(e) {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    }

    function handleLeave() {
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    ctx.font = `${CELL * 0.6}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let t = 0;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function frame() {
      ctx.clearRect(0, 0, width, height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * CELL;
          const y = r * CELL;

          // Slow blobby wave field, made of a couple of offset sine waves.
          const wave =
            Math.sin(x * 0.012 + t) * 0.5 +
            Math.sin(y * 0.016 - t * 0.8) * 0.5 +
            Math.sin((x + y) * 0.008 + t * 0.6) * 0.5;
          const waveNorm = (wave + 1.5) / 3; // roughly 0..1

          // Mouse proximity boost.
          const dx = x - mouse.current.x;
          const dy = y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const proximity = Math.max(0, 1 - dist / MOUSE_RADIUS);

          const alpha =
            BASE_ALPHA +
            waveNorm * 0.06 +
            proximity * (PEAK_ALPHA - BASE_ALPHA);

          if (alpha < 0.015) continue;

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          const scale = 1 + proximity * 0.6;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          ctx.fillText(CHAR, 0, 0);
          ctx.restore();
        }
      }

      if (!prefersReduced) {
        t += 0.006;
      }
      raf.current = requestAnimationFrame(frame);
    }

    frame();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}
