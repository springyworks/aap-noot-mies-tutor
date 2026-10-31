# RT Tutor: Brain-Rocket Edition 🚀

**A Real-Time Cognitive Scaffolding & Telemetry-Driven Reading Environment.**
Specifically designed for early childhood reading development and neurodivergent/dyslexia research.

## 🧠 Core Philosophy
Teaching is launching a rocket inside the brain: the brain builds a mental model, discards the noise, and retains the good models for the long term. This application facilitates that process by dynamically reducing the visual search space and guiding attention without *giving away* the answer, forcing genuine orthographic decoding.

### Strict Pedagogical Constraints:
1. **Zero-Frustration Rule:** The tutor must NEVER exhibit angry, frustrated, impatient, or disappointed emotions. Mistakes are treated with *Curiosity* or *Gentle Surprise*.
2. **Progressive Orthographic Filtering:** Hints are not binary. The app uses a left-to-right phonetic waterfall, morphing characters into subtle, harmonious European Montessori colors based on streak-throttled timers.
3. **Continuous Introspection:** The tutor can audibly and visually explain its own state (L0, L1, L2), promoting meta-cognition.

## 🛠 Features & Architecture

- **React Single-File Core Architecture:** The core app (`src/App.tsx` / `rt_tutor.tsx`) contains the full state machine, SVGs, and audio context to ensure zero-latency synchronization, paired with `src/aapNootMiesAssets.ts` for the 17 sliced Leesplankje figures.
- **Derived Hard Data Engine (2D-FFT):** Captures high-resolution `(x, y, t)` pointer/touch data and computes:
  - Kinematics (Velocity, Acceleration, RMS Jerk).
  - Spatial-Temporal 2D Fast Fourier Transform (Macro-Navigation, Scanning, Hesitation Tremor).
- **Golden Cell Hover Detection:** Calculates dwell time per cell using real-time hit-testing (`elementFromPoint`), working flawlessly on both mouse and touch interfaces.
- **Bespoke "Ligne-Claire" + Cut-Out Image SVG Engine (`CellSvgUnderlay`):** Procedurally drawn, animated SVGs that react to the `aliveness` timer and the "Golden Cell" hover state, combining cut-out vintage illustrations with self-drawing vector frames (`strokeDasharray` / `strokeDashoffset`).
- **Dutch "Aap Noot Mies" Heritage (17 Sliced Figures):** A built-in curriculum homage to Hoogeveen and Cornelis Jetses. All 17 classic figures (`aap`, `noot`, `mies`, `wim`, `zus`, `jet`, `teun`, `vuur`, `gijs`, `lam`, `kees`, `bok`, `weide`, `does`, `hok`, `duif`, `schapen`) are individually sliced from the source Leesplankje board (`public/aapnootmies/leesplankje_original.jpg`) and animated inside `<svg>` via `<clipPath>`, kinetic bobbing/swaying transforms, and self-tracing Montessori frames:
  - **🖼️ Figure Mode Switcher (`Foto+SVG` / `Foto` / `Lijn-SVG`):** Toggle between hybrid cut-out image + animated Ligne-Claire SVG overlays, pure cut-out image inside the animated SVG frame, or pure vector line-art.
  - **🪵 Interactive Leesplankje Modal (`Plankje (17)`):** View all 17 cut-out figures in their classic 3-row (`6 + 6 + 5`) layout, hear each word spoken, and launch directly into a practice round for any chosen figure.

## 📂 Clean Workspace Structure

```text
.
├── index.html                        # Vite entry HTML (with mobile touch/overscroll safeguards)
├── package.json                      # Scripts for Vite dev, standalone bundling & image slicing
├── rt_tutor.tsx                      # Root TypeScript component (synced with src/App.tsx)
├── readme_md.md / README.md          # Project documentation & AI assistant rules
├── scripts/
│   ├── slice_aapnootmies.ts          # Strict TypeScript slicer: cuts 17 figures -> public/aapnootmies/ & src/aapNootMiesAssets.ts
│   ├── build_standalone.ts           # Strict TypeScript bundler: esbuild -> dist/rt_tutor_app.html & dist/*.mjs
│   └── playwright_exerciser.ts       # Strict TypeScript Channel 2 automated MCP & UI exerciser
├── server/
│   └── mcp_transponder.ts            # Strict TypeScript Channel 1 MCP JSON-RPC 2.0 + SSE + Telemetry server (:3001)
├── public/
│   └── aapnootmies/                  # All 17 individual .png/.jpg figures, board crops & contact_sheet.png
├── src/
│   ├── App.tsx                       # Main RTTutor application component
│   ├── aapNootMiesAssets.ts          # Auto-generated 17-figure metadata + base64 data URIs
│   ├── main.tsx                      # React DOM mount entry
│   └── index.css                     # Tailwind directives & touch/overscroll safeguards
└── dist/
    ├── bundle.js                     # Compiled IIFE bundle
    └── rt_tutor_app.html             # Self-contained runnable HTML app (all 17 figures embedded)
```

