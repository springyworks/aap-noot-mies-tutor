#!/usr/bin/env node
/**
 * ============================================================================
 * STRICT TYPESCRIPT AAP-NOOT-MIES SLICER (scripts/slice_aapnootmies.ts)
 * ============================================================================
 * Slices the 17 classic Dutch Hoogeveen / Cornelis Jetses "Leesplankje" figures
 * from public/aapnootmies/leesplankje_original.jpg into individual .png & .jpg
 * assets using ffmpeg and generates src/aapNootMiesAssets.ts with strict types.
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
}

export interface AapNootMiesFigureAsset {
  readonly word: string;
  readonly index: number;
  readonly fileUrl: string;
  readonly jpgUrl: string;
  readonly dataUri: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly isLandscape: boolean;
  readonly labelNL: string;
  readonly labelEN: string;
}

const FIGURE_SPECS: readonly FigureCropSpec[] = [
  // Row 1 (6 figures)
  { word: 'aap',     left: 4,    top: 63,  right: 165,  bottom: 217, labelNL: 'Aap op het dak',             labelEN: 'Monkey on perch' },
  { word: 'noot',    left: 200,  top: 63,  right: 371,  bottom: 217, labelNL: 'Walnoot op tafel',           labelEN: 'Walnut on table' },
  { word: 'mies',    left: 406,  top: 63,  right: 577,  bottom: 217, labelNL: 'Poes Mies bij de schutting', labelEN: 'Cat Mies by fence' },
  { word: 'wim',     left: 612,  top: 63,  right: 783,  bottom: 217, labelNL: 'Wim speelt met blokken',     labelEN: 'Wim playing with blocks' },
  { word: 'zus',     left: 818,  top: 63,  right: 989,  bottom: 217, labelNL: 'Zus in de kinderstoel',      labelEN: 'Sister Zus in highchair' },
  { word: 'jet',     left: 1026, top: 63,  right: 1194, bottom: 217, labelNL: 'Jet kleedt haar pop aan',    labelEN: 'Jet dressing her doll' },
  // Row 2 (6 figures)
  { word: 'teun',    left: 4,    top: 331, right: 165,  bottom: 488, labelNL: 'Oude Teun met hoed en stok', labelEN: 'Old Teun with hat and cane' },
  { word: 'vuur',    left: 200,  top: 331, right: 371,  bottom: 488, labelNL: 'Brandende vuurkorf',         labelEN: 'Burning fire brazier' },
  { word: 'gijs',    left: 406,  top: 331, right: 577,  bottom: 488, labelNL: 'Gijs met de schop',          labelEN: 'Gijs with shovel' },
  { word: 'lam',     left: 612,  top: 331, right: 783,  bottom: 488, labelNL: 'Wit lammetje in de wei',     labelEN: 'White lamb in meadow' },
  { word: 'kees',    left: 818,  top: 331, right: 989,  bottom: 488, labelNL: 'Witte keeshond Kees',        labelEN: 'White spitz dog Kees' },
  { word: 'bok',     left: 1026, top: 331, right: 1194, bottom: 488, labelNL: 'Bok voor de bokkenwagen',    labelEN: 'Billy goat pulling cart' },
  // Row 3 (5 figures; weide & schapen are wide landscape panels)
  { word: 'weide',   left: 4,    top: 598, right: 266,  bottom: 752, labelNL: 'Hollandse weide met koe',    labelEN: 'Dutch meadow with cow' },
  { word: 'does',    left: 305,  top: 598, right: 475,  bottom: 752, labelNL: 'Zwarte poedel Does',         labelEN: 'Black poodle Does' },
  { word: 'hok',     left: 510,  top: 598, right: 680,  bottom: 752, labelNL: 'Groen dierenhok',            labelEN: 'Green animal house' },
  { word: 'duif',    left: 716,  top: 598, right: 888,  bottom: 752, labelNL: 'Duif op de dakpannen',       labelEN: 'Pigeon on roof tiles' },
  { word: 'schapen', left: 926,  top: 598, right: 1194, bottom: 752, labelNL: 'Kudde schapen onder boom',   labelEN: 'Flock of sheep under tree' }
];

const WORKSPACE_ROOT: string = process.cwd();
const OUT_DIR: string = path.join(WORKSPACE_ROOT, 'public', 'aapnootmies');
const TS_OUT_FILE: string = path.join(WORKSPACE_ROOT, 'src', 'aapNootMiesAssets.ts');

function cropWithFfmpeg(srcImage: string, outPath: string, x: number, y: number, w: number, h: number): void {
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', srcImage, '-vf', `crop=${w}:${h}:${x}:${y}`, '-frames:v', '1', outPath],
    { stdio: 'inherit' }
  );
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

    cropWithFfmpeg(srcImage, pngPath, spec.left, spec.top, w, h);
    cropWithFfmpeg(srcImage, jpgPath, spec.left, spec.top, w, h);

    const jpgBytes = fs.readFileSync(jpgPath);
    const dataUri = `data:image/jpeg;base64,${jpgBytes.toString('base64')}`;

    entries[spec.word] = {
      word: spec.word,
      index: idx + 1,
      fileUrl: `/aapnootmies/${spec.word}.png`,
      jpgUrl: `/aapnootmies/${spec.word}.jpg`,
      dataUri,
      width: w,
      height: h,
      aspectRatio: Number((w / h).toFixed(3)),
      isLandscape: w > h * 1.3,
      labelNL: spec.labelNL,
      labelEN: spec.labelEN
    };
  });

  const tsContent = [
    '// ============================================================================',
    '// AUTO-GENERATED BY scripts/slice_aapnootmies.ts (100% Strict TypeScript)',
    '// 17 Cut-Out Classic Dutch "Aap Noot Mies" (Leesplankje) Figure Assets',
    '// ============================================================================',
    '',
    'export interface AapNootMiesFigureAsset {',
    '  word: string;',
    '  index: number;',
    '  fileUrl: string;',
    '  jpgUrl: string;',
    '  dataUri: string;',
    '  width: number;',
    '  height: number;',
    '  aspectRatio: number;',
    '  isLandscape: boolean;',
    '  labelNL: string;',
    '  labelEN: string;',
    '}',
    '',
    `export const AAP_NOOT_MIES_FIGURES: Record<string, AapNootMiesFigureAsset> = ${JSON.stringify(entries, null, 2)};`,
    ''
  ].join('\n');

  fs.writeFileSync(TS_OUT_FILE, tsContent, 'utf-8');
  console.log(`✅ [TypeScript Slicer] Sliced ${FIGURE_SPECS.length} figures into ${OUT_DIR} and generated ${TS_OUT_FILE}`);
}

sliceAllFigures();
