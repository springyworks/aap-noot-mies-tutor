---
description: Core architectural, pedagogical, and live verification rules for RT Tutor: Brain-Rocket & Aap-Noot-Mies Edition
---

# RT Tutor: Brain-Rocket & Aap-Noot-Mies Context Rules

1. **100% Strict TypeScript Only (NO Python):**
   - Never use Python (`python3`) for image slicing, bundling, or testing. Use strict TypeScript (`scripts/slice_aapnootmies.ts`, `scripts/build_standalone.ts`, `server/mcp_transponder.ts`, `scripts/playwright_exerciser.ts`) and keep `src/App.tsx` and `rt_tutor.tsx` synchronized.

2. **Alpha-Channel WebP Figures + Subtle 1960s Motion-Lamp SVG Effect:**
   - All 17 classic Dutch Hoogeveen / Cornelis Jetses *Leesplankje* characters (`aap`, `noot`, `mies`, `wim`, `zus`, `jet`, `teun`, `vuur`, `gijs`, `lam`, `kees`, `bok`, `weide`, `does`, `hok`, `duif`, `schapen`) must be generated as **transparent alpha-channel WebP** assets (`public/aapnootmies/*.webp` & `webpDataUri` in `src/aapNootMiesAssets.ts`).
   - Behind each WebP figure inside `CellSvgUnderlay`, render a subtle **1960s Motion-Lamp (liquid thermal oil/wax lamp)** underlay (`lampPrimaryHex`, `lampSecondaryHex`, `lampWarmthHex` radial blobs rising and morphing gently) so the warm 1960s glow shines through the WebP alpha matte while Ligne-Claire `strokeDasharray`/`strokeDashoffset` frames draw around them.

3. **Zero-Frustration ("No Angry Tutor"), Sweet Motherly Voice & Calm Canvas (No Obtrusive Rocket Popups):**
   - Never add negative emotions (`ANGRY`, `SAD`, `DISAPPOINTED`, `FRUSTRATED`) to `TutorEmotion`. Strictly keep the 18 positive states and preserve the 64-point 2D-FFT math in `computeDerivedHardData`.
   - **No Obtrusive Flying Rockets:** Never show a bouncing/ascending rocket overlay (`rocketFlight`) or laser lines across the reading board — keep the canvas calm, warm, and focused on the *Leesplankje* figures and letters.
   - **Natural Sweet Motherly Voice (Not Slow/"Zeikerig"):** Keep TTS `rate` around `0.98–1.04` (never slow `0.75–0.82` which sounds dragged-out/"zeikerig") with a warm, affectionate motherly tone (`pitch ~1.04–1.08`, preferring natural female Dutch voices like Fenna, Colette, Laura, Lotte, or Google Nederlands, and warm phrases like *"Goed zo lieverd, dat heb je mooi gezien!"*).

4. **`Ctrl+Shift+Alt+G` Drill-Through Context & External AI Dynamic Learning Augmentation:**
   - Maintain `Ctrl+Shift+Alt+G` (and the top-bar `🎯 Ctrl+Shift+Alt+G` button) to capture multi-precision timestamps, DOM layer stack (`elementsFromPoint`), 2D-FFT snapshot, and AI flow diagnosis (`FLOW_MASTERY`, `ACTIVE_DECODING`, `HESITATION_SCAFFOLD_NEEDED`, `IDLE_STANDBY`), auto-copying to clipboard and buffering in the MCP server (`POST /api/drill-through`, `get_drill_through_buffer`, `augment_learning_play`).

5. **Show Open Page & Exercise Live with Headed ("Show-It-All") Playwright:**
   - Always show the human developer an open interactive page in action AND exercise it with headed Playwright Chromium (`node dist/playwright_exerciser.mjs` / `scripts/playwright_exerciser.ts`).

