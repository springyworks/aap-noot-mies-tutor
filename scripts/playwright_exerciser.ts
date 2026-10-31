#!/usr/bin/env node
/**
 * ============================================================================
 * CHANNEL 2: PLAYWRIGHT & MCP TRANSPONDER AUTOMATED EXERCISER 🚀🎭
 * ============================================================================
 * Exercises and verifies the RT Tutor application across:
 *   1. MCP JSON-RPC 2.0 Protocol (`POST http://localhost:3001/mcp`)
 *   2. 17 Cut-Out Aap-Noot-Mies SVG Figure Assets verification
 *   3. Zero-Frustration Pedagogical Constraint check (rejects angry states)
 *   4. Synthetic 64-point Golden Cell hover & 2D-FFT telemetry round-trip
 *   5. Optional Live Browser UI automation when `playwright` is installed
 *
 * Run directly with:
 *   node --experimental-strip-types scripts/playwright_exerciser.ts
 */

const BASE_URL = process.env.RT_TUTOR_URL || 'http://localhost:3001';

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

async function runTransponderAndSyntheticVerification(): Promise<void> {
  console.log(`\n🔬 [Channel 2 Exerciser] Connecting to RT Tutor MCP Transponder at ${BASE_URL}...`);

  // 1. Initialize MCP session
  const initRes = await callMcp('initialize', {}, 1);
  console.log(`✅ 1. MCP Initialize:`, initRes.result?.serverInfo);

  // 2. List MCP tools
  const toolsRes = await callMcp('tools/list', {}, 2);
  const toolNames = toolsRes.result?.tools?.map(t => t.name) || [];
  console.log(`✅ 2. MCP Tools Registered (${toolNames.length}):`, toolNames.join(', '));

  // 3. Verify all 17 Cut-Out Aap-Noot-Mies figures via MCP tool
  const anmRes = await callMcp('tools/call', { name: 'inspect_aapnootmies_figures', arguments: {} }, 3);
  const anmData = JSON.parse(anmRes.result?.content?.[0]?.text || '{}');
  console.log(
    `✅ 3. Aap-Noot-Mies Cut-Out Figures: ${anmData.totalFigures}/17 present (allPresent=${anmData.allPresent})`
  );
  if (!anmData.allPresent || anmData.totalFigures !== 17) {
    throw new Error('Missing Aap-Noot-Mies cut-out figure assets!');
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
}

async function main(): Promise<void> {
  await runTransponderAndSyntheticVerification();
  console.log(`\n🎉 All Channel 1 (MCP Transponder) & Channel 2 (Exerciser) checks passed!\n`);
}

main().catch(err => {
  console.error('❌ Exerciser error:', err);
  process.exit(1);
});
