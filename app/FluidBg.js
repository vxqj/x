"use client";

import { useEffect, useRef } from "react";
import { FluidField, sampleLiquid } from "./fluidField";

const CELL = 20; // spacing between characters in px
const RAMP = " .:-=+*#%@"; // dark -> light glyph ramp

export default function FluidBg() {
  const canvasRef = useRef(null);
  const flowRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let aspect = 1;
    let dpr = 1;

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
      aspect = width / height;
      // Recreated on resize; the pointer field is cheap to rebuild and this
      // keeps grid resolution correctly matched to the new aspect ratio.
      flowRef.current = new FluidField(aspect, 3.2, true);
    }

    function handleMove(e) {
      flowRef.current?.move(e.clientX / width, e.clientY / height);
    }

    function handleLeave() {
      flowRef.current?.leave();
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    ctx.font = `${Math.round(CELL * 0.72)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const field = [0, 0, 0];
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let t = 0;

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!prefersReduced) t += dt * 0.6;

      const flow = flowRef.current;
      flow.step(dt);

      ctx.clearRect(0, 0, width, height);

      for (let r = 0; r < rows; r++) {
        const v = (r * CELL) / height;
        for (let c = 0; c < cols; c++) {
          const u = (c * CELL) / width;
          const light = sampleLiquid(u, v, aspect, t, flow, field);
          if (light < 0.05) continue;
          const idx = Math.min(RAMP.length - 1, Math.floor(light * RAMP.length));
          const ch = RAMP[idx];
          if (ch === " ") continue;
          const alpha = Math.min(0.85, 0.1 + light * 0.65);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          ctx.fillText(ch, c * CELL, r * CELL);
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}
