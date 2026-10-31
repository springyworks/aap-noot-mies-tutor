#!/usr/bin/env node
/**
 * ============================================================================
 * STRICT TYPESCRIPT AAP-NOOT-MIES WEBP ALPHA SLICER (scripts/slice_aapnootmies.ts)
 * ============================================================================
 * Slices the 17 classic Dutch Hoogeveen / Cornelis Jetses "Leesplankje" figures
 * from public/aapnootmies/leesplankje_original.jpg into:
 *   1. Transparent Alpha-Channel WebP (`public/aapnootmies/<word>.webp` + `webpDataUri`)
 *      with soft-feathered vintage oval vignette & sky/backdrop translucency matte
 *      so 1960s motion-lamp effects shine subtly through & behind the character!
 *   2. Standard PNG & JPG fallbacks (`public/aapnootmies/<word>.png` & `.jpg`)
 * Generates `src/aapNootMiesAssets.ts` with 100% strict TypeScript types.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

export interface FigureCropSpec {
  readonly word: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly labelNL: string;
  readonly labelEN: string;
  readonly lampPrimaryHex: string;
  readonly lampSecondaryHex: string;
  readonly lampWarmthHex: string;
}

export interface AapNootMiesFigureAsset {
  readonly word: string;
  readonly index: number;
  readonly webpUrl: string;
  readonly webpDataUri: string;
  readonly lampWebpUrl: string;
  readonly lampWebpDataUri: string;
  readonly fileUrl: string;
  readonly jpgUrl: string;
  readonly dataUri: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly isLandscape: boolean;
  readonly labelNL: string;
  readonly labelEN: string;
  readonly lampPrimaryHex: string;
  readonly lampSecondaryHex: string;
  readonly lampWarmthHex: string;
}

const FIGURE_SPECS: readonly FigureCropSpec[] = [
  // Row 1 (6 figures) — Distinct, saturated 1960s kitsch motion-lamp palettes per character
  { word: 'aap',     left: 8,    top: 67,  right: 161,  bottom: 213, labelNL: 'Aap op het dak',             labelEN: 'Monkey on perch',           lampPrimaryHex: '#ff5e1a', lampSecondaryHex: '#00d2aa', lampWarmthHex: '#ffe600' },
  { word: 'noot',    left: 204,  top: 67,  right: 367,  bottom: 213, labelNL: 'Walnoot op tafel',           labelEN: 'Walnut on table',           lampPrimaryHex: '#10b981', lampSecondaryHex: '#f59e0b', lampWarmthHex: '#fde047' },
  { word: 'mies',    left: 410,  top: 67,  right: 573,  bottom: 213, labelNL: 'Poes Mies bij de schutting', labelEN: 'Cat Mies by fence',         lampPrimaryHex: '#ec4899', lampSecondaryHex: '#8b5cf6', lampWarmthHex: '#fbcfe8' },
  { word: 'wim',     left: 616,  top: 67,  right: 779,  bottom: 213, labelNL: 'Wim speelt met blokken',     labelEN: 'Wim playing with blocks',   lampPrimaryHex: '#06b6d4', lampSecondaryHex: '#f97316', lampWarmthHex: '#fde047' },
  { word: 'zus',     left: 822,  top: 67,  right: 985,  bottom: 213, labelNL: 'Zus in de kinderstoel',      labelEN: 'Sister Zus in highchair',   lampPrimaryHex: '#f43f5e', lampSecondaryHex: '#eab308', lampWarmthHex: '#fef08a' },
  { word: 'jet',     left: 1030, top: 67,  right: 1190, bottom: 213, labelNL: 'Jet kleedt haar pop aan',    labelEN: 'Jet dressing her doll',     lampPrimaryHex: '#a855f7', lampSecondaryHex: '#ec4899', lampWarmthHex: '#fde68a' },
  // Row 2 (6 figures)
  { word: 'teun',    left: 8,    top: 335, right: 161,  bottom: 484, labelNL: 'Oude Teun met hoed en stok', labelEN: 'Old Teun with hat and cane',lampPrimaryHex: '#14b8a6', lampSecondaryHex: '#f59e0b', lampWarmthHex: '#fef08a' },
  { word: 'vuur',    left: 204,  top: 335, right: 367,  bottom: 484, labelNL: 'Brandende vuurkorf',         labelEN: 'Burning fire brazier',      lampPrimaryHex: '#ef4444', lampSecondaryHex: '#f97316', lampWarmthHex: '#fef08a' },
  { word: 'gijs',    left: 410,  top: 335, right: 573,  bottom: 484, labelNL: 'Gijs met de schop',          labelEN: 'Gijs with shovel',          lampPrimaryHex: '#3b82f6', lampSecondaryHex: '#10b981', lampWarmthHex: '#fde047' },
  { word: 'lam',     left: 616,  top: 335, right: 779,  bottom: 484, labelNL: 'Wit lammetje in de wei',     labelEN: 'White lamb in meadow',      lampPrimaryHex: '#22c55e', lampSecondaryHex: '#eab308', lampWarmthHex: '#fef9c3' },
  { word: 'kees',    left: 822,  top: 335, right: 985,  bottom: 484, labelNL: 'Witte keeshond Kees',        labelEN: 'White spitz dog Kees',      lampPrimaryHex: '#f59e0b', lampSecondaryHex: '#06b6d4', lampWarmthHex: '#fef08a' },
  { word: 'bok',     left: 1030, top: 335, right: 1190, bottom: 484, labelNL: 'Bok voor de bokkenwagen',    labelEN: 'Billy goat pulling cart',   lampPrimaryHex: '#84cc16', lampSecondaryHex: '#f97316', lampWarmthHex: '#fef08a' },
  // Row 3 (5 figures; weide & schapen are wide landscape panels)
  { word: 'weide',   left: 8,    top: 602, right: 262,  bottom: 748, labelNL: 'Hollandse weide met koe',    labelEN: 'Dutch meadow with cow',     lampPrimaryHex: '#10b981', lampSecondaryHex: '#0ea5e9', lampWarmthHex: '#fef08a' },
  { word: 'does',    left: 309,  top: 602, right: 471,  bottom: 748, labelNL: 'Zwarte poedel Does',         labelEN: 'Black poodle Does',         lampPrimaryHex: '#f97316', lampSecondaryHex: '#ec4899', lampWarmthHex: '#fde047' },
  { word: 'hok',     left: 514,  top: 602, right: 676,  bottom: 748, labelNL: 'Groen dierenhok',            labelEN: 'Green animal house',        lampPrimaryHex: '#059669', lampSecondaryHex: '#eab308', lampWarmthHex: '#fde68a' },
  { word: 'duif',    left: 720,  top: 602, right: 884,  bottom: 748, labelNL: 'Duif op de dakpannen',       labelEN: 'Pigeon on roof tiles',      lampPrimaryHex: '#0ea5e9', lampSecondaryHex: '#f43f5e', lampWarmthHex: '#fef08a' },
  { word: 'schapen', left: 930,  top: 602, right: 1190, bottom: 748, labelNL: 'Kudde schapen onder boom',   labelEN: 'Flock of sheep under tree', lampPrimaryHex: '#22c55e', lampSecondaryHex: '#a855f7', lampWarmthHex: '#fef08a' }
];

const WORKSPACE_ROOT: string = process.cwd();
const OUT_DIR: string = path.join(WORKSPACE_ROOT, 'public', 'aapnootmies');
const TS_OUT_FILE: string = path.join(WORKSPACE_ROOT, 'src', 'aapNootMiesAssets.ts');

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Generates a dedicated 1960s Econolite / Scene-in-Action Motion-Lamp
 * Rippled Light-Cylinder WebP (`public/aapnootmies/lamp_<word>.webp`).
 *
 * How a real 1960s Econolite waterfall/ember lamp works:
 * A warm incandescent bulb sits inside a slowly rotating cylinder molded with
 * fine diagonal rippled glass flutes (creating cascading waterfall / rising ember
 * interference bands of warm golden light and soft amber shadow).
 * When masked strictly to the stationary figure cut-out, ONLY the figure itself
 * shimmers softly from within while the cell background stays 100% calm and dark.
 */
