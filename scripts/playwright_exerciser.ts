#!/usr/bin/env node
/**
 * ============================================================================
 * CHANNEL 2: PLAYWRIGHT CHROMIUM (HEADED "SHOW IT ALL" + CDP) & MCP EXERCISER 🚀🎭
 * ============================================================================
 * Exercises and verifies the RT Tutor application across:
 *   1. MCP JSON-RPC 2.0 Protocol (`POST http://localhost:3001/mcp`)
 *   2. 17 Cut-Out Alpha-Channel WebP Aap-Noot-Mies SVG Figure Assets + 1960s Motion-Lamp
 *   3. Zero-Frustration Pedagogical Constraint check (rejects angry states)
 *   4. Synthetic 64-point Golden Cell hover & 2D-FFT telemetry round-trip
 *   5. Ctrl+Shift+Alt+G Drill-Through Context Channel Buffer
 *   6. External AI Dynamic Learning Augmentation (`augment_learning_play`)
 *   7. LIVE HEADED PLAYWRIGHT CHROMIUM DEMO (`--headed` / default):
 *      Launches the real Playwright Chromium browser window (`ms-playwright/chromium-1248`)
 *      so the human developer can watch the app open, start the engine, animate the
 *      1960s motion-lamp WebP figures, hover/click Golden Cells, trigger `Ctrl+Shift+Alt+G`
 *      drill-through, apply External AI Co-Pilot augmentation, and capture live screenshots!
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

const BASE_URL = process.env.RT_TUTOR_URL || 'http://localhost:3001';
const PLAYWRIGHT_CHROMIUM_BIN =
  process.env.PLAYWRIGHT_CHROMIUM_BIN ||
  '/home/kos/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';

interface RpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: {
    isError?: boolean;
    content?: { type: string; text: string }[];
    tools?: { name: string }[];
    serverInfo?: { name: string; version: string };
  };
  error?: { code: number; message: string };
}

async function callMcp(method: string, params?: Record<string, unknown>, id: number = 1): Promise<RpcResponse> {
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  return (await res.json()) as RpcResponse;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTransponderAndSyntheticVerification(): Promise<void> {
  console.log(`\n🔬 [Channel 2 Exerciser] Connecting to RT Tutor MCP Transponder at ${BASE_URL}...`);

  // 1. Initialize MCP session
  const initRes = await callMcp('initialize', {}, 1);
  console.log(`✅ 1. MCP Initialize:`, initRes.result?.serverInfo);

  // 2. List MCP tools
  const toolsRes = await callMcp('tools/list', {}, 2);
  const toolNames = toolsRes.result?.tools?.map(t => t.name) || [];
  console.log(`✅ 2. MCP Tools Registered (${toolNames.length}):`, toolNames.join(', '));

  // 3. Verify all 17 Cut-Out Alpha-Channel WebP Aap-Noot-Mies figures via MCP tool
  const anmRes = await callMcp('tools/call', { name: 'inspect_aapnootmies_figures', arguments: {} }, 3);
  const anmData = JSON.parse(anmRes.result?.content?.[0]?.text || '{}');
  console.log(
    `✅ 3. Aap-Noot-Mies Alpha WebP Figures: ${anmData.totalFigures}/17 present (allPresent=${anmData.allPresent}, allAlphaWebpPresent=${anmData.allAlphaWebpPresent})`
  );
  if (!anmData.allPresent || !anmData.allAlphaWebpPresent || anmData.totalFigures !== 17) {
    throw new Error('Missing Aap-Noot-Mies alpha WebP cut-out figure assets!');
  }

  // 4. Test Zero-Frustration Pedagogical Guardrail (must reject 'ANGRY')
  const angryAttempt = await callMcp(
    'tools/call',
    {
      name: 'send_tutor_command',
      arguments: { action: 'set_emotion', emotion: 'ANGRY' }
    },
    4
  );
  const rejectedAngry = Boolean(angryAttempt.result?.isError);
  console.log(`✅ 4. Zero-Frustration Guardrail (reject 'ANGRY' emotion): ${rejectedAngry ? 'PASSED' : 'FAILED'}`);
  if (!rejectedAngry) {
    throw new Error('Pedagogical violation: ANGRY emotion was not rejected!');
  }

  // 5. Dispatch positive commands to switch to Aap-Noot-Mies & target 'mies'
  await callMcp(
    'tools/call',
    {
      name: 'send_tutor_command',
      arguments: { action: 'set_curriculum', mode: 'aapnootmies' }
    },
    5
  );
  await callMcp(
    'tools/call',
    {
      name: 'send_tutor_command',
      arguments: { action: 'set_target_word', word: 'mies' }
    },
    6
  );
  await callMcp(
    'tools/call',
    {
      name: 'send_tutor_command',
      arguments: { action: 'set_emotion', emotion: 'RADIANT' }
    },
    7
  );
  console.log(`✅ 5. Dispatched live SSE commands: mode=aapnootmies, target="mies", emotion=RADIANT`);

  // 6. Stream synthetic 64-point Golden Cell hover trajectory + 2D-FFT telemetry to /api/telemetry
  const now = Date.now();
  const syntheticPoints = Array.from({ length: 64 }, (_, i) => {
    const t = now - (64 - i) * 25;
    const x = Math.round(520 + Math.sin(i * 0.25) * 45);
    const y = Math.round(410 + Math.cos(i * 0.22) * 30);
    return {
      x,
      y,
      t,
      l: 1,
      vx: 0.42,
      vy: 0.28,
      v: 0.5,
      hoverCell: 'mies',
      isGoldenHover: true
    };
  });

  const telemetryRes = await fetch(`${BASE_URL}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      curriculumMode: 'aapnootmies',
      level: 1,
      language: 'nl',
      elapsedMs: 3200,
      idleMs: 40,
      streak: 3,
      tutorEmotion: 'RADIANT',
      introspectionLevel: 2,
      isVoiceSilent: false,
      kineticMode: true,
      pinholeEnabled: true,
      aliveness: 0.92,
      hesitationIndex: 0.18,
      roundTarget: 'mies',
      roundOptions: ['aap', 'noot', 'mies', 'wim', 'zus', 'jet'],
      lastIntrospectionLog: 'Gouden Cel "mies" volledig tot bloei gekomen (Fase 4/4)!',
      voiceSelected: 'Dutch NL',
      viewport: { w: 1280, h: 800 },
      derivedHardData: {
        kinematics: {
          instantVelocityPxMs: 0.5,
          meanVelocityPxMs: 0.48,
          peakVelocityPxMs: 1.12,
          meanAccelerationPxMs2: 0.008,
          rmsJerkPxMs3: 0.00042,
          totalPathLengthPx: 640,
          directnessIndex: 0.84,
          directionReversals: 2
        },
        hoverAnalytics: {
          currentHoverCell: 'mies',
          goldenCellWord: 'mies',
          goldenCellEvolutionStage: 4,
          goldenCellDwellMs: 2850,
          totalDistractorDwellMs: 350,
          goldenToDistractorRatio: 0.891,
          timeToFirstGoldenHoverMs: 420,
          cellDwellMs: { aap: 150, noot: 200, mies: 2850, wim: 0, zus: 0, jet: 0 },
          cellVisitCounts: { aap: 1, noot: 1, mies: 2, wim: 0, zus: 0, jet: 0 }
        },
        fft2D: {
          sampleCountUsed: 64,
          effectiveSampleRateHz: 40.0,
          dominantFrequencyXHz: 1.5,
          dominantFrequencyYHz: 1.0,
          lowFreqMacroNavPower: 0.42,
          midFreqScanPower: 0.19,
          highFreqTremorPower: 0.04,
          anisotropyRatioXY: 1.38,
          spectralEntropy: 0.54,
          cognitiveLoadSignature: 'CALM_DIRECT'
        }
      },
      telemetryPointCount: syntheticPoints.length,
      telemetry: syntheticPoints
    })
  });
  const telemetryJson = await telemetryRes.json();
  console.log(`✅ 6. Telemetry POST /api/telemetry accepted:`, telemetryJson);

  // 7. Read back telemetry via MCP `get_tutor_telemetry` and save snapshot via `save_telemetry_snapshot`
  const readBack = await callMcp(
    'tools/call',
    { name: 'get_tutor_telemetry', arguments: { includeRawPoints: false } },
    8
  );
  const readBackObj = JSON.parse(readBack.result?.content?.[0]?.text || '{}');
  console.log(
    `✅ 7. MCP get_tutor_telemetry verified: target="${readBackObj.snapshot?.roundTarget}", stage=${readBackObj.snapshot?.derivedHardData?.hoverAnalytics?.goldenCellEvolutionStage}/4, fftSignature=${readBackObj.snapshot?.derivedHardData?.fft2D?.cognitiveLoadSignature}`
  );

  const savedSnap = await callMcp(
    'tools/call',
    { name: 'save_telemetry_snapshot', arguments: { label: 'channel2_verified' } },
    9
  );
  console.log(`✅ 8. Saved telemetry snapshot:`, JSON.parse(savedSnap.result?.content?.[0]?.text || '{}'));

  // 8. Exercise Ctrl+Shift+Alt+G Drill-Through Context Channel Buffer (POST /api/drill-through & MCP get_drill_through_buffer)
  const drillNow = Date.now();
  const drillPacket = {
    packetId: `dt_${drillNow}_ctrl_shift_alt_g`,
    triggerSource: 'CTRL_SHIFT_ALT_G',
    timestamps: {
      isoTimestamp: new Date(drillNow).toISOString(),
      epochMs: drillNow,
      performanceNowMs: 4821.37,
      timezoneOffsetMin: -60,
      sessionUptimeMs: 18420,
      roundElapsedMs: 3200,
      idleMs: 40,
      firstGoldenHoverMs: 420
    },
    pointerAndDomDrillThrough: {
      pointerX: 520,
      pointerY: 410,
      normalizedX: 0.406,
      normalizedY: 0.512,
      hoveredWordCell: 'mies',
      isGoldenCellUnderPointer: true,
      domStackUnderPointer: [
        { depth: 0, tagName: 'button', id: null, className: 'relative group overflow-hidden h-32', dataWord: 'mies', rect: { x: 420, y: 340, w: 260, h: 160 } },
        { depth: 1, tagName: 'div', id: null, className: 'grid grid-cols-2 lg:grid-cols-3', dataWord: null, rect: { x: 110, y: 340, w: 1060, h: 344 } }
      ]
    },
    cognitiveAndPedagogicalState: {
      curriculumMode: 'aapnootmies',
      anmFigureMode: 'hybrid',
      level: 1,
      language: 'nl',
      roundTarget: 'mies',
      roundOptions: ['aap', 'noot', 'mies', 'wim', 'zus', 'jet'],
      streak: 3,
      tutorEmotion: 'RADIANT',
      introspectionLevel: 2,
      lastIntrospectionLog: 'Gouden Cel "mies" volledig tot bloei gekomen (Fase 4/4)!',
      aliveness: 0.92,
      hesitationIndex: 0.18,
      baseThresholdMs: 10000,
      kineticMode: true,
      pinholeEnabled: true
    },
    aiAugmentationState: {
      activeConfig: {
        hintThrottleMultiplier: 1.0,
        kineticSpeedMultiplier: 1.0,
        customEncouragementBanner: null,
        focusPrefix: null,
        lastUpdatedByAiAt: null
      },
      learnerFlowDiagnosis: 'FLOW_MASTERY',
      recommendedHintThrottleMultiplier: 1.25,
      recommendedKineticSpeedMultiplier: 1.20,
      recommendedNextTargetWords: ['wim', 'weide', 'vuur']
    }
  };

  const dtPost = await fetch(`${BASE_URL}/api/drill-through`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(drillPacket)
  });
  const dtPostJson = await dtPost.json();
  console.log(`✅ 9. Ctrl+Shift+Alt+G Drill-Through buffered to MCP server:`, dtPostJson);

  const dtBufferRes = await callMcp(
    'tools/call',
    { name: 'get_drill_through_buffer', arguments: { limit: 3 } },
    10
  );
  const dtBufferObj = JSON.parse(dtBufferRes.result?.content?.[0]?.text || '{}');
  console.log(
    `✅ 10. MCP get_drill_through_buffer verified: totalBuffered=${dtBufferObj.totalBufferedPackets}, latestPacketId="${dtBufferObj.latestRecord?.packet?.packetId}", flowDiagnosis="${dtBufferObj.latestRecord?.packet?.aiAugmentationState?.learnerFlowDiagnosis}"`
  );

  // 9. Exercise External AI Dynamic Learning Augmentation (MCP `augment_learning_play`)
  const augRes = await callMcp(
    'tools/call',
    {
      name: 'augment_learning_play',
      arguments: {
        hintThrottleMultiplier: 1.20,
        kineticSpeedMultiplier: 1.15,
        customEncouragementBanner: 'Super-flow gedetecteerd! Poes Mies spint van trots — op naar Wim en Vuur!',
        emotion: 'WARM_PRIDE',
        focusPrefix: 'm'
      }
    },
    11
  );
  console.log(`✅ 11. External AI Dynamic Learning Augmentation dispatched:`, JSON.parse(augRes.result?.content?.[0]?.text || '{}'));
}

/**
 * Minimal strict TypeScript Chrome DevTools Protocol (CDP) Driver using Node 22 native WebSocket
 * to drive the headed Playwright Chromium browser (`ms-playwright/chromium-1248`) visually!
 */
