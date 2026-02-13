"use client";

import { useMemo } from "react";

/**
 * ParticleField — CSS-only ambient floating particles for JourneyScene.
 * Zero JS runtime (all animation via CSS keyframes).
 * Max 16 particles for performance. Respects prefers-reduced-motion.
 */
export function ParticleField({
  count = 16,
  accentColor = "#8661ff",
  enabled = true,
}: {
  count?: number;
  accentColor?: string;
  enabled?: boolean;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        id: i,
        left: (i * 31) % 100,
        top: (i * 17) % 100,
        size: 2 + (i % 3),
        duration: 15 + (i % 10),
        delay: (i * 0.5) % 10,
        opacity: 0.3 + (i % 5) * 0.1,
      })),
    [count],
  );

  if (!enabled) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pf-float"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            backgroundColor: accentColor,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px ${accentColor}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pf-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-15px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-40px) translateX(15px); opacity: 0.5; }
        }
        .pf-float { animation: pf-float linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pf-float { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