function buildKitschLampWheelWebp(spec: FigureCropSpec, idx: number, lampWebpPath: string): Buffer {
  const size = 180;
  const rgbaBuf = Buffer.alloc(size * size * 4);

  const cPrimary = hexToRgb(spec.lampPrimaryHex);
  const cSecondary = hexToRgb(spec.lampSecondaryHex);
  const cWarmth = hexToRgb(spec.lampWarmthHex);
  // Warm 40W incandescent tungsten bulb core (#fffbeb / #fde68a)
  const cBulb: [number, number, number] = [255, 248, 220];

  // 1960s Econolite cylinder has 10..14 fine rippled flutes + gentle spiral twist
  const flutes = 10 + (idx % 5);
  const spiralTwist = (idx % 2 === 0 ? 1 : -1) * (3.8 + (idx % 3) * 0.7);
  const phaseOffset = idx * 1.37;

  for (let y = 0; y < size; y++) {
    const ny = (y - size * 0.5) / (size * 0.5);
    for (let x = 0; x < size; x++) {
      const nx = (x - size * 0.5) / (size * 0.5);
      const r = Math.sqrt(nx * nx + ny * ny);
      const theta = Math.atan2(ny, nx);

      // Fine rippled glass waterfall / ember interference waves
      const fluteWave = Math.sin(theta * flutes + r * spiralTwist + Math.sin(r * 11.0 + phaseOffset) * 0.65);
      const secondaryRipple = Math.cos(theta * (flutes - 3) - r * (spiralTwist * 0.7) + phaseOffset);
      // Softly peaked light crests (like refracted caustics through rippled plastic cylinder)
      const causticCrest = Math.pow(0.5 + 0.5 * fluteWave, 1.8);
      const warmUndertone = 0.5 + 0.5 * secondaryRipple;

      // Subtle, warm blend between incandescent bulb gold and character accent tints
      const wBulb = causticCrest * 0.55;
      const wWarm = (1.0 - causticCrest * 0.4) * 0.45;
      const wPrim = warmUndertone * 0.38;
      const wSec = (1.0 - warmUndertone) * 0.32;
      const wSum = wBulb + wWarm + wPrim + wSec + 1e-5;

      // Modulate brightness between soft warm shadow trough (0.38) and warm incandescent crest (1.06)
      // so rotating this wheel behind the figure's translucent pigments creates gentle 1960s waterfall/ember motion!
      const intensity = 0.38 + 0.68 * causticCrest;
      const pr = Math.min(255, Math.round(((cBulb[0] * wBulb + cWarmth[0] * wWarm + cPrimary[0] * wPrim + cSecondary[0] * wSec) / wSum) * intensity));
      const pg = Math.min(255, Math.round(((cBulb[1] * wBulb + cWarmth[1] * wWarm + cPrimary[1] * wPrim + cSecondary[1] * wSec) / wSum) * intensity));
      const pb = Math.min(255, Math.round(((cBulb[2] * wBulb + cWarmth[2] * wWarm + cPrimary[2] * wPrim + cSecondary[2] * wSec) / wSum) * intensity));

      // Confine the lamp beam to the central figure zone (fades to 0 before the tile borders)
      const discAlpha = 1.0 - smoothstep(0.52, 0.88, r);
      const bandAlpha = 0.55 + 0.45 * causticCrest;
      const alpha = Math.round(Math.max(0, Math.min(1, discAlpha * bandAlpha)) * 255);

      const pIdx = (y * size + x) * 4;
      rgbaBuf[pIdx] = pr;
      rgbaBuf[pIdx + 1] = pg;
      rgbaBuf[pIdx + 2] = pb;
      rgbaBuf[pIdx + 3] = alpha;
    }
  }

  const webpBytes = Buffer.from(
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-v', 'error',
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        '-s', `${size}x${size}`,
        '-i', '-',
        '-c:v', 'libwebp',
        '-lossless', '0',
        '-quality', '86',
        '-compression_level', '6',
        '-f', 'webp',
        '-'
      ],
      { input: rgbaBuf }
    )
  );

  fs.writeFileSync(lampWebpPath, webpBytes);
  return webpBytes;
}