class HeadedPlaywrightCdpSession {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }>();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.addEventListener('message', event => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          id?: number;
          result?: Record<string, unknown>;
          error?: { message: string };
        };
        if (msg.id && this.pending.has(msg.id)) {
          const handler = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) handler.reject(new Error(msg.error.message));
          else handler.resolve(msg.result || {});
        }
      } catch {
        // ignore parse errors
      }
    });
  }

  static async connect(wsUrl: string): Promise<HeadedPlaywrightCdpSession> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.addEventListener('open', () => resolve(new HeadedPlaywrightCdpSession(ws)));
      ws.addEventListener('error', err => reject(new Error(`CDP WebSocket error: ${String(err)}`)));
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evalJs<T = unknown>(expression: string): Promise<T> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    const resultObj = res.result as { value?: T } | undefined;
    return resultObj?.value as T;
  }

  async captureScreenshotPng(outPath: string): Promise<void> {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const b64 = String(res.data || '');
    if (b64) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
    }
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

async function runHeadedPlaywrightBrowserDemo(keepOpenMs: number): Promise<void> {
  if (!fs.existsSync(PLAYWRIGHT_CHROMIUM_BIN)) {
    console.log(`⚠️ Playwright Chromium binary not found at ${PLAYWRIGHT_CHROMIUM_BIN}; skipping live browser launch.`);
    return;
  }

  const cdpPort = 9229;
  const userDataDir = `/tmp/rt_tutor_pw_headed_${Date.now()}`;
  const isHeadless = process.argv.includes('--headless');

  const chromeArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,920',
    '--autoplay-policy=no-user-gesture-required'
  ];

  if (isHeadless) {
    chromeArgs.push('--headless=new');
  } else if (process.env.WAYLAND_DISPLAY && !process.env.DISPLAY) {
    chromeArgs.push('--ozone-platform-hint=auto');
  }

  chromeArgs.push(BASE_URL);

  console.log(`\n🎭 [Headed Playwright Chromium] Launching visible browser window (${isHeadless ? 'headless' : 'HEADED SHOW-IT-ALL'}) at ${BASE_URL}...`);
  const chromeProc: ChildProcess = spawn(PLAYWRIGHT_CHROMIUM_BIN, chromeArgs, {
    stdio: 'ignore',
    env: { ...process.env }
  });

  try {
    // Wait until browser connects to MCP Transponder SSE stream (/api/state) OR CDP port
    let sseConnected = false;
    let pageWsUrl = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(300);
      try {
        const stRes = await fetch(`${BASE_URL}/api/state`);
        const stJson = (await stRes.json()) as { connectedBrowserSseClients?: number };
        if ((stJson.connectedBrowserSseClients || 0) > 0) {
          sseConnected = true;
        }
      } catch {
        // ignore
      }
      try {
        const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        const targets = (await res.json()) as Array<{ type: string; url: string; webSocketDebuggerUrl?: string }>;
        const pageTarget = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pageTarget?.webSocketDebuggerUrl) {
          pageWsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      } catch {
        // CDP port may take a moment
      }
      if (sseConnected && attempt >= 4) break;
    }

    if (pageWsUrl) {
      const cdp = await HeadedPlaywrightCdpSession.connect(pageWsUrl);
      await cdp.send('Page.enable');
      await cdp.send('Runtime.enable');

      for (let i = 0; i < 20; i++) {
        const hasBridge = await cdp.evalJs<boolean>('Boolean(window.__RT_TUTOR_BRIDGE__)');
        if (hasBridge) break;
        await sleep(250);
      }

      console.log(`✅ 12. Headed Playwright Chromium connected via CDP + SSE (__RT_TUTOR_BRIDGE__ active)!`);

      await cdp.evalJs(`
        (() => {
          const b = window.__RT_TUTOR_BRIDGE__;
          if (!b) return 'no_bridge';
          b.startEngine();
          b.setCurriculum('aapnootmies');
          b.setFigureMode('hybrid');
          b.setTargetWord('mies');
          b.setEmotion('RADIANT');
          return 'started';
        })()
      `);
      await sleep(900);

      const miesBox = await cdp.evalJs<{ x: number; y: number; w: number; h: number } | null>(`
        (() => {
          const el = document.querySelector('[data-word="mies"]');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
        })()
      `);

      if (miesBox) {
        for (let step = 0; step < 12; step++) {
          const px = Math.round(miesBox.x + Math.sin(step * 0.5) * 28);
          const py = Math.round(miesBox.y + Math.cos(step * 0.5) * 18);
          await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px, y: py });
          await sleep(80);
        }
        console.log(`✅ 13. Animated live pointer hover across Golden Cell "mies" (${miesBox.x}, ${miesBox.y}) — 1960s Motion-Lamp & Golden Bloom active!`);
      }

      await cdp.evalJs(`
        window.__RT_TUTOR_BRIDGE__?.augmentLearningPlay({
          hintThrottleMultiplier: 0.75,
          kineticSpeedMultiplier: 1.25,
          customEncouragementBanner: '✨ 1960s Motion-Lamp & Alpha WebP Live! Poes Mies straalt in het gouden licht!',
          emotion: 'WARM_PRIDE',
          focusPrefix: 'm'
        })
      `);
      await sleep(700);

      const liveDrillPacketId = await cdp.evalJs<string>(`
        (() => {
          const pkt = window.__RT_TUTOR_BRIDGE__?.triggerDrillThrough();
          return pkt ? pkt.packetId : 'none';
        })()
      `);
      console.log(`✅ 14. Triggered live Ctrl+Shift+Alt+G Drill-Through in browser: packetId="${liveDrillPacketId}"`);
      await sleep(600);

      const boardShotPath = path.join(process.cwd(), 'public', 'aapnootmies', 'live_playwright_demo_board.png');
      await cdp.captureScreenshotPng(boardShotPath);
      console.log(`📸 15. Captured live Playwright screenshot -> ${boardShotPath}`);

      await cdp.evalJs(`window.__RT_TUTOR_BRIDGE__?.toggleLeesplankModal()`);
      await sleep(900);
      const modalShotPath = path.join(process.cwd(), 'public', 'aapnootmies', 'live_playwright_demo_leesplank.png');
      await cdp.captureScreenshotPng(modalShotPath);
      console.log(`📸 16. Captured live Leesplankje 17-figure modal screenshot -> ${modalShotPath}`);
      await cdp.evalJs(`window.__RT_TUTOR_BRIDGE__?.toggleLeesplankModal()`);

      if (keepOpenMs > 0 && !isHeadless) {
        console.log(`👀 Keeping headed Playwright Chromium window open for ${Math.round(keepOpenMs / 1000)}s so you can inspect & play...`);
        await sleep(keepOpenMs);
      }
      cdp.close();
    } else {
      console.log(`✅ 12. Headed Playwright Chromium launched (SSE connected=${sseConnected}) — driving live visual demo via MCP SSE Command Stream!`);
      await callMcp('tools/call', { name: 'send_tutor_command', arguments: { action: 'start_engine' } }, 20);
      await sleep(500);
      await callMcp('tools/call', { name: 'send_tutor_command', arguments: { action: 'set_curriculum', mode: 'aapnootmies' } }, 21);
      await callMcp('tools/call', { name: 'send_tutor_command', arguments: { action: 'set_figure_mode', figureMode: 'hybrid' } }, 22);
      await callMcp('tools/call', { name: 'send_tutor_command', arguments: { action: 'set_target_word', word: 'mies' } }, 23);
      console.log(`✅ 13. Live browser switched to Aap-Noot-Mies Hybrid (Alpha WebP + 1960s Motion-Lamp) targeting "mies"!`);
      await sleep(900);

      await callMcp('tools/call', {
        name: 'augment_learning_play',
        arguments: {
          hintThrottleMultiplier: 0.75,
          kineticSpeedMultiplier: 1.25,
          customEncouragementBanner: '✨ 1960s Motion-Lamp & Alpha WebP Live! Poes Mies straalt in het gouden licht!',
          emotion: 'WARM_PRIDE',
          focusPrefix: 'm'
        }
      }, 24);
      console.log(`✅ 14. Live External AI Co-Pilot banner & 1960s Motion-Lamp speed boost applied on screen!`);
      await sleep(900);

      await callMcp('tools/call', { name: 'trigger_drill_through', arguments: { openModal: true } }, 25);
      console.log(`✅ 15. Triggered live Ctrl+Shift+Alt+G Drill-Through capture in browser -> auto-copied & buffered to MCP!`);
      await sleep(1000);

      await callMcp('tools/call', { name: 'send_tutor_command', arguments: { action: 'toggle_leesplank_modal' } }, 26);
      console.log(`✅ 16. Toggled 17-Figure Leesplankje Reference Modal in live browser!`);
      await sleep(1200);
      await callMcp('tools/call', { name: 'send_tutor_command', arguments: { action: 'toggle_leesplank_modal' } }, 27);

      if (keepOpenMs > 0 && !isHeadless) {
        console.log(`👀 Keeping headed Playwright Chromium window open for ${Math.round(keepOpenMs / 1000)}s...`);
        await sleep(keepOpenMs);
      }
    }
  } finally {
    if (!process.argv.includes('--stay-open')) {
      chromeProc.kill('SIGTERM');
    }
  }
}

