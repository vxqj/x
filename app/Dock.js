"use client";

import { useRef } from "react";

const ICONS = {
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-.9-.78-1.47-1.9-1.6-3.14h-3.02v13.4a2.7 2.7 0 1 1-2.7-2.7c.24 0 .47.03.7.08V10.4a5.7 5.7 0 1 0 5 5.66V9.4a8.29 8.29 0 0 0 4.9 1.59V7.98a5.4 5.4 0 0 1-3.28-2.16z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.5 22H1.4l8.1-9.3L1 2h7.1l4.9 6.1L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.53 9.53 0 0 1 5 0c1.9-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  ),
  discord: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.32 5.37a17.4 17.4 0 0 0-4.3-1.33c-.2.35-.4.8-.55 1.16a16.2 16.2 0 0 0-4.9 0 8.3 8.3 0 0 0-.56-1.16 17.35 17.35 0 0 0-4.3 1.33C2.6 9.1 1.9 12.73 2.2 16.3a17.5 17.5 0 0 0 5.3 2.68c.43-.58.81-1.2 1.14-1.85-.63-.24-1.23-.53-1.8-.87.15-.11.3-.23.44-.35a12.4 12.4 0 0 0 10.44 0c.14.12.29.24.44.35-.57.34-1.17.63-1.8.87.33.65.71 1.27 1.14 1.85a17.46 17.46 0 0 0 5.3-2.68c.36-4.14-.68-7.73-2.88-10.93ZM9.68 14.1c-.79 0-1.44-.73-1.44-1.63s.63-1.63 1.44-1.63 1.45.74 1.44 1.63c0 .9-.63 1.63-1.44 1.63Zm4.64 0c-.79 0-1.44-.73-1.44-1.63s.63-1.63 1.44-1.63 1.45.74 1.44 1.63c0 .9-.64 1.63-1.44 1.63Z" />
    </svg>
  ),
};

const LINKS = [
  { key: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@factor" },
  { key: "x", label: "Twitter / X", href: "https://twitter.com/rebasing" },
  { key: "github", label: "GitHub", href: "https://github.com/browsers" },
  { key: "discord", label: "Discord", href: "https://discord.gg/killed" },
];

// Distance-based scale, like a macOS dock magnifying under the cursor.
const MAX_SCALE = 1.55;
const FALLOFF = 90; // px radius of influence

export default function Dock() {
  const itemRefs = useRef([]);

  function handleMouseMove(e) {
    itemRefs.current.forEach((el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - center);
      const influence = Math.max(0, 1 - dist / FALLOFF);
      const scale = 1 + influence * (MAX_SCALE - 1);
      const lift = influence * 10;
      el.style.transform = `translateY(-${lift}px) scale(${scale})`;
    });
  }

  function handleMouseLeave() {
    itemRefs.current.forEach((el) => {
      if (el) el.style.transform = "translateY(0) scale(1)";
    });
  }

  return (
    <nav className="dock-wrap" aria-label="Social links">
      <div className="dock" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        {LINKS.map((link, i) => (
          <a
            key={link.key}
            ref={(el) => (itemRefs.current[i] = el)}
            className="dock-item"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
          >
            {ICONS[link.key]}
            <span className="dock-label">{link.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