function cropWithFfmpeg(srcImage: string, outPath: string, x: number, y: number, w: number, h: number): void {
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', srcImage, '-vf', `crop=${w}:${h}:${x}:${y}`, '-frames:v', '1', outPath],
    { stdio: 'inherit' }
  );
}

/**
 * Extracts raw RGBA pixels from the cropped PNG and builds an authentic 1960s
 * Econolite / Scene-in-Action figure cut-out WebP (`<word>.webp`):
 * 1. Outer background/sky/wall around the figure is cleanly removed (`alpha = 0`)
 *    via border-seeded flood-fill + soft 3px spatial feathering, so there is ZERO
 *    rectangular box or background clutter in the cell.
 * 2. Inside the figure silhouette itself:
 *    - Dark Cornelis Jetses ink outlines stay 100% opaque (`alpha = 1.0`).
 *    - Colored & highlighted painted regions of the figure (fur, clothes, fire,
 *      water, foliage, feathers) have subtle 1960s lithograph translucency
 *      (`alpha = 0.72..0.92`), allowing the masked rotating `lamp_<word>.webp`
 *      directly behind the figure to softly illuminate ONLY the figure itself!
 */
function buildAlphaWebpFromPng(pngPath: string, webpPath: string): { width: number; height: number; webpBytes: Buffer } {
  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', pngPath],
    { encoding: 'utf-8' }
  ).trim();
  const [width, height] = probe.split(',').map(Number);

  const rgbaBuf = Buffer.from(
    execFileSync('ffmpeg', ['-v', 'error', '-i', pngPath, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'])
  );

  // Sample perimeter backdrop colors (top/left/right/bottom border strip)
  const bgSamples: Array<[number, number, number]> = [];
  for (let x = 4; x < width - 4; x += 6) {
    for (const y of [3, 7, height - 6]) {
      const idx = (y * width + x) * 4;
      bgSamples.push([rgbaBuf[idx], rgbaBuf[idx + 1], rgbaBuf[idx + 2]]);
    }
  }
  for (let y = 6; y < height - 6; y += 8) {
    for (const x of [3, 7, width - 8, width - 4]) {
      const idx = (y * width + x) * 4;
      bgSamples.push([rgbaBuf[idx], rgbaBuf[idx + 1], rgbaBuf[idx + 2]]);
    }
  }

  // Compute per-pixel background affinity (how closely it matches the outer wall/sky/ground border)
  const totalPixels = width * height;
  const bgAffinity = new Float32Array(totalPixels);
  for (let y = 0; y < height; y++) {
    const ny = (y - height * 0.5) / (height * 0.5);
    for (let x = 0; x < width; x++) {
      const nx = (x - width * 0.5) / (width * 0.5);
      const p = y * width + x;
      const idx = p * 4;
      const r = rgbaBuf[idx];
      const g = rgbaBuf[idx + 1];
      const b = rgbaBuf[idx + 2];

      let minBgDist = 999;
      for (let s = 0; s < bgSamples.length; s++) {
        const [br, bg, bb] = bgSamples[s];
        const dr = r - br;
        const dg = g - bg;
        const db = b - bb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < minBgDist) minBgDist = dist;
      }

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      // Protect central character subject and dark ink outlines from being classified as outer background
      const ellDist = Math.sqrt(nx * nx * 0.95 + ny * ny * 0.95);
      const centerCoreProtect = 1.0 - smoothstep(0.10, 0.58, ellDist);
      const isDarkInk = 1.0 - smoothstep(0.18, 0.42, lum);
      const isRichPigment = smoothstep(0.28, 0.62, sat);

      const colorMatch = 1.0 - smoothstep(14, 58, minBgDist);
      const paleNeutralMatch = smoothstep(0.50, 0.84, lum) * (1.0 - smoothstep(0.10, 0.36, sat));
      const rawBg = Math.max(colorMatch, paleNeutralMatch * 0.85) * (1.0 - isDarkInk * 0.95) * (1.0 - isRichPigment * centerCoreProtect * 0.85);
      bgAffinity[p] = Math.max(0, Math.min(1, rawBg));
    }
  }

  // Border-seeded BFS flood-fill so ONLY background connected to the outer perimeter becomes transparent (alpha = 0),
  // while bright white/pale details INSIDE the figure (e.g. Wim's cat, Duif, Schapen, Zus's apron) stay solid!
  const outerBgVisited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let qHead = 0;
  let qTail = 0;

  const enqueueIfBg = (x: number, y: number, threshold: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (outerBgVisited[p]) return;
    if (bgAffinity[p] >= threshold) {
      outerBgVisited[p] = 1;
      queue[qTail++] = p;
    }
  };

  // Seed outer 4px perimeter
  for (let x = 0; x < width; x++) {
    for (const y of [0, 1, 2, 3, height - 4, height - 3, height - 2, height - 1]) {
      enqueueIfBg(x, y, 0.25);
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, 1, 2, 3, width - 4, width - 3, width - 2, width - 1]) {
      enqueueIfBg(x, y, 0.25);
    }
  }

  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % width;
    const cy = (curr - cx) / width;
    const cIdx = curr * 4;
    const cr = rgbaBuf[cIdx];
    const cg = rgbaBuf[cIdx + 1];
    const cb = rgbaBuf[cIdx + 2];

    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1]
    ];
    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const np = ny * width + nx;
      if (outerBgVisited[np]) continue;

      const nIdx = np * 4;
      const stepDist = Math.sqrt(
        Math.pow(rgbaBuf[nIdx] - cr, 2) +
        Math.pow(rgbaBuf[nIdx + 1] - cg, 2) +
        Math.pow(rgbaBuf[nIdx + 2] - cb, 2)
      );
      // Flood continues if neighbor is similar to current background pixel and has background affinity
      if (stepDist < 34 && bgAffinity[np] >= 0.34) {
        outerBgVisited[np] = 1;
        queue[qTail++] = np;
      }
    }
  }

  // Compute feathered foreground silhouette mask (3px spatial box-blur feather on (1 - outerBgVisited))
  const fgMaskRaw = new Float32Array(totalPixels);
  for (let y = 0; y < height; y++) {
    const ny = (y - height * 0.5) / (height * 0.5);
    for (let x = 0; x < width; x++) {
      const nx = (x - width * 0.5) / (width * 0.5);
      const p = y * width + x;
      // Soft outer oval vignette at very edge of tile so even non-flooded ground corners taper smoothly to 0
      const ellDist = Math.sqrt(nx * nx * 0.92 + ny * ny * 0.96);
      const sqDist = Math.pow(Math.pow(Math.abs(nx), 3.4) + Math.pow(Math.abs(ny), 3.4), 1 / 3.4);
      const radialDist = ellDist * 0.65 + sqDist * 0.35;
      const borderVignette = 1.0 - smoothstep(0.76, 0.97, radialDist);

      const isFg = outerBgVisited[p] ? 0.0 : 1.0;
      fgMaskRaw[p] = isFg * borderVignette;
    }
  }

  // 5x5 spatial feather pass for smooth anti-aliased cut-out edges
  const fgMaskSmooth = new Float32Array(totalPixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -2; dy <= 2; dy++) {
        const sy = y + dy;
        if (sy < 0 || sy >= height) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const sx = x + dx;
          if (sx < 0 || sx >= width) continue;
          sum += fgMaskRaw[sy * width + sx];
          count++;
        }
      }
      fgMaskSmooth[y * width + x] = sum / count;
    }
  }

  // Apply 1960s Econolite Lithograph Alpha Architecture:
  // - Background (sky, fence, wall, ground around the figure): 100% OPAQUE (alpha = 255) -> ZERO background lamp effect!
  // - Dark Cornelis Jetses ink outlines: 100% OPAQUE (alpha = 255) -> razor-sharp drawing!
  // - ONLY the central figure's painted colors & highlights (fgMaskSmooth > 0):
  //   translucent 1960s lithograph light-windows (alpha = 0.46 .. 0.84) so the rotating
  //   rippled waterfall/ember cylinder (`lamp_<word>.webp`) behind the image actively lights up ONLY the figure!
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const idx = p * 4;
      const r = rgbaBuf[idx];
      const g = rgbaBuf[idx + 1];
      const b = rgbaBuf[idx + 2];

      // How strongly this pixel belongs to the central figure vs. the outer background
      const figureWeight = smoothstep(0.15, 0.85, fgMaskSmooth[p]);

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      // Protect dark ink lines (lum < 0.28 stays alpha = 1.0)
      const notDarkInk = smoothstep(0.20, 0.42, lum);
      // Active pigment / highlight factor on the figure (colored fur/clothes/fire/foliage + warm highlights)
      const pigmentActivity = Math.min(1.0, sat * 1.35 + smoothstep(0.45, 0.88, lum) * 0.65);

      // Light-window translucency exists ONLY on the figure (figureWeight), NEVER on the background!
      const lightWindowTranslucency = figureWeight * notDarkInk * (0.22 + 0.34 * pigmentActivity);
      const finalAlphaFloat = Math.max(0.44, Math.min(1.0, 1.0 - lightWindowTranslucency));

      // Enrich color saturation (+34%) on the figure while keeping background calm & natural
      const satBoost = 1.0 + 0.34 * figureWeight;
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      let nr = gray + (r - gray) * satBoost;
      let ng = gray + (g - gray) * satBoost;
      let nb = gray + (b - gray) * satBoost;

      const contrast = 1.0 + 0.10 * figureWeight;
      nr = (nr - 128) * contrast + 128;
      ng = (ng - 128) * contrast + 128;
      nb = (nb - 128) * contrast + 128;

      rgbaBuf[idx] = Math.max(0, Math.min(255, Math.round(nr)));
      rgbaBuf[idx + 1] = Math.max(0, Math.min(255, Math.round(ng)));
      rgbaBuf[idx + 2] = Math.max(0, Math.min(255, Math.round(nb)));
      rgbaBuf[idx + 3] = Math.round(finalAlphaFloat * 255);
    }
  }

  const webpBytes = Buffer.from(
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-v', 'error',
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        '-s', `${width}x${height}`,
        '-i', '-',
        '-c:v', 'libwebp',
        '-lossless', '0',
        '-quality', '88',
        '-compression_level', '6',
        '-f', 'webp',
        '-'
      ],
      { input: rgbaBuf }
    )
  );

  fs.writeFileSync(webpPath, webpBytes);
  return { width, height, webpBytes };
}

