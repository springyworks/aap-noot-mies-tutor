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

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>RT Tutor — Brein-Raket & Aap-Noot-Mies Editie 🚀</title>
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
