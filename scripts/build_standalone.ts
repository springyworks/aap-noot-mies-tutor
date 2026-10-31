#!/usr/bin/env node
/**
 * ============================================================================
 * STRICT TYPESCRIPT STANDALONE BUNDLER (scripts/build_standalone.ts)
 * ============================================================================
 * Bundles src/App.tsx + src/aapNootMiesAssets.ts + server/mcp_transponder.ts
 * + scripts/playwright_exerciser.ts using esbuild into dist/ without Python.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

interface BuildTarget {
  readonly inputPath: string;
  readonly outputPath: string;
}

const WORKSPACE_ROOT: string = process.cwd();
const DIST_DIR: string = path.join(WORKSPACE_ROOT, 'dist');

function findEsbuildBinary(): string {
  const npxRoot = '/home/kos/.npm/_npx';
  if (fs.existsSync(npxRoot)) {
    const entries = fs.readdirSync(npxRoot);
    for (const dir of entries) {
      const candidate = path.join(npxRoot, dir, 'node_modules', '.bin', 'esbuild');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return 'esbuild';
}

function buildStandaloneApp(esbuildBin: string): void {
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const entryFile = path.join(DIST_DIR, '_entry.tsx');
  const shimReact = path.join(DIST_DIR, '_react_shim.js');
  const bundleJs = path.join(DIST_DIR, 'bundle.js');

  fs.writeFileSync(
    entryFile,
    [
      "import RTTutor from '../src/App';",
      'const win = window as unknown as { React: typeof import("react"); ReactDOM: { createRoot: (el: HTMLElement | null) => { render: (node: unknown) => void } } };',
      "const root = win.ReactDOM.createRoot(document.getElementById('root'));",
      'root.render(win.React.createElement(RTTutor));',
      ''
    ].join('\n'),
    'utf-8'
  );

  fs.writeFileSync(
    shimReact,
    [
      'const R = window.React;',
      'export default R;',
      'export const { useState, useEffect, useRef, useCallback, useMemo, Fragment, createElement } = R;',
      ''
    ].join('\n'),
    'utf-8'
  );

  execFileSync(
    esbuildBin,
    [
      entryFile,
      '--bundle',
      `--outfile=${bundleJs}`,
      '--format=iife',
      '--target=es2020',
      '--jsx=transform',
      '--tsconfig-raw={"compilerOptions":{"jsx":"react","strict":true}}',
      `--alias:react=${shimReact}`
    ],
    { stdio: 'inherit' }
  );

  const jsCode = fs.readFileSync(bundleJs, 'utf-8');
  fs.unlinkSync(entryFile);
  fs.unlinkSync(shimReact);

  const faviconDataUri = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='40%25' r='60%25'%3E%3Cstop offset='0%25' stop-color='%233b0764'/%3E%3Cstop offset='55%25' stop-color='%23130524'/%3E%3Cstop offset='100%25' stop-color='%2305020a'/%3E%3C/radialGradient%3E%3ClinearGradient id='p' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f0abfc'/%3E%3Cstop offset='45%25' stop-color='%23c084fc'/%3E%3Cstop offset='100%25' stop-color='%237c3aed'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='2' y='2' width='60' height='60' rx='15' fill='url(%23g)' stroke='%23a855f7' stroke-width='3.5'/%3E%3Ccircle cx='32' cy='30' r='19' fill='none' stroke='%239333ea' stroke-opacity='0.4' stroke-width='2' stroke-dasharray='5 4'/%3E%3Cpath d='M 22 13 C 22 9, 42 9, 42 13' fill='none' stroke='%23e879f9' stroke-width='2.5' stroke-linecap='round'/%3E%3Cpath d='M 32 14 L 47 50 L 39.5 50 L 36.2 41 L 27.8 41 L 24.5 50 L 17 50 Z M 32 23.5 L 29.3 35.5 L 34.7 35.5 Z' fill='url(%23p)'/%3E%3Ccircle cx='32' cy='11' r='2.6' fill='%23f5d0fe'/%3E%3C/svg%3E";

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>RT Tutor — Brein-Raket & Aap-Noot-Mies Editie 🚀</title>
  <link rel="icon" type="image/svg+xml" href="${faviconDataUri}" />
  <link rel="shortcut icon" href="favicon.ico" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js" crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #f1f5f9;
      overscroll-behavior: none;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 overscroll-none select-none">
  <div id="root"></div>
  <script>
${jsCode}
  </script>
</body>
</html>
`;

  const outHtml = path.join(DIST_DIR, 'rt_tutor_app.html');
  fs.writeFileSync(outHtml, html, 'utf-8');

  // Also write to docs/index.html + docs/.nojekyll + purple-on-black favicon.ico/svg for direct GitHub Pages & localhost hosting!
  const docsDir = path.join(WORKSPACE_ROOT, 'docs');
  const pubDir = path.join(WORKSPACE_ROOT, 'public');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(pubDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'index.html'), html, 'utf-8');
  fs.writeFileSync(path.join(docsDir, '.nojekyll'), '', 'utf-8');

  // Generate 64x64 Purple-on-Black favicon.ico using pure TypeScript RGBA + ffmpeg
  const icoSize = 64;
  const icoRgba = Buffer.alloc(icoSize * icoSize * 4);
  for (let y = 0; y < icoSize; y++) {
    const ny = (y - 32) / 32;
    for (let x = 0; x < icoSize; x++) {
      const nx = (x - 32) / 32;
      const pIdx = (y * icoSize + x) * 4;
      const maxAbs = Math.max(Math.abs(nx), Math.abs(ny));
      const sqDist = Math.pow(Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4), 0.25);
      if (sqDist > 0.96) {
        icoRgba[pIdx + 3] = 0;
        continue;
      }
      // Obsidian black core with deep violet radial glow
      const rDist = Math.hypot(nx, ny + 0.1);
      let r = Math.round(8 + Math.max(0, 1 - rDist) * 48);
      let g = Math.round(3 + Math.max(0, 1 - rDist) * 8);
      let b = Math.round(16 + Math.max(0, 1 - rDist) * 88);

      // Electric purple border rim
      if (sqDist > 0.84) {
        r = 192;
        g = 84;
        b = 252;
      }

      // Bold Purple-on-Black "A" Monogram + Spark in center
      const ay = (y - 14) / 36; // 0 at y=14 (apex), 1 at y=50 (base)
      const ax = (x - 32) / 15; // -1..1 at base
      const inOuterTriangle = ay >= 0 && ay <= 1 && Math.abs(ax) <= ay * 0.95 + 0.12;
      const inInnerHole = ay >= 0.28 && ay <= 0.62 && Math.abs(ax) <= (ay - 0.22) * 0.48;
      const inBelowCrossbar = ay > 0.74 && ay <= 1.0 && Math.abs(ax) <= (ay - 0.15) * 0.52;
      const inSpark = Math.hypot(x - 32, y - 10) <= 3.0;

      if (inSpark || (inOuterTriangle && !inInnerHole && !inBelowCrossbar)) {
        r = Math.min(255, Math.round(235 - ay * 65));
        g = Math.min(255, Math.round(160 - ay * 85));
        b = 252;
      } else if (maxAbs < 0.75 && Math.abs(Math.hypot(x - 32, y - 32) - 20) < 1.3) {
        // Subtle purple halo ring
        r = Math.min(255, r + 90);
        g = Math.min(255, g + 30);
        b = Math.min(255, b + 140);
      }

      icoRgba[pIdx] = r;
      icoRgba[pIdx + 1] = g;
      icoRgba[pIdx + 2] = b;
      icoRgba[pIdx + 3] = 255;
    }
  }

  const pubIcoPath = path.join(pubDir, 'favicon.ico');
  execFileSync(
    'ffmpeg',
    ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '64x64', '-i', '-', pubIcoPath],
    { input: icoRgba }
  );
  fs.copyFileSync(pubIcoPath, path.join(DIST_DIR, 'favicon.ico'));
  fs.copyFileSync(pubIcoPath, path.join(docsDir, 'favicon.ico'));
  if (fs.existsSync(path.join(pubDir, 'favicon.svg'))) {
    fs.copyFileSync(path.join(pubDir, 'favicon.svg'), path.join(docsDir, 'favicon.svg'));
    fs.copyFileSync(path.join(pubDir, 'favicon.svg'), path.join(DIST_DIR, 'favicon.svg'));
  }

  const nodeTargets: readonly BuildTarget[] = [
    { inputPath: 'server/mcp_transponder.ts', outputPath: 'dist/mcp_transponder.mjs' },
    { inputPath: 'scripts/playwright_exerciser.ts', outputPath: 'dist/playwright_exerciser.mjs' }
  ];

  for (const target of nodeTargets) {
    const absIn = path.join(WORKSPACE_ROOT, target.inputPath);
    const absOut = path.join(WORKSPACE_ROOT, target.outputPath);
    if (fs.existsSync(absIn)) {
      execFileSync(
        esbuildBin,
        [
          absIn,
          '--bundle',
          '--platform=node',
          '--format=esm',
          '--target=node20',
          `--outfile=${absOut}`
        ],
        { stdio: 'inherit' }
      );
    }
  }

  console.log(
    `✅ [TypeScript Builder] Built ${outHtml} (${Math.round(html.length / 1024)} KB) + Node ESM modules in dist/`
  );
}

buildStandaloneApp(findEsbuildBinary());

