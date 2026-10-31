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
  // Row 1 (6 figures) — Trim 4px inner wooden frame so no straight borders remain
  { word: 'aap',     left: 8,    top: 67,  right: 161,  bottom: 213, labelNL: 'Aap op het dak',             labelEN: 'Monkey on perch',           lampPrimaryHex: '#d97706', lampSecondaryHex: '#7eaba0', lampWarmthHex: '#f59e0b' },
  { word: 'noot',    left: 204,  top: 67,  right: 367,  bottom: 213, labelNL: 'Walnoot op tafel',           labelEN: 'Walnut on table',           lampPrimaryHex: '#b45309', lampSecondaryHex: '#689d99', lampWarmthHex: '#f3c663' },
  { word: 'mies',    left: 410,  top: 67,  right: 573,  bottom: 213, labelNL: 'Poes Mies bij de schutting', labelEN: 'Cat Mies by fence',         lampPrimaryHex: '#e07a5f', lampSecondaryHex: '#81b29a', lampWarmthHex: '#f2cc8f' },
  { word: 'wim',     left: 616,  top: 67,  right: 779,  bottom: 213, labelNL: 'Wim speelt met blokken',     labelEN: 'Wim playing with blocks',   lampPrimaryHex: '#6d9dc5', lampSecondaryHex: '#e07a5f', lampWarmthHex: '#f4a261' },
  { word: 'zus',     left: 822,  top: 67,  right: 985,  bottom: 213, labelNL: 'Zus in de kinderstoel',      labelEN: 'Sister Zus in highchair',   lampPrimaryHex: '#c48d84', lampSecondaryHex: '#d4b483', lampWarmthHex: '#f59e0b' },
  { word: 'jet',     left: 1030, top: 67,  right: 1190, bottom: 213, labelNL: 'Jet kleedt haar pop aan',    labelEN: 'Jet dressing her doll',     lampPrimaryHex: '#d97706', lampSecondaryHex: '#c48d84', lampWarmthHex: '#fde68a' },
  // Row 2 (6 figures)
  { word: 'teun',    left: 8,    top: 335, right: 161,  bottom: 484, labelNL: 'Oude Teun met hoed en stok', labelEN: 'Old Teun with hat and cane',lampPrimaryHex: '#7eaba0', lampSecondaryHex: '#d4b483', lampWarmthHex: '#f3c663' },
  { word: 'vuur',    left: 204,  top: 335, right: 367,  bottom: 484, labelNL: 'Brandende vuurkorf',         labelEN: 'Burning fire brazier',      lampPrimaryHex: '#ea580c', lampSecondaryHex: '#f59e0b', lampWarmthHex: '#fef08a' },
  { word: 'gijs',    left: 410,  top: 335, right: 573,  bottom: 484, labelNL: 'Gijs met de schop',          labelEN: 'Gijs with shovel',          lampPrimaryHex: '#5b8ea3', lampSecondaryHex: '#d4b483', lampWarmthHex: '#f59e0b' },
  { word: 'lam',     left: 616,  top: 335, right: 779,  bottom: 484, labelNL: 'Wit lammetje in de wei',     labelEN: 'White lamb in meadow',      lampPrimaryHex: '#84a98c', lampSecondaryHex: '#f2cc8f', lampWarmthHex: '#fef3c7' },
  { word: 'kees',    left: 822,  top: 335, right: 985,  bottom: 484, labelNL: 'Witte keeshond Kees',        labelEN: 'White spitz dog Kees',      lampPrimaryHex: '#d4a373', lampSecondaryHex: '#7eaba0', lampWarmthHex: '#fde68a' },
  { word: 'bok',     left: 1030, top: 335, right: 1190, bottom: 484, labelNL: 'Bok voor de bokkenwagen',    labelEN: 'Billy goat pulling cart',   lampPrimaryHex: '#81b29a', lampSecondaryHex: '#e07a5f', lampWarmthHex: '#f2cc8f' },
  // Row 3 (5 figures; weide & schapen are wide landscape panels)
  { word: 'weide',   left: 8,    top: 602, right: 262,  bottom: 748, labelNL: 'Hollandse weide met koe',    labelEN: 'Dutch meadow with cow',     lampPrimaryHex: '#74a892', lampSecondaryHex: '#e5c185', lampWarmthHex: '#fbf2c4' },
  { word: 'does',    left: 309,  top: 602, right: 471,  bottom: 748, labelNL: 'Zwarte poedel Does',         labelEN: 'Black poodle Does',         lampPrimaryHex: '#c98a5b', lampSecondaryHex: '#7eaba0', lampWarmthHex: '#f3c663' },
  { word: 'hok',     left: 514,  top: 602, right: 676,  bottom: 748, labelNL: 'Groen dierenhok',            labelEN: 'Green animal house',        lampPrimaryHex: '#6b9080', lampSecondaryHex: '#d4a373', lampWarmthHex: '#f59e0b' },
  { word: 'duif',    left: 720,  top: 602, right: 884,  bottom: 748, labelNL: 'Duif op de dakpannen',       labelEN: 'Pigeon on roof tiles',      lampPrimaryHex: '#6d9dc5', lampSecondaryHex: '#e07a5f', lampWarmthHex: '#fde68a' },
  { word: 'schapen', left: 930,  top: 602, right: 1190, bottom: 748, labelNL: 'Kudde schapen onder boom',   labelEN: 'Flock of sheep under tree', lampPrimaryHex: '#81b29a', lampSecondaryHex: '#d4b483', lampWarmthHex: '#f2cc8f' }
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
      const centerProtect = 1.0 - smoothstep(0.18, 0.78, ellDist);

      // Background similarity factor (high when pixel matches perimeter sky/wall and is light/low-sat)
      const bgMatch = (1.0 - smoothstep(14, 58, minBgDist)) * smoothstep(0.42, 0.82, lum) * (1.0 - sat * 0.55);

      // Allow 1960s motion-lamp glow to shine through background sky/wall (alpha ~0.28..0.55)
      // while keeping character foreground lines and colors at 0.92..1.0!
      const backdropTranslucency = 1.0 - bgMatch * (0.72 - centerProtect * 0.42);

      // Slight warm vintage color grading lift on midtones
      const finalAlpha = Math.round(Math.max(0, Math.min(1, edgeAlpha * backdropTranslucency)) * 255);
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
