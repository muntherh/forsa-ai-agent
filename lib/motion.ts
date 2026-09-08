"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Small shared helpers for the voice-state visualizer
 * (components/VoiceWaveform.tsx).
 */

function hexToRgb(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/** Linear blend between two hex colors, optionally with alpha. */
export function mix(from: string, to: string, t: number, alphaValue = 1) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t);
  const [r, g, bl] = [channel(a.r, b.r), channel(a.g, b.g), channel(a.b, b.b)];
  return alphaValue >= 1 ? `rgb(${r}, ${g}, ${bl})` : `rgba(${r}, ${g}, ${bl}, ${alphaValue})`;
}

export const alpha = (hex: string, a: number) => mix(hex, hex, 0, a);

/** mulberry32 — deterministic across server/client renders for a given seed. */
export function seededRandom(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `useReducedMotion()` reads a media query that only exists in the browser,
 * so it returns false during SSR and can flip to true on the client's very
 * first render — a component that branches markup on it directly risks a
 * hydration mismatch. Gating on `mounted` keeps the first client render
 * identical to the server's, then applies the real preference right after.
 */
export function useSafeReducedMotion(): boolean {
  const prefersReduced = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && prefersReduced;
}
