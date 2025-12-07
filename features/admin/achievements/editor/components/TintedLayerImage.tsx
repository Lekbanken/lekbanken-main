'use client';
/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/utils";

type TintedLayerImageProps = {
  src: string;
  alt: string;
  color: string;
  size: number;
  className?: string;
};

export function TintedLayerImage({ src, alt, color, size, className }: TintedLayerImageProps) {
  const maskStyles = {
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  } as const;

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size, isolation: "isolate" }}
      aria-label={alt}
    >
      {/* Base image to preserve details */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="block h-full w-full"
        style={{
          filter: "grayscale(1) brightness(1.05) contrast(1.05)",
          mixBlendMode: "normal",
          opacity: 0.95,
        }}
      />

      {/* Tint overlay, masked to the PNG alpha */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: color,
          mixBlendMode: "multiply",
          opacity: 0.85,
          ...maskStyles,
        }}
      />

      {/* Subtle highlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          mixBlendMode: "screen",
          opacity: 0.12,
          ...maskStyles,
        }}
      />
    </div>
  );
}
