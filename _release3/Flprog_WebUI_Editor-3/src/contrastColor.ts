/**
 * Returns black (#000000) or white (#ffffff) for maximum contrast against the given background.
 * Uses relative luminance (WCAG).
 */
export function contrastColor(hexOrRgb: string): string {
  const rgb = parseToRgb(hexOrRgb);
  if (!rgb) return '#000000';
  const l = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return l > 0.4 ? '#000000' : '#ffffff';
}

function parseToRgb(color: string): { r: number; g: number; b: number } | null {
  const s = (color || '').trim();
  const hex = s.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hex) {
    let r: number, g: number, b: number;
    const h = hex[1];
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length >= 6) {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    } else return null;
    return { r, g, b };
  }
  const rgb = s.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  if (s === 'transparent' || s === '') return null;
  return null;
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function getLuminance(hexOrRgb: string): number {
  const rgb = parseToRgb(hexOrRgb);
  if (!rgb) return 0.5;
  return relativeLuminance(rgb.r, rgb.g, rgb.b);
}