## 🚀 Local Development Setup (VSCode & Antigravity)

### Option A: Instant Standalone Build (100% Strict TypeScript)
You can slice the 17 figures, compile the standalone bundle, and launch the live MCP Transponder immediately in TypeScript:
```bash
npm run slice:aapnootmies
npm run bundle:standalone
npm run transponder
# Open http://localhost:3001 in your browser or Edge DevTools
```

### Option B: Standard Vite Dev Server
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Run the Vite Dev Server:**
   ```bash
   npm run dev
   ```
3. **Re-slice Aap-Noot-Mies Figures (if updating source board image):**
   ```bash
   npm run slice:aapnootmies
   ```

## 📡 3-Channel Debugging, Playwright & MCP Transponder Architecture

The workspace includes a zero-dependency TypeScript MCP Transponder (`server/mcp_transponder.ts`) and three live debugging/exercise channels:

1. **Channel 1 — TypeScript MCP Transponder (`server/mcp_transponder.ts` / `dist/mcp_transponder.mjs`):**
   - Start the live server on `:3001`:
     ```bash
     node dist/mcp_transponder.mjs
     # or with tsx:
     npm run transponder
     ```
   - Serves the live app at `http://localhost:3001/`, streams real-time SSE commands (`GET /api/events`, `POST /api/command`), receives 2D-FFT & Golden Cell telemetry (`POST /api/telemetry`, `GET /api/state`), and exposes a full **Model Context Protocol (MCP) JSON-RPC 2.0** server over `POST /mcp` and `--stdio` (configured in `.vscode/mcp.json`).
2. **Channel 2 — Playwright & MCP Automated Exerciser (`scripts/playwright_exerciser.ts`):**
   - Exercises all MCP tools (`get_tutor_telemetry`, `send_tutor_command`, `inspect_aapnootmies_figures`, `save_telemetry_snapshot`), verifies the 17 cut-out Aap-Noot-Mies figures, tests the Zero-Frustration guardrail, and verifies synthetic 64-point 2D-FFT telemetry:
     ```bash
     node dist/playwright_exerciser.mjs
     ```
3. **Channel 3 — VS Code Microsoft Edge DevTools (`.vscode/launch.json`):**
   - Press `F5` in VS Code and choose **`🚀 All Channels: MCP Transponder + Microsoft Edge DevTools`** (or **`Channel 3: Open Embedded Edge DevTools Panel (:3001)`**) to inspect DOM/SVG animations, network telemetry, and `window.__RT_TUTOR_BRIDGE__` directly inside VS Code.

---

## 🤖 Context for Argon (VSCode AI Assistant)

**Hello Argon!** If you are reading this, you are assisting with the ongoing development of the RT Tutor. Please adhere to the following strict architectural and pedagogical rules when generating or modifying code for this user:

1. **Strict Typings:** The top of `src/App.tsx` / `rt_tutor.tsx` contains complex interfaces (`DerivedHardData`, `TutorEmotion`, etc.). Do not alter the FFT mathematical logic unless specifically requested. 
2. **The "No Angry Tutor" Mandate:** The `TutorEmotion` type has 18 distinct states. You are strictly forbidden from adding emotions like 'ANGRY', 'SAD', 'DISAPPOINTED', or 'FRUSTRATED'. Fallback to 'CURIOUS' or 'GENTLE_SURPRISE' on user errors.
3. **SVG Generation & Cut-Out Figures:** The user relies on bespoke inline SVGs using a "Ligne-Claire" (Clear Line) aesthetic combined with the 17 sliced Aap-Noot-Mies figures (`AAP_NOOT_MIES_FIGURES` in `src/aapNootMiesAssets.ts`). When adding or modifying SVGs in `CellSvgUnderlay`, use `strokeDasharray` and `strokeDashoffset` bound to `drawProgress` / `aliveness` props so frames and lines "draw themselves" over time around the animated figure `<image>`.
4. **Colors:** Stick strictly to the European Montessori muted palette provided in the file (`EURO_RGB` / `EUROPEAN_HEX`). Do not use loud, neon, or "Mickey Mouse" primary colors.
5. **Code Structure & Strict TypeScript Only:** All project code, servers, slicers, and bundlers must be written in **100% strict TypeScript** (no Python scripts in the repo). Keep `src/App.tsx` and `rt_tutor.tsx` synchronized, and run `npm run bundle:standalone` (`scripts/build_standalone.ts`) after edits so `dist/rt_tutor_app.html` stays up to date. Ensure mobile-safeguards (`overscroll-none`, `touch-action: manipulation`) are preserved in the CSS/HTML wrappers.
