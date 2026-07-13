import { useEffect } from 'react';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generatePalette(primaryHex: string): Record<string, string> {
  if (!primaryHex.match(/^#[0-9a-fA-F]{6}$/)) return {};
  const [h, s, l] = hexToHsl(primaryHex);
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  return {
    '50':  hslToHex(h, clamp(s * 0.25, 5, 60), 97),
    '100': hslToHex(h, clamp(s * 0.35, 5, 70), 93),
    '300': hslToHex(h, clamp(s * 0.70, 10, 90), 76),
    '500': hslToHex(h, s, clamp(l + 9, 20, 90)),
    '600': primaryHex,
    '700': hslToHex(h, s, clamp(l - 7, 5, 80)),
    '800': hslToHex(h, s, clamp(l - 13, 5, 70)),
    '900': hslToHex(h, s, clamp(l - 18, 5, 60)),
  };
}

const BRAND_SHADES = ['50', '100', '300', '500', '600', '700', '800', '900'];

export function useOrgBranding(primaryColor?: string | null) {
  useEffect(() => {
    if (!primaryColor) return;
    const palette = generatePalette(primaryColor);
    const root = document.documentElement;
    BRAND_SHADES.forEach((shade) => {
      if (palette[shade]) root.style.setProperty(`--color-brand-${shade}`, palette[shade]);
    });
    return () => {
      BRAND_SHADES.forEach((shade) => root.style.removeProperty(`--color-brand-${shade}`));
    };
  }, [primaryColor]);
}