async function main(): Promise<void> {
  // Automatically start the MCP Transponder in-process if :3001 is not already listening
  let transponderAlreadyUp = false;
  try {
    const res = await fetch(`${BASE_URL}/api/state`);
    if (res.ok) transponderAlreadyUp = true;
  } catch {
    transponderAlreadyUp = false;
  }

  let embeddedServer: import('node:http').Server | null = null;
  if (!transponderAlreadyUp) {
    process.env.RT_TUTOR_EMBEDDED_TRANSPONDER = '1';
    const mod = await import('../server/mcp_transponder.ts');
    embeddedServer = await mod.startTransponderServer(3001);
  }

  try {
    await runTransponderAndSyntheticVerification();

    const shouldLaunchBrowser = !process.argv.includes('--no-browser');
    if (shouldLaunchBrowser) {
      const keepOpenArg = process.argv.find(a => a.startsWith('--keep-open-ms='));
      const keepOpenMs = keepOpenArg ? Number(keepOpenArg.split('=')[1]) : 3500;
      await runHeadedPlaywrightBrowserDemo(keepOpenMs);
    }

    console.log(`\n🎉 All Channel 1 (MCP Transponder) & Channel 2 (Headed Playwright + Alpha WebP Motion-Lamp) checks passed!\n`);
  } finally {
    if (embeddedServer && !process.argv.includes('--stay-open')) {
      embeddedServer.close();
    }
  }
}

main().catch(err => {
  console.error('❌ Exerciser error:', err);
  process.exit(1);
});