function sliceAllFigures(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(WORKSPACE_ROOT, 'src'), { recursive: true });

  const srcImage = path.join(OUT_DIR, 'leesplankje_original.jpg');
  if (!fs.existsSync(srcImage)) {
    throw new Error(`Source image not found at ${srcImage}`);
  }

  // Crop clean full Leesplankje board (without bottom box)
  cropWithFfmpeg(srcImage, path.join(OUT_DIR, 'leesplankje_board.png'), 0, 12, 1200, 853);
  cropWithFfmpeg(srcImage, path.join(OUT_DIR, 'leesplankje_board.jpg'), 0, 12, 1200, 853);

  const entries: Record<string, AapNootMiesFigureAsset> = {};

  FIGURE_SPECS.forEach((spec, idx) => {
    const w = spec.right - spec.left;
    const h = spec.bottom - spec.top;
    const pngPath = path.join(OUT_DIR, `${spec.word}.png`);
    const jpgPath = path.join(OUT_DIR, `${spec.word}.jpg`);
    const webpPath = path.join(OUT_DIR, `${spec.word}.webp`);
    const lampWebpPath = path.join(OUT_DIR, `lamp_${spec.word}.webp`);

    cropWithFfmpeg(srcImage, pngPath, spec.left, spec.top, w, h);
    cropWithFfmpeg(srcImage, jpgPath, spec.left, spec.top, w, h);

    const { width, height, webpBytes } = buildAlphaWebpFromPng(pngPath, webpPath);
    const webpDataUri = `data:image/webp;base64,${webpBytes.toString('base64')}`;

    const lampWebpBytes = buildKitschLampWheelWebp(spec, idx, lampWebpPath);
    const lampWebpDataUri = `data:image/webp;base64,${lampWebpBytes.toString('base64')}`;

    const jpgBytes = fs.readFileSync(jpgPath);
    const jpgDataUri = `data:image/jpeg;base64,${jpgBytes.toString('base64')}`;

    entries[spec.word] = {
      word: spec.word,
      index: idx + 1,
      webpUrl: `/aapnootmies/${spec.word}.webp`,
      webpDataUri,
      lampWebpUrl: `/aapnootmies/lamp_${spec.word}.webp`,
      lampWebpDataUri,
      fileUrl: `/aapnootmies/${spec.word}.png`,
      jpgUrl: `/aapnootmies/${spec.word}.jpg`,
      dataUri: webpDataUri || jpgDataUri,
      width,
      height,
      aspectRatio: Number((width / height).toFixed(3)),
      isLandscape: width > height * 1.3,
      labelNL: spec.labelNL,
      labelEN: spec.labelEN,
      lampPrimaryHex: spec.lampPrimaryHex,
      lampSecondaryHex: spec.lampSecondaryHex,
      lampWarmthHex: spec.lampWarmthHex
    };
  });

  const tsContent = [
    '// ============================================================================',
    '// AUTO-GENERATED BY scripts/slice_aapnootmies.ts (100% Strict TypeScript)',
    '// 17 Cut-Out Classic Dutch "Aap Noot Mies" (Leesplankje) WebP Alpha Figures',
    '// + 17 Dedicated Rotating 1960s Kitsch-Lamp Color-Wheel WebP Assets',
    '// ============================================================================',
    '',
    'export interface AapNootMiesFigureAsset {',
    '  word: string;',
    '  index: number;',
    '  webpUrl: string;',
    '  webpDataUri: string;',
    '  lampWebpUrl: string;',
    '  lampWebpDataUri: string;',
    '  fileUrl: string;',
    '  jpgUrl: string;',
    '  dataUri: string;',
    '  width: number;',
    '  height: number;',
    '  aspectRatio: number;',
    '  isLandscape: boolean;',
    '  labelNL: string;',
    '  labelEN: string;',
    '  lampPrimaryHex: string;',
    '  lampSecondaryHex: string;',
    '  lampWarmthHex: string;',
    '}',
    '',
    `export const AAP_NOOT_MIES_FIGURES: Record<string, AapNootMiesFigureAsset> = ${JSON.stringify(entries, null, 2)};`,
    ''
  ].join('\n');

  fs.writeFileSync(TS_OUT_FILE, tsContent, 'utf-8');
  console.log(`✅ [TypeScript Alpha WebP Slicer] Sliced ${FIGURE_SPECS.length} transparent WebP figures into ${OUT_DIR} and generated ${TS_OUT_FILE}`);
}

sliceAllFigures();
