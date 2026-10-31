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

function cropWithFfmpeg(srcImage: string, outPath: string, x: number, y: number, w: number, h: number): void {
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', srcImage, '-vf', `crop=${w}:${h}:${x}:${y}`, '-frames:v', '1', outPath],
    { stdio: 'inherit' }
  );
}

/**
 * Extracts raw RGBA pixels from the cropped PNG, computes a continuous 1960s
 * cut-out alpha matte (combining a feathered squircle-oval silhouette with
 * adaptive backdrop/sky translucency so the 1960s motion-lamp lava blobs
 * glow softly behind the character while keeping the subject crisp), and
 * encodes a true RGBA WebP (`yuva420p` / `libwebp`).
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

  // Sample perimeter/upper-corner backdrop colors to identify the painted sky/wall tone
  const bgSamples: Array<[number, number, number]> = [];
  for (let x = 6; x < width - 6; x += 8) {
    for (const y of [4, 8, 14]) {
      const idx = (y * width + x) * 4;
      bgSamples.push([rgbaBuf[idx], rgbaBuf[idx + 1], rgbaBuf[idx + 2]]);
    }
  }
  for (let y = 10; y < Math.floor(height * 0.65); y += 10) {
    for (const x of [4, 8, width - 9, width - 5]) {
      const idx = (y * width + x) * 4;
      bgSamples.push([rgbaBuf[idx], rgbaBuf[idx + 1], rgbaBuf[idx + 2]]);
    }
  }

  for (let y = 0; y < height; y++) {
    // Normalized coordinates in [-1, 1]
    const ny = (y - height * 0.5) / (height * 0.5);
    for (let x = 0; x < width; x++) {
      const nx = (x - width * 0.5) / (width * 0.5);
      const idx = (y * width + x) * 4;
      const r = rgbaBuf[idx];
      const g = rgbaBuf[idx + 1];
      const b = rgbaBuf[idx + 2];

      // 1. Feathered Squircle-Oval Vignette (eliminates hard rectangular box edges)
      const ellDist = Math.sqrt(nx * nx * 0.92 + ny * ny * 0.96);
      const sqDist = Math.pow(Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2), 1 / 3.2);
      const radialDist = ellDist * 0.65 + sqDist * 0.35;
      // Alpha goes from 1.0 inside r<=0.74 smoothly down to 0.0 at r>=0.98
      const edgeAlpha = 1.0 - smoothstep(0.72, 0.98, radialDist);

      // 2. Backdrop / Sky / Parchment Translucency Matte
      // Measure minimum color distance to sampled perimeter background palette
      let minBgDist = 999;
      for (let s = 0; s < bgSamples.length; s++) {
        const [br, bg, bb] = bgSamples[s];
        const dr = r - br;
        const dg = g - bg;
        const db = b - bb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < minBgDist) minBgDist = dist;
      }

      // Compute pixel luminance & saturation to protect dark outlines and rich character colors
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      // Center subject protection (center of illustration stays solid & vibrant)
      const centerProtect = 1.0 - smoothstep(0.14, 0.72, ellDist);

      // High-contrast background similarity factor:
      // Pale / low-saturation sky & parchment wall pixels become strongly translucent (alpha 0.08..0.30)
      // so the 1960s kitsch motion-lamp backdrop colors glow vibrantly through them,
      // while character ink lines and saturated colors stay crisp & opaque (alpha 0.95..1.0)!
      const bgColorSimilarity = 1.0 - smoothstep(10, 68, minBgDist);
      const isPaleBackdrop = smoothstep(0.46, 0.80, lum) * (1.0 - smoothstep(0.12, 0.48, sat));
      const bgMatch = Math.max(bgColorSimilarity * smoothstep(0.38, 0.78, lum) * (1.0 - sat * 0.65), isPaleBackdrop * 0.85);

      const rawBackdropAlpha = 1.0 - bgMatch * (0.90 - centerProtect * 0.36);
      // Apply steep S-curve alpha contrast so foreground pops and backdrop lets the kitsch lamp shine through
      const highContrastAlpha = smoothstep(0.12, 0.84, rawBackdropAlpha);

      // Boost color saturation (+42%) and warm midtone contrast on foreground character pixels
      const fgStrength = smoothstep(0.25, 0.85, highContrastAlpha);
      const satBoost = 1.0 + 0.44 * fgStrength;
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      let nr = gray + (r - gray) * satBoost;
      let ng = gray + (g - gray) * satBoost;
      let nb = gray + (b - gray) * satBoost;

      // Subtle S-curve contrast around mid-luminance (128) for richer pigment depth
      const contrast = 1.0 + 0.16 * fgStrength;
      nr = (nr - 128) * contrast + 128;
      ng = (ng - 128) * contrast + 128;
      nb = (nb - 128) * contrast + 128;

      rgbaBuf[idx] = Math.max(0, Math.min(255, Math.round(nr)));
      rgbaBuf[idx + 1] = Math.max(0, Math.min(255, Math.round(ng)));
      rgbaBuf[idx + 2] = Math.max(0, Math.min(255, Math.round(nb)));

      const finalAlpha = Math.round(Math.max(0, Math.min(1, edgeAlpha * highContrastAlpha)) * 255);
      rgbaBuf[idx + 3] = finalAlpha;
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

    cropWithFfmpeg(srcImage, pngPath, spec.left, spec.top, w, h);
    cropWithFfmpeg(srcImage, jpgPath, spec.left, spec.top, w, h);

    const { width, height, webpBytes } = buildAlphaWebpFromPng(pngPath, webpPath);
    const webpDataUri = `data:image/webp;base64,${webpBytes.toString('base64')}`;

    const jpgBytes = fs.readFileSync(jpgPath);
    const jpgDataUri = `data:image/jpeg;base64,${jpgBytes.toString('base64')}`;

    entries[spec.word] = {
      word: spec.word,
      index: idx + 1,
      webpUrl: `/aapnootmies/${spec.word}.webp`,
      webpDataUri,
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
    '// with 1960s Motion-Lamp Palette Metadata',
    '// ============================================================================',
    '',
    'export interface AapNootMiesFigureAsset {',
    '  word: string;',
    '  index: number;',
    '  webpUrl: string;',
    '  webpDataUri: string;',
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
