#!/usr/bin/env python3
"""
Bundles src/App.tsx + src/aapNootMiesAssets.ts using esbuild into a standalone
self-contained HTML file (dist/rt_tutor_app.html) that runs directly in any browser
without requiring a build server.
"""

import glob
import os
import subprocess

ESBUILD_CANDIDATES = (
    glob.glob("/home/kos/.npm/_npx/*/node_modules/.bin/esbuild")
    + ["npx esbuild", "esbuild"]
)


def find_esbuild() -> str:
    for cand in ESBUILD_CANDIDATES:
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return "esbuild"


def main() -> None:
    os.makedirs("dist", exist_ok=True)
    esbuild_bin = find_esbuild()

    # Create a tiny wrapper entry that maps global window.React to ESM imports
    entry_file = "dist/_entry.tsx"
    with open(entry_file, "w", encoding="utf-8") as f:
        f.write(
            """import RTTutor from '../src/App';
const React = (window as any).React;
const ReactDOM = (window as any).ReactDOM;
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(RTTutor));
"""
        )

    shim_react = "dist/_react_shim.js"
    with open(shim_react, "w", encoding="utf-8") as f:
        f.write(
            "const R = window.React;\n"
            "export default R;\n"
            "export const { useState, useEffect, useRef, useCallback, useMemo, Fragment, createElement } = R;\n"
        )

    bundle_js = "dist/bundle.js"
    cmd = [
        esbuild_bin,
        entry_file,
        "--bundle",
        f"--outfile={bundle_js}",
        "--format=iife",
        "--target=es2020",
        "--jsx=transform",
        "--tsconfig-raw={\"compilerOptions\":{\"jsx\":\"react\"}}",
        f"--alias:react=./{shim_react}",
    ]
    subprocess.run(cmd, check=True)

    with open(bundle_js, "r", encoding="utf-8") as f:
        js_code = f.read()

    os.remove(entry_file)
    os.remove(shim_react)

    html = f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>RT Tutor — Brein-Raket & Aap-Noot-Mies Editie 🚀</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js" crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
  <style>
    html, body {{
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #f1f5f9;
      overscroll-behavior: none;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }}
  </style>
</head>
<body class="bg-slate-900 text-slate-100 overscroll-none select-none">
  <div id="root"></div>
  <script>
{js_code}
  </script>
</body>
</html>
"""
    out_html = os.path.join("dist", "rt_tutor_app.html")
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(html)

    # Also compile server/mcp_transponder.ts and scripts/playwright_exerciser.ts to dist/*.mjs
    for ts_src, mjs_out in [
        ("server/mcp_transponder.ts", "dist/mcp_transponder.mjs"),
        ("scripts/playwright_exerciser.ts", "dist/playwright_exerciser.mjs"),
    ]:
        if os.path.exists(ts_src):
            subprocess.run(
                [
                    esbuild_bin,
                    ts_src,
                    "--bundle",
                    "--platform=node",
                    "--format=esm",
                    "--target=node20",
                    f"--outfile={mjs_out}",
                ],
                check=True,
            )

    print(f"Built standalone bundle: {out_html} ({len(html) // 1024} KB) + dist/mcp_transponder.mjs")


if __name__ == "__main__":
    main()
