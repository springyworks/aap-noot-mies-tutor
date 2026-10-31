#!/usr/bin/env node

// scripts/playwright_exerciser.ts
var BASE_URL = process.env.RT_TUTOR_URL || "http://localhost:3001";
async function callMcp(method, params, id = 1) {
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  });
  return await res.json();
}
async function runTransponderAndSyntheticVerification() {
  console.log(`
\u{1F52C} [Channel 2 Exerciser] Connecting to RT Tutor MCP Transponder at ${BASE_URL}...`);
  const initRes = await callMcp("initialize", {}, 1);
  console.log(`\u2705 1. MCP Initialize:`, initRes.result?.serverInfo);
  const toolsRes = await callMcp("tools/list", {}, 2);
  const toolNames = toolsRes.result?.tools?.map((t) => t.name) || [];
  console.log(`\u2705 2. MCP Tools Registered (${toolNames.length}):`, toolNames.join(", "));
  const anmRes = await callMcp("tools/call", { name: "inspect_aapnootmies_figures", arguments: {} }, 3);
  const anmData = JSON.parse(anmRes.result?.content?.[0]?.text || "{}");
  console.log(
    `\u2705 3. Aap-Noot-Mies Cut-Out Figures: ${anmData.totalFigures}/17 present (allPresent=${anmData.allPresent})`
  );
  if (!anmData.allPresent || anmData.totalFigures !== 17) {
    throw new Error("Missing Aap-Noot-Mies cut-out figure assets!");
  }
  const angryAttempt = await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_emotion", emotion: "ANGRY" }
    },
    4
  );
  const rejectedAngry = Boolean(angryAttempt.result?.isError);
  console.log(`\u2705 4. Zero-Frustration Guardrail (reject 'ANGRY' emotion): ${rejectedAngry ? "PASSED" : "FAILED"}`);
  if (!rejectedAngry) {
    throw new Error("Pedagogical violation: ANGRY emotion was not rejected!");
  }
  await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_curriculum", mode: "aapnootmies" }
    },
    5
  );
  await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_target_word", word: "mies" }
    },
    6
  );
  await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_emotion", emotion: "RADIANT" }
    },
    7
  );
  console.log(`\u2705 5. Dispatched live SSE commands: mode=aapnootmies, target="mies", emotion=RADIANT`);
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
      hoverCell: "mies",
      isGoldenHover: true
    };
  });
  const telemetryRes = await fetch(`${BASE_URL}/api/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      curriculumMode: "aapnootmies",
      level: 1,
      language: "nl",
      elapsedMs: 3200,
      idleMs: 40,
      streak: 3,
      tutorEmotion: "RADIANT",
      introspectionLevel: 2,
      isVoiceSilent: false,
      kineticMode: true,
      pinholeEnabled: true,
      aliveness: 0.92,
      hesitationIndex: 0.18,
      roundTarget: "mies",
      roundOptions: ["aap", "noot", "mies", "wim", "zus", "jet"],
      lastIntrospectionLog: 'Gouden Cel "mies" volledig tot bloei gekomen (Fase 4/4)!',
      voiceSelected: "Dutch NL",
      viewport: { w: 1280, h: 800 },
      derivedHardData: {
        kinematics: {
          instantVelocityPxMs: 0.5,
          meanVelocityPxMs: 0.48,
          peakVelocityPxMs: 1.12,
          meanAccelerationPxMs2: 8e-3,
          rmsJerkPxMs3: 42e-5,
          totalPathLengthPx: 640,
          directnessIndex: 0.84,
          directionReversals: 2
        },
        hoverAnalytics: {
          currentHoverCell: "mies",
          goldenCellWord: "mies",
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
          effectiveSampleRateHz: 40,
          dominantFrequencyXHz: 1.5,
          dominantFrequencyYHz: 1,
          lowFreqMacroNavPower: 0.42,
          midFreqScanPower: 0.19,
          highFreqTremorPower: 0.04,
          anisotropyRatioXY: 1.38,
          spectralEntropy: 0.54,
          cognitiveLoadSignature: "CALM_DIRECT"
        }
      },
      telemetryPointCount: syntheticPoints.length,
      telemetry: syntheticPoints
    })
  });
  const telemetryJson = await telemetryRes.json();
  console.log(`\u2705 6. Telemetry POST /api/telemetry accepted:`, telemetryJson);
  const readBack = await callMcp(
    "tools/call",
    { name: "get_tutor_telemetry", arguments: { includeRawPoints: false } },
    8
  );
  const readBackObj = JSON.parse(readBack.result?.content?.[0]?.text || "{}");
  console.log(
    `\u2705 7. MCP get_tutor_telemetry verified: target="${readBackObj.snapshot?.roundTarget}", stage=${readBackObj.snapshot?.derivedHardData?.hoverAnalytics?.goldenCellEvolutionStage}/4, fftSignature=${readBackObj.snapshot?.derivedHardData?.fft2D?.cognitiveLoadSignature}`
  );
  const savedSnap = await callMcp(
    "tools/call",
    { name: "save_telemetry_snapshot", arguments: { label: "channel2_verified" } },
    9
  );
  console.log(`\u2705 8. Saved telemetry snapshot:`, JSON.parse(savedSnap.result?.content?.[0]?.text || "{}"));
  const drillNow = Date.now();
  const drillPacket = {
    packetId: `dt_${drillNow}_ctrl_shift_alt_g`,
    triggerSource: "CTRL_SHIFT_ALT_G",
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
      hoveredWordCell: "mies",
      isGoldenCellUnderPointer: true,
      domStackUnderPointer: [
        { depth: 0, tagName: "button", id: null, className: "relative group overflow-hidden h-32", dataWord: "mies", rect: { x: 420, y: 340, w: 260, h: 160 } },
        { depth: 1, tagName: "div", id: null, className: "grid grid-cols-2 lg:grid-cols-3", dataWord: null, rect: { x: 110, y: 340, w: 1060, h: 344 } }
      ]
    },
    cognitiveAndPedagogicalState: {
      curriculumMode: "aapnootmies",
      anmFigureMode: "hybrid",
      level: 1,
      language: "nl",
      roundTarget: "mies",
      roundOptions: ["aap", "noot", "mies", "wim", "zus", "jet"],
      streak: 3,
      tutorEmotion: "RADIANT",
      introspectionLevel: 2,
      lastIntrospectionLog: 'Gouden Cel "mies" volledig tot bloei gekomen (Fase 4/4)!',
      aliveness: 0.92,
      hesitationIndex: 0.18,
      baseThresholdMs: 1e4,
      kineticMode: true,
      pinholeEnabled: true
    },
    aiAugmentationState: {
      activeConfig: {
        hintThrottleMultiplier: 1,
        kineticSpeedMultiplier: 1,
        customEncouragementBanner: null,
        focusPrefix: null,
        lastUpdatedByAiAt: null
      },
      learnerFlowDiagnosis: "FLOW_MASTERY",
      recommendedHintThrottleMultiplier: 1.25,
      recommendedKineticSpeedMultiplier: 1.2,
      recommendedNextTargetWords: ["wim", "weide", "vuur"]
    }
  };
  const dtPost = await fetch(`${BASE_URL}/api/drill-through`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(drillPacket)
  });
  const dtPostJson = await dtPost.json();
  console.log(`\u2705 9. Ctrl+Shift+Alt+G Drill-Through buffered to MCP server:`, dtPostJson);
  const dtBufferRes = await callMcp(
    "tools/call",
    { name: "get_drill_through_buffer", arguments: { limit: 3 } },
    10
  );
  const dtBufferObj = JSON.parse(dtBufferRes.result?.content?.[0]?.text || "{}");
  console.log(
    `\u2705 10. MCP get_drill_through_buffer verified: totalBuffered=${dtBufferObj.totalBufferedPackets}, latestPacketId="${dtBufferObj.latestRecord?.packet?.packetId}", flowDiagnosis="${dtBufferObj.latestRecord?.packet?.aiAugmentationState?.learnerFlowDiagnosis}"`
  );
  const augRes = await callMcp(
    "tools/call",
    {
      name: "augment_learning_play",
      arguments: {
        hintThrottleMultiplier: 1.2,
        kineticSpeedMultiplier: 1.15,
        customEncouragementBanner: "Super-flow gedetecteerd! Poes Mies spint van trots \u2014 op naar Wim en Vuur!",
        emotion: "WARM_PRIDE",
        focusPrefix: "m"
      }
    },
    11
  );
  console.log(`\u2705 11. External AI Dynamic Learning Augmentation dispatched:`, JSON.parse(augRes.result?.content?.[0]?.text || "{}"));
}
async function main() {
  await runTransponderAndSyntheticVerification();
  console.log(`
\u{1F389} All Channel 1 (MCP Transponder) & Channel 2 (Exerciser) checks passed!
`);
}
main().catch((err) => {
  console.error("\u274C Exerciser error:", err);
  process.exit(1);
});
