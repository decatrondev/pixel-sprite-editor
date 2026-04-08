export function validateHexColor(color: string): string | null {
  const match = color.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1];
  if (hex.length === 3) {
    return '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return '#' + hex;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const COLOR_PRESETS: Record<string, { name: string; colors: string[] }> = {
  default: {
    name: 'Default',
    colors: [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
      '#FF00FF', '#00FFFF', '#808080', '#C0C0C0', '#800000', '#008000',
      '#000080', '#808000', '#800080', '#008080', '#FFA500', '#A52A2A',
      '#DEB887', '#5F9EA0', '#7FFF00', '#D2691E', '#FF7F50', '#6495ED',
    ],
  },
  gameboy: {
    name: 'GameBoy',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  nes: {
    name: 'NES',
    colors: [
      '#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc', '#7c7c7c', '#a4e4fc',
      '#3cbcfc', '#0078f8', '#0000fc', '#b8b8f8', '#6888fc', '#0058f8',
      '#0000bc', '#d8b8f8', '#9878f8', '#6844fc', '#4428bc', '#f8b8f8',
      '#f878f8', '#d800cc', '#940084', '#f8a4c0', '#f85898', '#e40058',
      '#a80020', '#f0d0b0', '#f87858', '#f83800', '#a81000', '#fce0a8',
      '#fca044', '#e45c10', '#881400', '#f8d878', '#f8b800', '#ac7c00',
      '#503000', '#d8f878', '#b8f818', '#00b800', '#007800', '#b8f8b8',
      '#58d854', '#00a800', '#006800', '#b8f8d8', '#58f898', '#00a844',
      '#005800', '#00fcfc', '#00e8d8', '#008888', '#004058', '#f8d8f8',
      '#787878', '#000000', '#000000', '#000000', '#000000', '#000000',
      '#000000', '#000000', '#000000', '#000000',
    ],
  },
  c64: {
    name: 'C64',
    colors: [
      '#000000', '#FFFFFF', '#880000', '#AAFFEE', '#CC44CC', '#00CC55',
      '#0000AA', '#EEEE77', '#DD8855', '#664400', '#FF7777', '#333333',
      '#777777', '#AAFF66', '#0088FF', '#BBBBBB',
    ],
  },
};
