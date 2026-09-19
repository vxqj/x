"use client";

import { useEffect, useRef } from "react";
import { FluidField, paintLiquidSource, type PointerField } from "./fluidField";

const CELL = 18; // on-screen spacing between glyphs, in px
const SUPERSAMPLE = 3; // subpixels per glyph cell, averaged like a real image->ascii pass
const RAMP = " .:-=+*#%@"; // dark -> light glyph ramp

export default function FluidBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let aspect = 1;
    let bufW = 0;
    let bufH = 0;
    let pixels: Uint8ClampedArray;
    let flow: PointerField;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = width + "px";
      canvas!.style.height = height + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / CELL) + 1;
      rows = Math.ceil(height / CELL) + 1;
      aspect = width / height;

      // Real pixel buffer, one small block of subpixels per glyph cell.
      bufW = cols * SUPERSAMPLE;
      bufH = rows * SUPERSAMPLE;
      pixels = new Uint8ClampedArray(bufW * bufH * 4);

      flow = new FluidField(aspect, 3.2, true);
    }

    function handleMove(e: MouseEvent) {
      flow?.move(e.clientX / width, e.clientY / height);
    }
    function handleLeave() {
      flow?.leave();
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    ctx.font = `${Math.round(CELL * 0.75)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let t = 0;

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!prefersReduced) t += dt * 0.6;

      flow.step(dt);
      // Fills the real grayscale buffer using the untouched source logic.
      paintLiquidSource(pixels, bufW, bufH, aspect, t, flow);

      ctx!.clearRect(0, 0, width, height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Asciify pass: average the supersampled block under this glyph.
          let sum = 0;
          for (let sy = 0; sy < SUPERSAMPLE; sy++) {
            const py = r * SUPERSAMPLE + sy;
            for (let sx = 0; sx < SUPERSAMPLE; sx++) {
              const px = c * SUPERSAMPLE + sx;
              sum += pixels[(py * bufW + px) * 4];
            }
          }
          const light = sum / (SUPERSAMPLE * SUPERSAMPLE * 255);
          if (light < 0.05) continue;

          const idx = Math.min(RAMP.length - 1, Math.floor(light * RAMP.length));
          const ch = RAMP[idx];
          if (ch === " ") continue;

          const alpha = Math.min(0.85, 0.1 + light * 0.65);
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          ctx!.fillText(ch, c * CELL, r * CELL);
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}
