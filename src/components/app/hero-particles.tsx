"use client";

import { useMemo } from "react";

// Seeded pseudo-random for stable SSR/CSR output
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function HeroParticles({ count = 52 }: { count?: number }) {
  const particles = useMemo<Particle[]>(() => {
    const rand = seeded(2026);
    return Array.from({ length: count }, (_, i) => {
      const r = rand();
      return {
        id: i,
        x: rand() * 100,
        y: rand() * 100,
        size: r > 0.88 ? 1.5 : r > 0.55 ? 1 : 0.75,
        duration: rand() * 5 + 4,   // 4 - 9 s
        delay:    rand() * 9,        // 0 - 9 s offset
      };
    });
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left:      `${p.x}%`,
            top:       `${p.y}%`,
            width:     `${p.size}px`,
            height:    `${p.size}px`,
            animation: `rt-twinkle ${p.duration.toFixed(1)}s ${p.delay.toFixed(1)}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
