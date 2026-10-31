import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AAP_NOOT_MIES_FIGURES, AapNootMiesFigureAsset } from './aapNootMiesAssets';

// ============================================================================
// STRICT TYPESCRIPT INTERFACES & TYPES (Cognitive State, 2D-FFT & Telemetry)
// ============================================================================

export type LanguageCode = 'nl' | 'en';
export type CurriculumMode = 'standard' | 'aapnootmies';
export type AnmFigureMode = 'hybrid' | 'photo' | 'vector';
export type IntrospectionLevel = 0 | 1 | 2;
export type IdlePhase = 0 | 1 | 2; // 0 = Active, 1 = Gentle Check-in Done, 2 = Self-Announced Silent Standby

/**
 * 18 Strictly Positive, Non-Angry, Non-Aggressive Tutor Expressions.
 * Angry, frustrated, or impatient states are strictly forbidden by design.
 */
export type TutorEmotion =
  | 'SERENE'           // 1. Sereen & Rustig
  | 'CURIOUS'          // 2. Nieuwsgierig Verkennend
  | 'CONTEMPLATIVE'    // 3. Peinzend & Observerend
  | 'ENCOURAGING'      // 4. Warm Aanmoedigend
  | 'PLAYFUL'          // 5. Speels & Kinetisch
  | 'DELIGHTED'        // 6. Verrukt & Blij
  | 'WONDER'           // 7. Verwonderd (Gouden Cel Ontwaking)
  | 'ATTENTIVE'        // 8. Alert & Aandachtig (Hover Detectie)
  | 'GENTLE_SURPRISE'  // 9. Zachte Verrassing
  | 'WARM_PRIDE'       // 10. Warme Trots
  | 'PATIENT'          // 11. Geduldig Luisterend
  | 'INSPIRED'         // 12. Geïnspireerd (Model Vorming)
  | 'RADIANT'          // 13. Stralend (Gouden Cel Volledig Levend!)
  | 'HARMONIOUS'       // 14. Harmonisch in Balans
  | 'MEDITATIVE'       // 15. Meditatief & Gefocust
  | 'EAGER'            // 16. Leergierig & Wakker
  | 'SOOTHING'         // 17. Kalmerend & Geruststellend
  | 'ROCKET_LAUNCH';   // 18. Brein-Raket Lancering! 🚀

export interface TelemetryPoint {
  x: number;
  y: number;
  t: number;
  l: number;
  vx: number;               // Horizontal velocity (px/ms)
  vy: number;               // Vertical velocity (px/ms)
  v: number;                // Magnitude velocity (px/ms)
  hoverCell: string | null; // Word cell currently under pointer/finger
  isGoldenHover: boolean;   // True when hovering over the target ("Golden") cell
}

export interface SpectralBin2D {
  freqHz: number;
  powerX: number;
  powerY: number;
  power2D: number;
}

export interface Derived2DFFTSpectrum {
  sampleCountUsed: number;
  effectiveSampleRateHz: number;
  dominantFrequencyXHz: number;
  dominantFrequencyYHz: number;
  lowFreqMacroNavPower: number;    // 0.2 - 1.5 Hz (Deliberate macro-navigation)
  midFreqScanPower: number;        // 1.5 - 4.0 Hz (Orthographic letter scanning)
  highFreqTremorPower: number;     // 4.0 - 10.0 Hz (Micro-hesitation / cognitive load)
  anisotropyRatioXY: number;       // Horizontal vs Vertical scanning energy ratio
  spectralEntropy: number;         // 0.0 (pure periodic) to 1.0 (complex/chaotic search)
  cognitiveLoadSignature: 'CALM_DIRECT' | 'ACTIVE_SCANNING' | 'HIGH_HESITATION' | 'EXPLORATORY_DRIFT';
  bins: SpectralBin2D[];
}

export interface DerivedKinematics {
  instantVelocityPxMs: number;
  meanVelocityPxMs: number;
  peakVelocityPxMs: number;
  meanAccelerationPxMs2: number;
  rmsJerkPxMs3: number;            // Smoothness metric (lower = smoother mental model)
  totalPathLengthPx: number;
  directnessIndex: number;         // Net displacement / total path length (0..1)
  directionReversals: number;      // Saccadic pointer reversals
}

export interface DerivedHoverAnalytics {
  currentHoverCell: string | null;
  goldenCellWord: string;
  goldenCellEvolutionStage: 0 | 1 | 2 | 3 | 4;
  goldenCellDwellMs: number;
  totalDistractorDwellMs: number;
  goldenToDistractorRatio: number;
  timeToFirstGoldenHoverMs: number | null;
  cellDwellMs: Record<string, number>;
  cellVisitCounts: Record<string, number>;
}

export interface DerivedHardData {
  kinematics: DerivedKinematics;
  hoverAnalytics: DerivedHoverAnalytics;
  fft2D: Derived2DFFTSpectrum;
}

export interface RoundState {
  target: string;
  options: string[];
}

export interface KineticBody {
  phaseX: number;
  phaseY: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
}

export interface LaserShot {
  id: number;
  x: number;
  y: number;
  word: string;
  isHit: boolean;
  createdAt: number;
}

export interface BrainRocketFlight {
  active: boolean;
  word: string;
  streakCount: number;
  startedAt: number;
}

export interface TelemetryDumpPayload {
  timestamp: string;
  curriculumMode: CurriculumMode;
  level: number;
  language: LanguageCode;
  elapsedMs: number;
  idleMs: number;
  streak: number;
  tutorEmotion: TutorEmotion;
  introspectionLevel: IntrospectionLevel;
  isVoiceSilent: boolean;
  kineticMode: boolean;
  pinholeEnabled: boolean;
  aliveness: number;
  hesitationIndex: number;
  roundTarget: string;
  roundOptions: string[];
  lastIntrospectionLog: string;
  voiceSelected: string;
  viewport: { w: number; h: number };
  derivedHardData: DerivedHardData;
  telemetryPointCount: number;
  telemetry: TelemetryPoint[];
}

export interface DrillThroughEventEntry {
  seq: number;
  isoTime: string;
  epochMs: number;
  perfMs: number;
  roundElapsedMs: number;
  eventType: string;
  detail: Record<string, unknown>;
}

export interface DomDrillThroughLayer {
  depth: number;
  tagName: string;
  id: string | null;
  className: string;
  dataWord: string | null;
  rect: { x: number; y: number; w: number; h: number };
}

export interface AiLearningAugmentationConfig {
  hintThrottleMultiplier: number;
  kineticSpeedMultiplier: number;
  customEncouragementBanner: string | null;
  focusPrefix: string | null;
  lastUpdatedByAiAt: string | null;
}

export interface DrillThroughContextPacket {
  packetId: string;
  triggerSource: 'CTRL_SHIFT_ALT_G' | 'UI_BUTTON' | 'MCP_REMOTE_TRIGGER';
  timestamps: {
    isoTimestamp: string;
    epochMs: number;
    performanceNowMs: number;
    timezoneOffsetMin: number;
    sessionUptimeMs: number;
    roundElapsedMs: number;
    idleMs: number;
    firstGoldenHoverMs: number | null;
  };
  pointerAndDomDrillThrough: {
    pointerX: number;
    pointerY: number;
    normalizedX: number;
    normalizedY: number;
    hoveredWordCell: string | null;
    isGoldenCellUnderPointer: boolean;
    domStackUnderPointer: DomDrillThroughLayer[];
  };
  cognitiveAndPedagogicalState: {
    curriculumMode: CurriculumMode;
    anmFigureMode: AnmFigureMode;
    level: number;
    language: LanguageCode;
    roundTarget: string;
    roundOptions: string[];
    streak: number;
    tutorEmotion: TutorEmotion;
    introspectionLevel: IntrospectionLevel;
    lastIntrospectionLog: string;
    aliveness: number;
    hesitationIndex: number;
    baseThresholdMs: number;
    kineticMode: boolean;
    pinholeEnabled: boolean;
  };
  aiAugmentationState: {
    activeConfig: AiLearningAugmentationConfig;
    learnerFlowDiagnosis: 'FLOW_MASTERY' | 'ACTIVE_DECODING' | 'HESITATION_SCAFFOLD_NEEDED' | 'IDLE_STANDBY';
    recommendedHintThrottleMultiplier: number;
    recommendedKineticSpeedMultiplier: number;
    recommendedNextTargetWords: string[];
  };
  derivedHardData: DerivedHardData;
  recentEventTimeline: DrillThroughEventEntry[];
  recentTrajectorySample: TelemetryPoint[];
}

// ============================================================================
// DATA & DICTIONARIES (Standard Levels L0-L5 + Classic Dutch "Aap Noot Mies")
// ============================================================================

const DICTIONARIES: Record<LanguageCode, Record<number, string[]>> = {
  en: {
    // 15 distinct initial letters matching the 15 distinct Leesplankje figure initials (1-to-1 figure-to-letter mapping!)
    0: ['a', 'b', 'd', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 's', 't', 'v', 'w', 'z'],
    1: ['cat', 'dog', 'cow', 'car', 'sun', 'bat', 'hat', 'run', 'joy', 'boy', 'toy', 'bed', 'red', 'fox', 'box'],
    2: ['cat', 'car', 'dog', 'dot', 'cow', 'cop', 'sun', 'son', 'bat', 'bag', 'red', 'rat', 'box', 'boy'],
    3: ['audio', 'auto', 'aunt', 'autumn', 'august', 'aura', 'bear', 'beat', 'bean', 'beak', 'beef', 'beer', 'cold', 'coal', 'coat', 'coin', 'coil', 'corn'],
    4: ['boat', 'boot', 'book', 'boom', 'boon', 'boar', 'boss', 'bowl', 'dark', 'dart', 'darn', 'dash', 'dawn', 'days', 'daze', 'deal'],
    5: ['though', 'thought', 'through', 'thorough', 'tough', 'trough', 'thrill', 'thrive', 'threat', 'thread', 'throne', 'thrust']
  },
  nl: {
    // 15 unieke beginletters die 1-op-1 overeenkomen met de bijbehorende Aap-Noot-Mies Leesplankje figuren!
    0: ['a', 'b', 'd', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 's', 't', 'v', 'w', 'z'],
    1: ['kat', 'hond', 'koe', 'auto', 'zon', 'bal', 'dak', 'bel', 'oog', 'oor', 'bed', 'rood', 'vos', 'doos', 'vis'],
    2: ['kat', 'kip', 'koe', 'koek', 'auto', 'aap', 'zon', 'zee', 'bal', 'beer', 'dak', 'deur'],
    3: ['boom', 'boot', 'boer', 'boek', 'bord', 'bank', 'huis', 'hout', 'hond', 'hert', 'haas', 'hoed'],
    4: ['stoel', 'stoep', 'stoom', 'staart', 'steen', 'stad', 'vogel', 'vleugel', 'vis', 'voet', 'vuur', 'vinger'],
    5: ['school', 'schoen', 'schaap', 'schip', 'schuur', 'schelp', 'vliegtuig', 'vlinder', 'vloer', 'vlam', 'vlag', 'vlees']
  }
};

/**
 * Classic Dutch Hoogeveen's Improved "Leesplankje" (Aap - Noot - Mies)
 */
const AAP_NOOT_MIES_WORDS: string[] = [
  'aap', 'noot', 'mies', 'wim', 'zus', 'jet',
  'teun', 'vuur', 'gijs', 'lam', 'kees', 'bok',
  'weide', 'does', 'hok', 'duif', 'schapen'
];

const PRAISES: Record<LanguageCode, string[]> = {
  en: [
    "Well done sweetheart, you found it right away!",
    "Yes, beautiful reading! Look how nicely that fits.",
    "You spotted that all by yourself, lovely!",
    "Wonderful darling, you are reading so smoothly!",
    "Yes, that is the right one, super!",
    "Oh how nice, you saw that right away!",
    "Beautifully done, let us look at the next one together.",
    "Yes, spot on! You have a great eye for the letters.",
    "Lovely work, you found the golden picture!",
    "So calm and clear, well done!"
  ],
  nl: [
    "Goed zo lieverd, dat heb je mooi gezien!",
    "Ja hoor, helemaal goed gelezen!",
    "Wat knap dat je die meteen zag, schat!",
    "Prachtig gelezen hoor, we gaan lekker verder!",
    "Ja, dat is hem! Heel fijn gedaan.",
    "Oh wat mooi, je zag het meteen!",
    "Keurig hoor, kijk eens hoe rustig je dat doet.",
    "Ja, precies de goede! Wat doe je dat fijn.",
    "Heel mooi gevonden lieverd!",
    "Super hoor, laten we samen naar de volgende kijken."
  ]
};

const IDLE_PROMPTS: Record<LanguageCode, string[]> = {
  en: [
    "Take your time darling, we can look at the pictures together whenever you like.",
    "No hurry at all sweetheart, just look calmly at the letters.",
    "I am right here with you, take all the time you need."
  ],
  nl: [
    "Neem rustig je tijd hoor lieverd, we kijken gewoon samen naar de plaatjes.",
    "Geen haast hoor schat, kijk maar rustig welke letters je herkent.",
    "Ik ben hier bij je hoor, doe maar lekker op je gemak."
  ]
};

const SILENCE_ANNOUNCEMENTS: Record<LanguageCode, string> = {
  nl: "Ik ben even stil en luister rustig met je mee tot je weer verder wilt.",
  en: "I will stay quiet and listen calmly with you until you want to continue."
};

const BACH_MOTIFS: number[][] = [
  [523.25, 659.25, 783.99],             // C5 - E5 - G5
  [523.25, 587.33, 523.25, 659.25],     // C5 - D5 - C5 - E5
  [659.25, 783.99, 1046.50],            // E5 - G5 - C6
  [783.99, 880.00, 783.99, 1046.50],    // G5 - A5 - G5 - C6
  [523.25, 783.99, 659.25, 1046.50],    // C5 - G5 - E5 - C6
  [659.25, 523.25, 783.99],             // E5 - C5 - G5
  [587.33, 659.25, 783.99, 1046.50],    // D5 - E5 - G5 - C6
  [1046.50, 783.99, 659.25, 523.25],    // C6 - G5 - E5 - C5
  [659.25, 698.46, 659.25, 783.99],     // E5 - F5 - E5 - G5
  [783.99, 1046.50, 1318.51]            // G5 - C6 - E6
];

// Montessori European Muted Palette (Non-shouting, high-harmony tones)
const EURO_RGB: [number, number, number][] = [
  [212, 180, 131], // 1st char: Muted Sand (#d4b483)
  [126, 171, 160], // 2nd char: Muted Sage (#7eaba0)
  [196, 141, 132], // 3rd char: Muted Terracotta (#c48d84)
  [138, 153, 184], // 4th char: Muted Slate Blue (#8a99b8)
  [155, 140, 154]  // 5th+ char: Muted Heather Purple (#9b8c9a)
];

const EUROPEAN_HEX = ['#d4b483', '#7eaba0', '#c48d84', '#8a99b8', '#9b8c9a'];

// ============================================================================
// 18 POSITIVE TUTOR EXPRESSIONS METADATA (ZERO ANGRY / AGGRESSIVE STATES)
// ============================================================================

export const EMOTION_LIST: TutorEmotion[] = [
  'SERENE', 'CURIOUS', 'CONTEMPLATIVE', 'ENCOURAGING', 'PLAYFUL', 'DELIGHTED',
  'WONDER', 'ATTENTIVE', 'GENTLE_SURPRISE', 'WARM_PRIDE', 'PATIENT', 'INSPIRED',
  'RADIANT', 'HARMONIOUS', 'MEDITATIVE', 'EAGER', 'SOOTHING', 'ROCKET_LAUNCH'
];

const EMOTION_META: Record<TutorEmotion, {
  idx: number;
  labelNL: string;
  labelEN: string;
  color: string;
  pitchMod: number;
  rateMod: number;
}> = {
  SERENE:          { idx: 1,  labelNL: '1. Sereen & Rustig',        labelEN: '1. Serene & Calm',         color: '#7eaba0', pitchMod: 1.04, rateMod: 0.98 },
  CURIOUS:         { idx: 2,  labelNL: '2. Nieuwsgierig',           labelEN: '2. Curious Explorer',      color: '#d4b483', pitchMod: 1.07, rateMod: 1.00 },
  CONTEMPLATIVE:   { idx: 3,  labelNL: '3. Peinzend',               labelEN: '3. Contemplative',         color: '#8a99b8', pitchMod: 1.02, rateMod: 0.96 },
  ENCOURAGING:     { idx: 4,  labelNL: '4. Warm Aanmoedigend',      labelEN: '4. Encouraging',           color: '#c48d84', pitchMod: 1.06, rateMod: 1.00 },
  PLAYFUL:         { idx: 5,  labelNL: '5. Speels & Kinetisch',     labelEN: '5. Playful & Kinetic',     color: '#9b8c9a', pitchMod: 1.09, rateMod: 1.03 },
  DELIGHTED:       { idx: 6,  labelNL: '6. Verrukt & Blij',         labelEN: '6. Delighted',             color: '#82b89a', pitchMod: 1.10, rateMod: 1.04 },
  WONDER:          { idx: 7,  labelNL: '7. Verwonderd',             labelEN: '7. Filled with Wonder',    color: '#e0c088', pitchMod: 1.07, rateMod: 0.99 },
  ATTENTIVE:       { idx: 8,  labelNL: '8. Alert & Aandachtig',     labelEN: '8. Attentive Focus',       color: '#7ab8c4', pitchMod: 1.05, rateMod: 1.00 },
  GENTLE_SURPRISE: { idx: 9,  labelNL: '9. Zachte Verrassing',      labelEN: '9. Gentle Surprise',       color: '#d8a48f', pitchMod: 1.08, rateMod: 1.01 },
  WARM_PRIDE:      { idx: 10, labelNL: '10. Warme Trots',           labelEN: '10. Warm Pride',           color: '#d4a373', pitchMod: 1.06, rateMod: 1.00 },
  PATIENT:         { idx: 11, labelNL: '11. Geduldig Wachtend',     labelEN: '11. Patiently Listening',  color: '#94a89a', pitchMod: 1.03, rateMod: 0.96 },
  INSPIRED:        { idx: 12, labelNL: '12. Geïnspireerd',          labelEN: '12. Inspired',             color: '#b89cd4', pitchMod: 1.08, rateMod: 1.02 },
  RADIANT:         { idx: 13, labelNL: '13. Stralend (Gouden Cel)', labelEN: '13. Radiant Golden Cell',  color: '#f3c663', pitchMod: 1.09, rateMod: 1.03 },
  HARMONIOUS:      { idx: 14, labelNL: '14. Harmonisch',            labelEN: '14. Harmonious',           color: '#80b4a8', pitchMod: 1.05, rateMod: 0.99 },
  MEDITATIVE:      { idx: 15, labelNL: '15. Meditatief',            labelEN: '15. Meditative',           color: '#7c90ad', pitchMod: 1.02, rateMod: 0.95 },
  EAGER:           { idx: 16, labelNL: '16. Leergierig',            labelEN: '16. Eager to Discover',    color: '#d9b26f', pitchMod: 1.08, rateMod: 1.03 },
  SOOTHING:        { idx: 17, labelNL: '17. Kalmerend',             labelEN: '17. Soothing & Safe',      color: '#88b3a4', pitchMod: 1.04, rateMod: 0.96 },
  ROCKET_LAUNCH:   { idx: 18, labelNL: '18. Gouden Bloei ✨',       labelEN: '18. Golden Bloom ✨',      color: '#f59e0b', pitchMod: 1.09, rateMod: 1.03 }
};

// ============================================================================
// REAL-TIME 2D-FFT & KINEMATICS ENGINE (Hard Data & Derived Hard Data)
// ============================================================================

function computeDerivedHardData(
  points: TelemetryPoint[],
  targetWord: string,
  options: string[],
  cellDwellMs: Record<string, number>,
  cellVisitCounts: Record<string, number>,
  currentHoverCell: string | null,
  timeToFirstGoldenHoverMs: number | null
): DerivedHardData {
  const goldenDwell = cellDwellMs[targetWord] || 0;
  let distractorDwell = 0;
  options.forEach(w => {
    if (w !== targetWord) distractorDwell += (cellDwellMs[w] || 0);
  });
  const totalDwell = goldenDwell + distractorDwell;
  const goldenRatio = totalDwell > 0 ? Number((goldenDwell / totalDwell).toFixed(3)) : 0;

  // Determine Golden Cell Evolution Stage (0..4) based on goldenDwellMs
  let goldenStage: 0 | 1 | 2 | 3 | 4 = 0;
  if (goldenDwell > 2800) goldenStage = 4;
  else if (goldenDwell > 1500) goldenStage = 3;
  else if (goldenDwell > 600) goldenStage = 2;
  else if (goldenDwell > 80) goldenStage = 1;

  const hoverAnalytics: DerivedHoverAnalytics = {
    currentHoverCell,
    goldenCellWord: targetWord,
    goldenCellEvolutionStage: goldenStage,
    goldenCellDwellMs: Math.round(goldenDwell),
    totalDistractorDwellMs: Math.round(distractorDwell),
    goldenToDistractorRatio: goldenRatio,
    timeToFirstGoldenHoverMs: timeToFirstGoldenHoverMs !== null ? Math.round(timeToFirstGoldenHoverMs) : null,
    cellDwellMs: { ...cellDwellMs },
    cellVisitCounts: { ...cellVisitCounts }
  };

  if (points.length < 4) {
    return {
      kinematics: {
        instantVelocityPxMs: 0,
        meanVelocityPxMs: 0,
        peakVelocityPxMs: 0,
        meanAccelerationPxMs2: 0,
        rmsJerkPxMs3: 0,
        totalPathLengthPx: 0,
        directnessIndex: 1,
        directionReversals: 0
      },
      hoverAnalytics,
      fft2D: {
        sampleCountUsed: points.length,
        effectiveSampleRateHz: 0,
        dominantFrequencyXHz: 0,
        dominantFrequencyYHz: 0,
        lowFreqMacroNavPower: 0,
        midFreqScanPower: 0,
        highFreqTremorPower: 0,
        anisotropyRatioXY: 1,
        spectralEntropy: 0,
        cognitiveLoadSignature: 'CALM_DIRECT',
        bins: []
      }
    };
  }

  // 1. Compute Kinematics over trajectory
  let totalPath = 0;
  let sumV = 0;
  let peakV = 0;
  let sumAcc = 0;
  let sumJerkSq = 0;
  let reversals = 0;
  let prevVx = 0;
  let prevVy = 0;
  let prevV = 0;
  let prevAcc = 0;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dt = Math.max(1, p1.t - p0.t);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.hypot(dx, dy);
    totalPath += dist;

    const v = p1.v;
    sumV += v;
    if (v > peakV) peakV = v;

    const acc = (v - prevV) / dt;
    sumAcc += Math.abs(acc);

    const jerk = (acc - prevAcc) / dt;
    sumJerkSq += jerk * jerk;

    if (i > 1 && (p1.vx * prevVx < -0.02 || p1.vy * prevVy < -0.02)) {
      reversals++;
    }
    prevVx = p1.vx;
    prevVy = p1.vy;
    prevV = v;
    prevAcc = acc;
  }

  const count = points.length - 1;
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const netDisp = Math.hypot(lastPt.x - firstPt.x, lastPt.y - firstPt.y);
  const directness = totalPath > 1 ? Number(Math.min(1, netDisp / totalPath).toFixed(3)) : 1;

  const kinematics: DerivedKinematics = {
    instantVelocityPxMs: lastPt.v,
    meanVelocityPxMs: Number((sumV / count).toFixed(3)),
    peakVelocityPxMs: Number(peakV.toFixed(3)),
    meanAccelerationPxMs2: Number((sumAcc / count).toFixed(4)),
    rmsJerkPxMs3: Number(Math.sqrt(sumJerkSq / count).toFixed(5)),
    totalPathLengthPx: Math.round(totalPath),
    directnessIndex: directness,
    directionReversals: reversals
  };

  // 2. Compute 2D Spatial-Temporal Spectral Decomposition (2D-FFT over last N=64 points)
  const slice = points.slice(-64);
  const N = slice.length;
  const totalTimeSec = Math.max(0.1, (slice[N - 1].t - slice[0].t) / 1000);
  const fs = Number(Math.min(60, Math.max(4, N / totalTimeSec)).toFixed(1));

  // Remove DC mean from vx and vy signals and apply Hann window
  const meanVx = slice.reduce((acc, p) => acc + p.vx, 0) / N;
  const meanVy = slice.reduce((acc, p) => acc + p.vy, 0) / N;

  const sigX = slice.map((p, n) => {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / Math.max(1, N - 1)));
    return (p.vx - meanVx) * w;
  });
  const sigY = slice.map((p, n) => {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / Math.max(1, N - 1)));
    return (p.vy - meanVy) * w;
  });

  const targetFreqs = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.5, 7.0, 9.0];
  const bins: SpectralBin2D[] = [];

  let lowPower = 0;
  let midPower = 0;
  let highPower = 0;
  let totalPowerX = 0;
  let totalPowerY = 0;
  let maxPx = -1;
  let maxPy = -1;
  let domFx = 0;
  let domFy = 0;

  targetFreqs.forEach(freqHz => {
    let reX = 0, imX = 0, reY = 0, imY = 0;
    for (let n = 0; n < N; n++) {
      const tSec = (slice[n].t - slice[0].t) / 1000;
      const angle = 2 * Math.PI * freqHz * tSec;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      reX += sigX[n] * cosA;
      imX -= sigX[n] * sinA;
      reY += sigY[n] * cosA;
      imY -= sigY[n] * sinA;
    }
    const pX = Number(((reX * reX + imX * imX) / N).toFixed(4));
    const pY = Number(((reY * reY + imY * imY) / N).toFixed(4));
    const p2D = Number((pX + pY).toFixed(4));

    bins.push({ freqHz, powerX: pX, powerY: pY, power2D: p2D });

    totalPowerX += pX;
    totalPowerY += pY;

    if (pX > maxPx) { maxPx = pX; domFx = freqHz; }
    if (pY > maxPy) { maxPy = pY; domFy = freqHz; }

    if (freqHz <= 1.5) lowPower += p2D;
    else if (freqHz <= 4.0) midPower += p2D;
    else highPower += p2D;
  });

  const sumAll = lowPower + midPower + highPower + 1e-6;
  let entropy = 0;
  bins.forEach(b => {
    const prob = b.power2D / sumAll;
    if (prob > 1e-5) {
      entropy -= prob * Math.log2(prob);
    }
  });
  const normEntropy = Number(Math.min(1, entropy / Math.log2(bins.length)).toFixed(3));
  const anisotropy = Number((totalPowerX / Math.max(0.0001, totalPowerY)).toFixed(2));

  let signature: Derived2DFFTSpectrum['cognitiveLoadSignature'] = 'CALM_DIRECT';
  if (highPower > midPower && highPower > lowPower * 0.8) {
    signature = 'HIGH_HESITATION';
  } else if (midPower >= lowPower) {
    signature = 'ACTIVE_SCANNING';
  } else if (normEntropy > 0.78) {
    signature = 'EXPLORATORY_DRIFT';
  }

  return {
    kinematics,
    hoverAnalytics,
    fft2D: {
      sampleCountUsed: N,
      effectiveSampleRateHz: fs,
      dominantFrequencyXHz: domFx,
      dominantFrequencyYHz: domFy,
      lowFreqMacroNavPower: Number(lowPower.toFixed(4)),
      midFreqScanPower: Number(midPower.toFixed(4)),
      highFreqTremorPower: Number(highPower.toFixed(4)),
      anisotropyRatioXY: anisotropy,
      spectralEntropy: normEntropy,
      cognitiveLoadSignature: signature,
      bins
    }
  };
}

// ============================================================================
// BESPOKE EVOLVING LINE-ART ENGINE (4 Developmental Stages + Golden Cell Bloom)
// ============================================================================

interface CellSvgUnderlayProps {
  word: string;
  aliveness: number;          // 0.00 to 1.00 time-based awakening factor
  hoverDwellMs: number;       // How long pointer has hovered in THIS cell
  isHovered: boolean;         // Currently hovered by mouse/finger
  isCandidateMatch: boolean;  // Shares prefix with target
  isTarget: boolean;          // Is the "Golden Cell"
  level: number;
  animTick: number;
  anmFigureMode?: AnmFigureMode;
}

const CellSvgUnderlay: React.FC<CellSvgUnderlayProps> = ({
  word,
  aliveness,
  hoverDwellMs,
  isHovered,
  isCandidateMatch,
  isTarget,
  level,
  animTick,
  anmFigureMode = 'hybrid'
}) => {
  const hoverBoost = Math.min(1, hoverDwellMs / 1800);
  const effectiveAliveness = Math.min(1, Math.max(0.32, aliveness + hoverBoost * 0.75 + (isHovered ? 0.25 : 0)));

  // Golden Cell Evolution Stage (1..4) when hovering the correct target cell
  const goldenEvolution = isTarget ? Math.min(1, hoverDwellMs / 2600) : 0;
  const devStage = isTarget
    ? (hoverDwellMs > 2400 ? 4 : hoverDwellMs > 1300 ? 3 : hoverDwellMs > 450 ? 2 : 1)
    : (hoverDwellMs > 900 ? 2 : 1);

  // Stage 1: Line drawing traces itself
  const drawProgress = Math.min(1, effectiveAliveness / 0.45);
  const dashOffset = Math.round(320 * (1 - drawProgress));

  // Stage 2: European color fill & organic motion
  const fillProgress = Math.min(1, Math.max(0.25, (effectiveAliveness - 0.15) / 0.5));
  const motionAmp = Math.min(1.6, Math.max(0.2, (effectiveAliveness - 0.10) + goldenEvolution * 0.7));

  const w = word.toLowerCase();

  // Map all 17 classic Leesplankje words + L0 single letters + L1-L5 vocabulary to a Leesplankje WebP figure!
  const LEESPLANK_WORD_ALIASES: Record<string, string> = {
    a: 'aap',
    b: 'bok',
    c: 'schapen',
    d: 'does',
    e: 'weide',
    f: 'duif',
    g: 'gijs',
    h: 'hok',
    i: 'wim',
    j: 'jet',
    k: 'kees',
    l: 'lam',
    m: 'mies',
    n: 'noot',
    o: 'noot',
    p: 'aap',
    q: 'kees',
    r: 'vuur',
    s: 'schapen',
    t: 'teun',
    u: 'duif',
    v: 'vuur',
    w: 'wim',
    x: 'bok',
    y: 'wim',
    z: 'zus',
    schaap: 'lam',
    vlam: 'vuur',
    stoom: 'vuur',
    kat: 'mies',
    cat: 'mies',
    vos: 'does',
    fox: 'does',
    hond: 'kees',
    dog: 'kees',
    koe: 'weide',
    cow: 'weide',
    boer: 'teun',
    hoed: 'teun',
    hat: 'teun',
    vogel: 'duif',
    vleugel: 'duif',
    kip: 'duif',
    huis: 'hok',
    dak: 'hok',
    stoep: 'hok',
    schuur: 'hok',
    school: 'hok',
    deur: 'hok',
    boom: 'schapen',
    hout: 'schapen',
    auto: 'bok',
    car: 'bok',
    koek: 'noot',
    bal: 'noot',
    zon: 'vuur',
    sun: 'vuur',
    boy: 'wim',
    vis: 'weide',
    voet: 'wim',
    vinger: 'wim',
    bed: 'zus',
    stoel: 'zus',
    bank: 'zus',
    boek: 'wim',
    bord: 'wim',
    doos: 'wim'
  };

  // Lookup separate cut-out Leesplankje WebP figure image (17 classic figures + vocabulary aliases)
  const anmFigure: AapNootMiesFigureAsset | undefined =
    AAP_NOOT_MIES_FIGURES[w] ||
    (LEESPLANK_WORD_ALIASES[w] ? AAP_NOOT_MIES_FIGURES[LEESPLANK_WORD_ALIASES[w]] : undefined);

  const getIllustrationType = (str: string): string => {
    const resolved = LEESPLANK_WORD_ALIASES[str] || str;
    if (AAP_NOOT_MIES_FIGURES[resolved]) return `jetses_${resolved}`;
    if (str.length === 1) return 'letter_constellation';
    if (['boy', 'boer', 'aunt'].includes(str)) return 'friendly_character';
    if (['vogel', 'vleugel', 'kip', 'bat', 'beak'].includes(str)) return 'bird';
    if (['kat', 'cat', 'vos', 'fox'].includes(str)) return 'cat';
    if (['hond', 'dog', 'beer', 'bear', 'koe', 'cow', 'haas', 'hert', 'boar'].includes(str)) return 'animal';
    if (['zon', 'sun', 'august', 'dawn', 'days'].includes(str)) return 'sun';
    if (['boot', 'boat', 'schip', 'zee', 'coal', 'coat'].includes(str)) return 'boat';
    if (['boom', 'hout', 'autumn', 'tak'].includes(str)) return 'tree';
    if (['deur'].includes(str)) return 'door';
    if (['hoed', 'hat'].includes(str)) return 'hat';
    if (['koek', 'cookie'].includes(str)) return 'cookie';
    if (['vlinder'].includes(str)) return 'butterfly';
    if (['vliegtuig'].includes(str)) return 'plane';
    if (['huis', 'dak', 'school', 'schuur', 'bed', 'bank', 'stoel', 'stad', 'vloer'].includes(str)) return 'house';
    if (['vis', 'schelp'].includes(str)) return 'fish';
    if (['boek', 'book', 'bord', 'doos', 'box'].includes(str)) return 'book';
    if (['auto', 'car'].includes(str)) return 'car';
    return 'harmonic_bloom';
  };

  const kind = getIllustrationType(w);
  const primaryStroke = isTarget && goldenEvolution > 0.2
    ? '#f3c663'
    : (isCandidateMatch || isHovered ? '#d4b483' : '#64748b');
  const secondaryStroke = isTarget && goldenEvolution > 0.4
    ? '#7eaba0'
    : (isCandidateMatch ? '#7eaba0' : '#475569');
  const accentColor = isTarget ? '#f59e0b' : '#8a99b8';

  // Default: NO wiggling (sway = 0, bob = 0) so figures stay calm & steady while the 1960s Motion-Lamp glows behind them
  const sway = 0;
  const bob = 0;
  const pulse = 1 + goldenEvolution * 0.05;
  const wingAngle = Math.sin(animTick * 2.4) * 6 * motionAmp;

  // ALWAYS render the transparent Alpha-Channel WebP Leesplankje figure + 1960s Motion-Lamp when anmFigure exists!
  const showCutoutImage = Boolean(anmFigure);
  const showVectorArt = !anmFigure || anmFigureMode === 'vector';
  const imgW = anmFigure?.isLandscape ? 166 : 128;
  const imgH = anmFigure?.isLandscape ? 104 : 112;
  const imgX = -imgW / 2;
  const imgY = -imgH / 2;
  const frameDashOffset = Math.round(440 * (1 - drawProgress));

  // Unique deterministic per-word seed so each cell's rotating kitsch-lamp WebP has its own speed, angle & direction
  let wordHash = (anmFigure?.index || 1) * 97;
  for (let c = 0; c < w.length; c++) {
    wordHash = (wordHash * 31 + w.charCodeAt(c)) % 997;
  }
  const seedA = (wordHash % 100) / 100;
  const seedB = ((wordHash * 7) % 100) / 100;
  const seedC = ((wordHash * 13) % 100) / 100;

  // 1960s Econolite Motion-Lamp Rippled Cylinder WebP:
  // Strictly masked to the figure silhouette so ONLY the figure itself is subtly, actively lit,
  // with ZERO background effect outside the figure!
  const lampPrimary = anmFigure?.lampPrimaryHex || primaryStroke;
  const lampSecondary = anmFigure?.lampSecondaryHex || secondaryStroke;
  const lampWarmth = anmFigure?.lampWarmthHex || accentColor;
  const rotDirection = wordHash % 2 === 0 ? 1 : -1;
  // Calm, authentic 1960s convection heat-cylinder rotation speed (11..20 deg/sec)
  const wheelDegPerSec = (11 + seedA * 9) * (1 + (isHovered ? 0.25 : 0) + goldenEvolution * 0.20);
  const lampWheelAngle1 = (rotDirection * animTick * wheelDegPerSec + seedB * 360) % 360;
  const lampWheelAngle2 = (-rotDirection * animTick * (wheelDegPerSec * 0.58) + seedC * 360) % 360;
  const wheelDiameter = Math.round(Math.hypot(imgW, imgH) * 1.15);
  const wheelHalf = wheelDiameter / 2;
  const colorSatValue = (1.14 + effectiveAliveness * 0.14 + goldenEvolution * 0.22 + (isHovered ? 0.14 : 0)).toFixed(2);

  return (
    <svg
      viewBox="0 0 200 136"
      className="w-full h-full pointer-events-none select-none overflow-hidden"
      style={{
        opacity: Math.min(0.99, (showCutoutImage ? 0.96 : 0.45) + effectiveAliveness * 0.04),
        transition: 'opacity 0.2s linear'
      }}
    >
      <defs>
        {showCutoutImage && anmFigure && (
          <>
            <clipPath id={`anm-clip-${w}`}>
              <rect x={imgX} y={imgY} width={imgW} height={imgH} rx="14" ry="14" />
            </clipPath>
            <filter id={`anm-sat-${w}`} x="-5%" y="-5%" width="110%" height="110%">
              <feColorMatrix type="saturate" values={colorSatValue} />
            </filter>
          </>
        )}
      </defs>

      {/* 1960s ECONOLITE FIGURE-ONLY MOTION LAMP:
          - Background of `<word>.webp` is 100% opaque (alpha = 1.0) -> ZERO background motion or clutter!
          - Dark ink outlines of `<word>.webp` are 100% opaque (alpha = 1.0) -> crisp Cornelis Jetses line art!
          - ONLY the figure's painted colors & highlights have translucent 1960s lithograph windows (alpha = 0.44..0.84),
            so the rotating rippled waterfall/ember cylinder (`lamp_<word>.webp`) behind the image actively lights up ONLY the figure! */}
      {showCutoutImage && anmFigure && (
        <g transform="translate(100, 68)">
          <g clipPath={`url(#anm-clip-${w})`}>
            {/* 1. Calm dark inner lamp housing behind the figure's translucent pigment windows */}
            <rect x={imgX} y={imgY} width={imgW} height={imgH} fill="#1c1917" />

            {/* 2. Rotating 1960s Econolite Rippled Waterfall/Ember Cylinder strictly behind the central figure */}
            {anmFigure.lampWebpDataUri && (
              <g opacity={Math.min(0.95, 0.76 + effectiveAliveness * 0.12 + goldenEvolution * 0.12)}>
                <image
                  href={anmFigure.lampWebpDataUri}
                  x={-wheelHalf * 0.84}
                  y={-wheelHalf * 0.84}
                  width={wheelDiameter * 0.84}
                  height={wheelDiameter * 0.84}
                  preserveAspectRatio="none"
                  transform={`rotate(${lampWheelAngle1.toFixed(1)})`}
                />
                <image
                  href={anmFigure.lampWebpDataUri}
                  x={-wheelHalf * 0.76}
                  y={-wheelHalf * 0.76}
                  width={wheelDiameter * 0.76}
                  height={wheelDiameter * 0.76}
                  preserveAspectRatio="none"
                  opacity="0.48"
                  transform={`rotate(${lampWheelAngle2.toFixed(1)})`}
                />
              </g>
            )}

            {/* 3. 100% Stationary `<word>.webp` on top (Opaque background blocks all peripheral light; translucent figure pigments glow!) */}
            <image
              href={anmFigure.webpDataUri || anmFigure.dataUri}
              x={imgX}
              y={imgY}
              width={imgW}
              height={imgH}
              preserveAspectRatio="xMidYMid meet"
              filter={`url(#anm-sat-${w})`}
            />
          </g>

          {/* Subtle Montessori Picture Frame */}
          <rect
            x={imgX}
            y={imgY}
            width={imgW}
            height={imgH}
            rx="14"
            ry="14"
            fill="none"
            stroke={primaryStroke}
            strokeWidth={1.6 + goldenEvolution * 1.2}
            strokeOpacity="0.65"
          />
        </g>
      )}

      {/* Stage 4 Golden Cell Crown / Brain-Rocket Resonance Badge (Static, No Orbiting Circles) */}
      {devStage >= 3 && isTarget && (
        <g transform="translate(100, 14)" opacity={goldenEvolution}>
          <polygon points="-14,6 -9,-6 -3,2 0,-9 3,2 9,-6 14,6" fill="#f59e0b" fillOpacity="0.45" stroke="#fde68a" strokeWidth="1.5" />
        </g>
      )}

      {/* ================================================================== */}
      {/* 17 ICONIC CORNELIS JETSES / HOOGEVEEN LEESPLANKJE HOMAGE FIGURES   */}
      {/* ================================================================== */}
      {showVectorArt && (
      <g opacity={showCutoutImage ? (anmFigureMode === 'vector' ? 0.35 : 0.16 + goldenEvolution * 0.22) : 1}>

      {/* 1. AAP: Monkey sitting on wooden perch holding fruit with curling tail */}
      {kind === 'jetses_aap' && (
        <g transform={`translate(100, ${74 + bob * 0.4}) scale(${pulse})`}>
          {/* Wooden perch branch */}
          <path d="M -46 24 L 46 20" stroke={accentColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="320" strokeDashoffset={dashOffset} />
          {/* Curling articulated tail */}
          <path
            d={`M 12 20 C 34 26 ${44 + sway} 8 ${36 + bob} -8 C 30 -18 20 -12 24 -4`}
            fill="none"
            stroke={primaryStroke}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Seated body & haunches */}
          <ellipse cx="-2" cy="8" rx="15" ry="18" fill={primaryStroke} fillOpacity={0.22 * fillProgress} stroke={primaryStroke} strokeWidth="2.2" strokeDasharray="320" strokeDashoffset={dashOffset} />
          {/* Head & Ears */}
          <g transform={`translate(-4, ${-16 + bob * 0.3}) rotate(${sway * 0.4})`}>
            <circle cx="-16" cy="-2" r="6" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
            <circle cx="16" cy="-2" r="6" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
            <circle cx="0" cy="-2" r="14" fill={primaryStroke} fillOpacity={0.25 * fillProgress} stroke={primaryStroke} strokeWidth="2.2" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <ellipse cx="0" cy="4" rx="10" ry="7" fill={secondaryStroke} fillOpacity={0.22 * fillProgress} stroke={secondaryStroke} strokeWidth="1.5" />
            <circle cx="-5" cy="-4" r="2.2" fill="#fff" opacity={drawProgress} />
            <circle cx="5" cy="-4" r="2.2" fill="#fff" opacity={drawProgress} />
            <path d="M -4 5 Q 0 9 4 5" fill="none" stroke={primaryStroke} strokeWidth="1.8" strokeLinecap="round" />
          </g>
          {/* Arm holding fruit */}
          <path d={`M -10 2 Q ${-26 - sway * 0.4} -4 -18 -12`} fill="none" stroke={primaryStroke} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx={-18 - sway * 0.2} cy="-13" r="4.5" fill="#c48d84" fillOpacity={0.6 * fillProgress} stroke={secondaryStroke} strokeWidth="1.5" />
        </g>
      )}

      {/* 2. NOOT: Walnut splitting out of its green husk (bolster) with leaves */}
      {kind === 'jetses_noot' && (
        <g transform={`translate(100, ${74 + bob * 0.35}) rotate(${sway * 0.4}) scale(${pulse})`}>
          {/* Oak/Walnut Leaves behind */}
          <path
            d={`M -6 -22 Q -28 -36 ${-38 - sway * 0.4} -14 Q -22 -4 -6 -12`}
            fill="#7eaba0"
            fillOpacity={0.28 * fillProgress}
            stroke="#7eaba0"
            strokeWidth="2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path
            d={`M 6 -22 Q 28 -36 ${38 + sway * 0.4} -14 Q 22 -4 6 -12`}
            fill="#7eaba0"
            fillOpacity={0.28 * fillProgress}
            stroke="#7eaba0"
            strokeWidth="2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Outer green husk (bolster) opening left & right */}
          <path
            d={`M 0 -20 C ${-28 - fillProgress * 6} -16 ${-32 - fillProgress * 6} 18 -6 28`}
            fill="#7eaba0"
            fillOpacity={0.22 * fillProgress}
            stroke={secondaryStroke}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path
            d={`M 0 -20 C ${28 + fillProgress * 6} -16 ${32 + fillProgress * 6} 18 6 28`}
            fill="#7eaba0"
            fillOpacity={0.22 * fillProgress}
            stroke={secondaryStroke}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Inner textured wooden walnut (noot) */}
          <ellipse
            cx="0"
            cy="4"
            rx="16"
            ry="20"
            fill={primaryStroke}
            fillOpacity={0.32 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.3"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Walnut seam & ridges */}
          <line x1="0" y1="-16" x2="0" y2="24" stroke={accentColor} strokeWidth="1.8" opacity={drawProgress} />
          <path d="M -9 -6 Q -5 4 -9 14 M 9 -6 Q 5 4 9 14" fill="none" stroke={primaryStroke} strokeWidth="1.3" opacity={fillProgress} />
        </g>
      )}

      {/* 3. MIES: Girl Mies in classic pinafore apron, bobbed hair & waving arm */}
      {kind === 'jetses_mies' && (
        <g transform={`translate(100, ${72 + bob * 0.4}) scale(${pulse})`}>
          {/* Head & Dutch bobbed hair with bow */}
          <g transform={`translate(0, -22) rotate(${sway * 0.35})`}>
            <path d="M -14 2 C -16 -14 16 -14 14 2" fill={primaryStroke} fillOpacity={0.25 * fillProgress} stroke={primaryStroke} strokeWidth="2.2" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <path d="M 8 -11 L 16 -16 L 14 -7 Z" fill="#c48d84" fillOpacity={0.55 * fillProgress} stroke="#c48d84" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="11" fill={primaryStroke} fillOpacity={0.18 * fillProgress} stroke={primaryStroke} strokeWidth="2" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <circle cx="-4" cy="-1" r="1.8" fill="#fff" opacity={drawProgress} />
            <circle cx="4" cy="-1" r="1.8" fill="#fff" opacity={drawProgress} />
            <path d="M -4 4 Q 0 8 4 4" fill="none" stroke={primaryStroke} strokeWidth="1.6" strokeLinecap="round" />
          </g>
          {/* Classic flared pinafore dress (schortje) */}
          <path
            d="M -10 -10 L 10 -10 L 22 24 L -22 24 Z"
            fill={secondaryStroke}
            fillOpacity={0.24 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path d="M -7 -10 L -9 24 M 7 -10 L 9 24" stroke={secondaryStroke} strokeWidth="1.5" opacity={drawProgress} />
          {/* Waving arms */}
          <path d="M -10 -8 L -22 6" stroke={primaryStroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M 10 -8 Q 22 -14 ${26 + sway * 0.8} ${-20 + bob}`} fill="none" stroke={primaryStroke} strokeWidth="2.2" strokeLinecap="round" />
          {/* Legs & shoes */}
          <line x1="-7" y1="24" x2="-7" y2="34" stroke={primaryStroke} strokeWidth="2.2" />
          <line x1="7" y1="24" x2="7" y2="34" stroke={primaryStroke} strokeWidth="2.2" />
        </g>
      )}

      {/* 4. WIM: Boy Wim in classic belted blouse & trousers, confident stance */}
      {kind === 'jetses_wim' && (
        <g transform={`translate(100, ${72 + bob * 0.4}) scale(${pulse})`}>
          {/* Head with classic parted boy's hair */}
          <g transform={`translate(0, -24) rotate(${sway * 0.35})`}>
            <circle cx="0" cy="0" r="11" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <path d="M -11 -3 Q -4 -14 11 -4" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="-4" cy="-1" r="1.8" fill="#fff" opacity={drawProgress} />
            <circle cx="4" cy="-1" r="1.8" fill="#fff" opacity={drawProgress} />
            <path d="M -4 4 Q 0 7 4 4" fill="none" stroke={primaryStroke} strokeWidth="1.6" strokeLinecap="round" />
          </g>
          {/* Classic tunic blouse & belt */}
          <rect x="-12" y="-12" width="24" height="20" rx="3" fill="#8a99b8" fillOpacity={0.26 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
          <line x1="-12" y1="0" x2="12" y2="0" stroke={accentColor} strokeWidth="2.4" />
          {/* Knee-breeches trousers */}
          <path d="M -11 8 L -13 24 L -3 24 L 0 12 L 3 24 L 13 24 L 11 8 Z" fill={secondaryStroke} fillOpacity={0.22 * fillProgress} stroke={secondaryStroke} strokeWidth="2" strokeDasharray="320" strokeDashoffset={dashOffset} />
          {/* Arms akimbo / waving */}
          <path d="M -12 -10 L -22 -1 L -12 4" fill="none" stroke={primaryStroke} strokeWidth="2.1" strokeLinejoin="round" />
          <path d={`M 12 -10 L ${24 + sway * 0.6} ${-8 + bob * 0.5}`} fill="none" stroke={primaryStroke} strokeWidth="2.1" strokeLinecap="round" />
          {/* Legs */}
          <line x1="-8" y1="24" x2="-8" y2="34" stroke={primaryStroke} strokeWidth="2.2" />
          <line x1="8" y1="24" x2="8" y2="34" stroke={primaryStroke} strokeWidth="2.2" />
        </g>
      )}

      {/* 5. ZUS: Sister Zus cradling her doll (pop) with gentle rocking motion */}
      {kind === 'jetses_zus' && (
        <g transform={`translate(100, ${72 + bob * 0.35}) rotate(${sway * 0.3}) scale(${pulse})`}>
          {/* Head & braided bun */}
          <circle cx="0" cy="-23" r="10.5" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
          <circle cx="-11" cy="-25" r="4" fill={accentColor} fillOpacity={0.3 * fillProgress} stroke={primaryStroke} strokeWidth="1.6" />
          <circle cx="-3.5" cy="-24" r="1.6" fill="#fff" opacity={drawProgress} />
          <circle cx="3.5" cy="-24" r="1.6" fill="#fff" opacity={drawProgress} />
          <path d="M -3 19 Q 0 22 3 19" transform="translate(0, -39)" fill="none" stroke={primaryStroke} strokeWidth="1.5" />
          {/* Long dress & white apron */}
          <path d="M -11 -12 L 11 -12 L 24 28 L -24 28 Z" fill="#c48d84" fillOpacity={0.22 * fillProgress} stroke={primaryStroke} strokeWidth="2.2" strokeDasharray="320" strokeDashoffset={dashOffset} />
          <path d="M -8 -10 L 8 -10 L 13 24 L -13 24 Z" fill="#fff" fillOpacity={0.18 * fillProgress} stroke={secondaryStroke} strokeWidth="1.6" />
          {/* Cradled doll (pop) rocking in arms */}
          <g transform={`translate(${2 + sway * 0.4}, ${-1 + bob * 0.3}) rotate(${-15 + sway * 0.6})`}>
            <circle cx="-8" cy="-3" r="4.5" fill={primaryStroke} stroke="#fff" strokeWidth="1.4" />
            <path d="M -5 0 L 10 4 L 7 11 L -8 6 Z" fill="#d4b483" fillOpacity={0.5 * fillProgress} stroke={primaryStroke} strokeWidth="1.6" />
          </g>
        </g>
      )}

      {/* 6. JET: Girl Jet with shoulder ribbons curtsying with flared skirt */}
      {kind === 'jetses_jet' && (
        <g transform={`translate(100, ${72 + bob * 0.45}) scale(${pulse})`}>
          {/* Head tilting politely */}
          <g transform={`translate(0, -23) rotate(${-sway * 0.5})`}>
            <circle cx="0" cy="0" r="10.5" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
            {/* Hair ribbons */}
            <path d="M -10 -6 L -18 -11 L -15 -3 Z M 10 -6 L 18 -11 L 15 -3 Z" fill="#c48d84" stroke={primaryStroke} strokeWidth="1.4" />
            <circle cx="-3.5" cy="-1" r="1.7" fill="#fff" opacity={drawProgress} />
            <circle cx="3.5" cy="-1" r="1.7" fill="#fff" opacity={drawProgress} />
            <path d="M -3.5 4 Q 0 7 3.5 4" fill="none" stroke={primaryStroke} strokeWidth="1.6" />
          </g>
          {/* Curtsying wide skirt held out by hands */}
          <path
            d={`M -9 -12 L 9 -12 L ${28 + sway * 0.5} 22 Q 0 28 ${-28 - sway * 0.5} 22 Z`}
            fill="#9b8c9a"
            fillOpacity={0.26 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path d={`M -9 -10 L ${-25 - sway * 0.4} 12 M 9 -10 L ${25 + sway * 0.4} 12`} stroke={primaryStroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="-6" y1="24" x2="-6" y2="34" stroke={primaryStroke} strokeWidth="2.1" />
          <line x1="6" y1="24" x2="6" y2="34" stroke={primaryStroke} strokeWidth="2.1" />
        </g>
      )}

      {/* 7. TEUN: Boy Teun with his peaked cap (pet) & neckerchief */}
      {kind === 'jetses_teun' && (
        <g transform={`translate(100, ${73 + bob * 0.4}) scale(${pulse})`}>
          {/* Head with classic Dutch peaked cap (pet) */}
          <g transform={`translate(0, -23) rotate(${sway * 0.4})`}>
            <circle cx="0" cy="0" r="10.5" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
            {/* Cap crown & visor */}
            <path d="M -12 -5 C -12 -15 10 -15 12 -5 Z" fill="#8a99b8" fillOpacity={0.45 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
            <path d="M 4 -5 L 18 -3 L 10 -1 Z" fill={accentColor} stroke={primaryStroke} strokeWidth="1.6" />
            <circle cx="-3" cy="0" r="1.7" fill="#fff" opacity={drawProgress} />
            <circle cx="4" cy="0" r="1.7" fill="#fff" opacity={drawProgress} />
            <path d="M -3 5 Q 1 8 5 5" fill="none" stroke={primaryStroke} strokeWidth="1.6" />
          </g>
          {/* Neckerchief & jacket */}
          <polygon points="-8,-12 8,-12 0,-3" fill="#c48d84" fillOpacity={0.55 * fillProgress} stroke="#c48d84" strokeWidth="1.4" />
          <rect x="-12" y="-11" width="24" height="22" rx="3" fill={secondaryStroke} fillOpacity={0.22 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
          {/* Cheerful waving arms */}
          <path d={`M -12 -8 L ${-25 - sway * 0.5} ${-16 - bob * 0.4}`} stroke={primaryStroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M 12 -8 L ${25 + sway * 0.5} ${-14 + bob * 0.4}`} stroke={primaryStroke} strokeWidth="2.2" strokeLinecap="round" />
          {/* Trousers */}
          <path d="M -10 11 L -11 32 M 10 11 L 11 32" stroke={primaryStroke} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}

      {/* 8. VUUR: Classic tripod (driepoot) with kettle over crackling wood fire */}
      {kind === 'jetses_vuur' && (
        <g transform="translate(100, 76)">
          {/* Iron tripod legs (driepoot) */}
          <path
            d="M -38 30 L 0 -38 L 38 30 M 0 -38 L 0 28"
            fill="none"
            stroke={secondaryStroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Hanging chain & black cooking pot (ketel) */}
          <line x1="0" y1="-38" x2="0" y2="-16" stroke={primaryStroke} strokeWidth="1.8" />
          <g transform={`translate(0, ${-6 + bob * 0.25})`}>
            <path d="M -14 -8 C -14 -16 14 -16 14 -8" fill="none" stroke={primaryStroke} strokeWidth="1.8" />
            <ellipse cx="0" cy="0" rx="16" ry="11" fill="#1e293b" stroke={primaryStroke} strokeWidth="2.2" strokeDasharray="320" strokeDashoffset={dashOffset} />
          </g>
          {/* Burning logs */}
          <path d="M -24 28 L 24 20 M -24 20 L 24 28" stroke="#c48d84" strokeWidth="3.5" strokeLinecap="round" />
          {/* Crackling animated flames rising under the pot */}
          <path
            d={`M -16 22 Q ${-10 + sway * 0.6} ${4 + bob} -4 14 Q 0 ${-4 - bob} ${4 - sway * 0.5} 14 Q 12 ${6 + bob} 16 22 Z`}
            fill="#f59e0b"
            fillOpacity={0.45 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Rising smoke curls */}
          <path
            d={`M -4 -20 Q ${-12 + sway} -30 ${-2 - sway} -40`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity={0.6 * fillProgress}
          />
        </g>
      )}

      {/* 9. GIJS: Boy Gijs rolling his classic wooden hoop (hoepel) with a stick */}
      {kind === 'jetses_gijs' && (
        <g transform={`translate(100, ${74 + bob * 0.35}) scale(${pulse})`}>
          {/* Gijs running on the left */}
          <g transform={`translate(-22, 0) rotate(${6 + sway * 0.3})`}>
            <circle cx="0" cy="-22" r="9.5" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <path d="M -8 -12 L 8 -12 L 10 10 L -10 10 Z" fill="#8a99b8" fillOpacity={0.25 * fillProgress} stroke={primaryStroke} strokeWidth="2" strokeDasharray="320" strokeDashoffset={dashOffset} />
            {/* Running legs */}
            <path d={`M -4 10 L ${-14 - sway * 0.5} 28 M 4 10 L ${12 + sway * 0.5} 26`} stroke={primaryStroke} strokeWidth="2.3" strokeLinecap="round" />
            {/* Arm holding hoop-stick (stokje) */}
            <path d="M 6 -8 L 22 0" stroke={primaryStroke} strokeWidth="2.1" strokeLinecap="round" />
            <line x1="20" y1="-1" x2="36" y2="10" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Rotating wooden hoop (hoepel) on the right */}
          <g transform={`translate(22, 8) rotate(${animTick * 65 * motionAmp})`}>
            <circle
              cx="0"
              cy="0"
              r="20"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="2.8"
              strokeDasharray="320"
              strokeDashoffset={dashOffset}
            />
            <line x1="-20" y1="0" x2="20" y2="0" stroke={secondaryStroke} strokeWidth="1.3" opacity={fillProgress} />
            <line x1="0" y1="-20" x2="0" y2="20" stroke={secondaryStroke} strokeWidth="1.3" opacity={fillProgress} />
          </g>
        </g>
      )}

      {/* 10. LAM: Little white lamb in the grass, wagging its tail */}
      {kind === 'jetses_lam' && (
        <g transform={`translate(100, ${74 + bob * 0.4}) scale(${pulse})`}>
          {/* Grass tufts */}
          <path d="M -42 28 L -38 20 L -34 28 M 30 28 L 34 20 L 38 28" fill="none" stroke="#7eaba0" strokeWidth="1.8" opacity={drawProgress} />
          {/* Woolly body */}
          <path
            d="M -22 -4 C -26 -14 -10 -18 -2 -12 C 6 -18 20 -14 18 -4 C 24 4 18 16 8 14 C 0 18 -10 18 -16 14 C -26 16 -28 4 -22 -4 Z"
            fill="#fff"
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Wagging lamb tail */}
          <path d={`M -23 2 L ${-34 - sway * 0.7} ${8 + bob * 0.6}`} stroke={primaryStroke} strokeWidth="2.6" strokeLinecap="round" />
          {/* Lamb head & perky ears */}
          <g transform={`translate(20, ${-10 + bob * 0.4}) rotate(${sway * 0.4})`}>
            <ellipse cx="0" cy="0" rx="9" ry="7" fill={primaryStroke} fillOpacity={0.22 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
            <ellipse cx="-8" cy="-4" rx="5" ry="2.2" transform="rotate(-25 -8 -4)" fill={secondaryStroke} stroke={primaryStroke} strokeWidth="1.5" />
            <circle cx="3" cy="-1.5" r="1.6" fill="#fff" opacity={drawProgress} />
          </g>
          {/* Four slender legs */}
          <path d="M -14 14 L -15 28 M -6 14 L -6 28 M 6 14 L 6 28 M 13 14 L 14 28" stroke={primaryStroke} strokeWidth="2.1" strokeLinecap="round" />
        </g>
      )}

      {/* 11. KEES: Boy Kees with his cap and iconic Dutch wooden clogs (klompen) */}
      {kind === 'jetses_kees' && (
        <g transform={`translate(100, ${72 + bob * 0.35}) scale(${pulse})`}>
          {/* Head & cap */}
          <g transform={`translate(0, -24) rotate(${sway * 0.35})`}>
            <circle cx="0" cy="0" r="10" fill={primaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <path d="M -11 -4 C -10 -14 10 -14 11 -4 L 16 -3" fill={secondaryStroke} fillOpacity={0.4 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
            <circle cx="-3" cy="0" r="1.6" fill="#fff" opacity={drawProgress} />
            <circle cx="4" cy="0" r="1.6" fill="#fff" opacity={drawProgress} />
          </g>
          {/* Farmer's smock & baggy trousers */}
          <path d="M -12 -13 L 12 -13 L 15 8 L -15 8 Z" fill="#8a99b8" fillOpacity={0.25 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
          <path d="M -13 8 L -14 25 L -2 25 L 0 14 L 2 25 L 14 25 L 13 8 Z" fill={primaryStroke} fillOpacity={0.18 * fillProgress} stroke={primaryStroke} strokeWidth="2" strokeDasharray="320" strokeDashoffset={dashOffset} />
          {/* Iconic yellow wooden clogs (klompen) */}
          <path d={`M -16 30 C -18 25 -4 25 -4 30 Z`} fill="#d4b483" fillOpacity={0.65 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
          <path d={`M 4 30 C 4 25 18 25 16 30 Z`} fill="#d4b483" fillOpacity={0.65 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
        </g>
      )}

      {/* 12. BOK: Billy goat (bok) with curved horns and pointed beard (sik) */}
      {kind === 'jetses_bok' && (
        <g transform={`translate(100, ${74 + bob * 0.35}) scale(${pulse})`}>
          {/* Goat body & upright tail */}
          <path
            d="M -24 -4 L 14 -6 L 18 12 L -22 12 Z"
            fill={primaryStroke}
            fillOpacity={0.2 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path d="M -24 -4 L -30 -12" stroke={primaryStroke} strokeWidth="2.4" strokeLinecap="round" />
          {/* Nodding head with curved horns & goatee beard (sik) */}
          <g transform={`translate(20, -12) rotate(${sway * 0.55})`}>
            {/* Curved ridged horns */}
            <path d="M -2 -6 C -6 -22 -22 -24 -26 -14" fill="none" stroke={accentColor} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <path d="M 2 -6 C -2 -20 -16 -22 -20 -12" fill="none" stroke={primaryStroke} strokeWidth="2" strokeLinecap="round" />
            {/* Head & snout */}
            <path d="M -6 -6 L 14 0 L 12 6 L -6 4 Z" fill={primaryStroke} fillOpacity={0.24 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
            {/* Pointed beard (sik) */}
            <path d={`M 8 6 L ${10 + sway * 0.3} 16 L 4 6`} fill="none" stroke={primaryStroke} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="2" cy="-2" r="1.6" fill="#fff" opacity={drawProgress} />
          </g>
          {/* Four sturdy legs */}
          <path d="M -18 12 L -20 28 M -10 12 L -10 28 M 8 12 L 8 28 M 15 12 L 17 28" stroke={primaryStroke} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}

      {/* 13. WEIDE: Dutch meadow with pollard willow (knotwilg), fence & birds */}
      {kind === 'jetses_weide' && (
        <g transform="translate(100, 78)">
          {/* Horizon meadow & ditch water */}
          <path d={`M -62 12 Q -20 ${6 + bob * 0.3} 62 12`} fill="none" stroke="#7eaba0" strokeWidth="2.4" strokeDasharray="320" strokeDashoffset={dashOffset} />
          <path d="M -48 22 L 48 22" stroke="#8a99b8" strokeWidth="1.8" strokeDasharray="8 6" opacity={fillProgress} />
          {/* Wooden pasture fence (hek) */}
          <path
            d="M -52 12 L -52 -6 M -26 12 L -26 -6 M 0 12 L 0 -6 M -56 -2 L 4 -2 M -56 5 L 4 5"
            stroke={primaryStroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Iconic Dutch Pollard Willow (Knotwilg) */}
          <g transform="translate(30, 12)">
            <path d="M -6 0 L -4 -20 C -8 -24 8 -24 4 -20 L 6 0 Z" fill={accentColor} fillOpacity={0.28 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" strokeDasharray="320" strokeDashoffset={dashOffset} />
            {/* Swaying willow branches */}
            <path
              d={`M -4 -22 L ${-18 + sway * 0.5} -40 M 0 -23 L ${0 + sway * 0.6} -44 M 4 -22 L ${18 + sway * 0.5} -38`}
              stroke="#7eaba0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="320"
              strokeDashoffset={dashOffset}
            />
          </g>
          {/* Meadow birds in the sky */}
          <path d={`M -30 ${-28 + bob} Q -25 -34 -20 ${-28 + bob} Q -15 -34 -10 ${-28 + bob}`} fill="none" stroke={primaryStroke} strokeWidth="1.6" opacity={drawProgress} />
        </g>
      )}

      {/* 14. DOES: Classic shaggy farm dog Does, wagging tail & perky ears */}
      {kind === 'jetses_does' && (
        <g transform={`translate(100, ${74 + bob * 0.4}) scale(${pulse})`}>
          {/* Shaggy coat body */}
          <path
            d="M -24 -4 C -18 -10 8 -10 16 -4 C 20 4 18 14 12 14 L -20 14 C -26 14 -28 4 -24 -4 Z"
            fill={primaryStroke}
            fillOpacity={0.24 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Shaggy fur texture lines */}
          <path d="M -14 0 L -16 8 M -4 -1 L -6 8 M 6 0 L 4 8" stroke={secondaryStroke} strokeWidth="1.6" strokeLinecap="round" opacity={fillProgress} />
          {/* Enthusiastically wagging bushy tail */}
          <path
            d={`M -24 -2 Q ${-38 - sway} ${-16 + bob} ${-30 - sway * 0.8} -22`}
            fill="none"
            stroke={primaryStroke}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Friendly dog head & floppy ear */}
          <g transform={`translate(20, ${-10 + bob * 0.3}) rotate(${sway * 0.4})`}>
            <circle cx="0" cy="0" r="10" fill={primaryStroke} fillOpacity={0.22 * fillProgress} stroke={primaryStroke} strokeWidth="2.1" />
            <path d="M 6 -2 L 16 -1 L 14 5 L 6 5 Z" fill={primaryStroke} fillOpacity={0.25 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
            <path d="M -4 -4 C -8 2 -6 10 -1 8" fill={accentColor} fillOpacity={0.4 * fillProgress} stroke={primaryStroke} strokeWidth="1.8" />
            <circle cx="3" cy="-2" r="1.7" fill="#fff" opacity={drawProgress} />
          </g>
          {/* Legs */}
          <path d="M -18 14 L -19 28 M -10 14 L -10 28 M 8 14 L 8 28 M 14 14 L 15 28" stroke={primaryStroke} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}

      {/* 15. HOK: Wooden doghouse (hok) with pitched roof, arched doorway & bowl */}
      {kind === 'jetses_hok' && (
        <g transform={`translate(100, ${75 + bob * 0.25}) scale(${pulse})`}>
          {/* Pitched wooden plank roof */}
          <path
            d="M -38 -4 L 0 -34 L 38 -4 Z"
            fill="#c48d84"
            fillOpacity={0.28 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Wooden walls */}
          <rect
            x="-28"
            y="-4"
            width="56"
            height="34"
            rx="2"
            fill={primaryStroke}
            fillOpacity={0.18 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Arched dark doorway with golden straw */}
          <path
            d="M -11 30 L -11 10 C -11 0 11 0 11 10 L 11 30 Z"
            fill="#0f172a"
            stroke={secondaryStroke}
            strokeWidth="2"
          />
          <path d={`M -14 30 L -6 ${25 + bob * 0.2} M 0 30 L 4 24 M 12 30 L 6 26`} stroke="#d4b483" strokeWidth="1.8" strokeLinecap="round" opacity={fillProgress} />
          {/* Little food bowl in front */}
          <path d="M 20 26 L 34 26 L 31 32 L 23 32 Z" fill={secondaryStroke} fillOpacity={0.4 * fillProgress} stroke={primaryStroke} strokeWidth="1.6" />
        </g>
      )}

      {/* 16. DUIF: White dove with articulated flapping wings landing on a branch */}
      {kind === 'jetses_duif' && (
        <g transform={`translate(100, ${70 + bob * 0.7}) scale(${pulse})`}>
          {/* Perch branch below */}
          <path d="M -36 26 Q 0 22 36 28" fill="none" stroke="#7eaba0" strokeWidth="2.2" strokeLinecap="round" opacity={drawProgress} />
          {/* Articulated flapping dove wings */}
          <path
            d="M -4 -2 C -18 -28 -38 -24 -42 -6 C -28 2 -14 4 -4 2"
            fill="#fff"
            fillOpacity={0.28 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            transform={`rotate(${wingAngle})`}
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path
            d="M 4 -2 C 16 -26 34 -22 38 -6 C 24 2 12 4 4 2"
            fill="#fff"
            fillOpacity={0.22 * fillProgress}
            stroke={secondaryStroke}
            strokeWidth="2"
            transform={`rotate(${-wingAngle})`}
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {/* Dove body, fanned tail & head with olive twig */}
          <path
            d="M -18 6 C -10 -4 10 -4 18 4 C 14 14 -6 16 -18 6 Z"
            fill="#fff"
            fillOpacity={0.3 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <polygon points="-16,6 -32,2 -30,14" fill={secondaryStroke} fillOpacity={0.3 * fillProgress} stroke={primaryStroke} strokeWidth="1.8" />
          <circle cx="18" cy="-1" r="6" fill="#fff" fillOpacity={0.3 * fillProgress} stroke={primaryStroke} strokeWidth="2" />
          <polygon points="24,-2 30,0 24,2" fill="#f59e0b" />
        </g>
      )}

      {/* 17. SCHAPEN: Flock of three sheep grazing together on the heath/meadow */}
      {kind === 'jetses_schapen' && (
        <g transform="translate(100, 76)">
          {/* Rolling heath hills */}
          <path d="M -60 22 Q -20 12 20 20 T 60 18" fill="none" stroke="#7eaba0" strokeWidth="2" strokeDasharray="320" strokeDashoffset={dashOffset} />
          {/* Three sheep at staggered positions & phases */}
          {[
            { x: -30, y: 4, scale: 0.72, phase: 0 },
            { x: 28, y: 2, scale: 0.76, phase: 1.5 },
            { x: 0, y: 8, scale: 0.92, phase: 0.7 }
          ].map((sh, idx) => {
            const headNod = Math.sin(animTick * 2.2 + sh.phase) * 4 * motionAmp;
            return (
              <g key={idx} transform={`translate(${sh.x}, ${sh.y}) scale(${sh.scale})`}>
                <ellipse
                  cx="0"
                  cy="0"
                  rx="18"
                  ry="11"
                  fill={EUROPEAN_HEX[idx % EUROPEAN_HEX.length]}
                  fillOpacity={0.24 * fillProgress}
                  stroke={idx === 2 ? primaryStroke : secondaryStroke}
                  strokeWidth="2.2"
                  strokeDasharray="320"
                  strokeDashoffset={dashOffset}
                />
                <circle
                  cx="16"
                  cy={-3 + headNod * 0.4}
                  r="6.5"
                  fill="#1e293b"
                  stroke={primaryStroke}
                  strokeWidth="1.8"
                />
                <path d="M -10 10 L -10 20 M 8 10 L 8 20" stroke={primaryStroke} strokeWidth="2" strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      )}

      {/* ================================================================== */}
      {/* GENERAL CURRICULUM ILLUSTRATIONS (L0-L5 Dutch & English)           */}
      {/* ================================================================== */}

      {kind === 'friendly_character' && (
        <g transform={`translate(100, ${74 + bob * 0.5}) scale(${pulse})`}>
          <circle cx="0" cy="-2" r="24" fill={primaryStroke} fillOpacity={0.18 * fillProgress} stroke={primaryStroke} strokeWidth="2.2" strokeDasharray="320" strokeDashoffset={dashOffset} />
          <path d={`M -22 -10 Q -8 -28 0 -20 Q 12 -28 22 -10`} fill="none" stroke={accentColor} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="-8" cy="-4" r="2.8" fill={secondaryStroke} opacity={drawProgress} />
          <circle cx="8" cy="-4" r="2.8" fill={secondaryStroke} opacity={drawProgress} />
          <path d={`M -9 6 Q 0 ${14 + goldenEvolution * 5} 9 6`} fill="none" stroke={primaryStroke} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}

      {kind === 'sheep' && (
        <g transform={`translate(${100 + sway * 0.4}, ${74 + bob * 0.5}) scale(${pulse})`}>
          <path
            d="M -24 -10 C -32 -22 -12 -30 0 -22 C 12 -30 32 -22 24 -10 C 36 0 28 20 12 18 C 4 26 -4 26 -12 18 C -28 20 -36 0 -24 -10 Z"
            fill={primaryStroke}
            fillOpacity={0.2 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <circle cx="-6" cy="-4" r="2.5" fill={secondaryStroke} />
          <circle cx="6" cy="-4" r="2.5" fill={secondaryStroke} />
        </g>
      )}

      {kind === 'meadow' && (
        <g transform="translate(100, 80)">
          <path d={`M -60 16 Q -20 ${-8 + bob} 20 12 T 60 10`} fill="none" stroke="#7eaba0" strokeWidth="2.5" strokeDasharray="320" strokeDashoffset={dashOffset} />
          {[-30, 0, 30].map((xPos, idx) => (
            <g key={idx} transform={`translate(${xPos}, ${6 - idx * 2}) rotate(${sway * 0.8})`}>
              <line x1="0" y1="10" x2="0" y2="-12" stroke="#7eaba0" strokeWidth="2" />
              <circle cx="0" cy="-14" r={5 * pulse} fill={EUROPEAN_HEX[idx]} fillOpacity={0.45 * fillProgress} stroke={primaryStroke} strokeWidth="1.5" />
            </g>
          ))}
        </g>
      )}

      {kind === 'cat' && (
        <g transform={`translate(100, ${74 + bob * 0.5}) scale(${pulse})`}>
          <path
            d={`M -28 -8 L ${-24 + sway * 0.3} -34 L -8 -18 Q 0 -20 8 -18 L ${24 + sway * 0.3} -34 L 28 -8 C 34 14 22 30 0 30 C -22 30 -34 14 -28 -8 Z`}
            fill={primaryStroke}
            fillOpacity={0.18 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <ellipse cx="-10" cy="-2" rx="3.5" ry={3.5 * (1 - Math.abs(Math.sin(animTick)) * 0.3)} fill={secondaryStroke} opacity={drawProgress} />
          <ellipse cx="10" cy="-2" rx="3.5" ry={3.5 * (1 - Math.abs(Math.sin(animTick)) * 0.3)} fill={secondaryStroke} opacity={drawProgress} />
          <polygon points="-3,6 3,6 0,10" fill={accentColor} opacity={fillProgress} />
          <path
            d={`M -16 8 L ${-38 - sway * 0.4} ${4 + bob * 0.3} M -16 12 L ${-38 - sway * 0.4} ${14 - bob * 0.3} M 16 8 L ${38 + sway * 0.4} ${4 + bob * 0.3} M 16 12 L ${38 + sway * 0.4} ${14 - bob * 0.3}`}
            stroke={secondaryStroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
        </g>
      )}

      {kind === 'animal' && (
        <g transform={`translate(100, ${74 + bob * 0.5}) rotate(${sway * 0.4})`}>
          <path
            d="M -26 -14 C -38 -14 -42 8 -30 14 C -26 26 -14 32 0 32 C 14 32 26 26 30 14 C 42 8 38 -14 26 -14 C 18 -26 -18 -26 -26 -14 Z"
            fill={secondaryStroke}
            fillOpacity={0.18 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <circle cx="-10" cy="-4" r="3.2" fill={primaryStroke} opacity={drawProgress} />
          <circle cx="10" cy="-4" r="3.2" fill={primaryStroke} opacity={drawProgress} />
          <ellipse cx="0" cy="8" rx="6" ry="4.5" fill={accentColor} opacity={0.7 * fillProgress} />
          <path d="M -8 18 Q 0 24 8 18" fill="none" stroke={primaryStroke} strokeWidth="2" opacity={drawProgress} />
        </g>
      )}

      {kind === 'sun' && (
        <g transform="translate(100, 70)">
          <circle
            cx="0"
            cy="0"
            r={24 * pulse}
            fill={primaryStroke}
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.4"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <g transform={`rotate(${animTick * 18 * motionAmp})`}>
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="0"
                y1="-30"
                x2="0"
                y2={-42 - (deg % 60 === 0 ? 5 : 0)}
                stroke={deg % 60 === 0 ? primaryStroke : secondaryStroke}
                strokeWidth="2.2"
                strokeLinecap="round"
                transform={`rotate(${deg})`}
                opacity={drawProgress}
              />
            ))}
          </g>
        </g>
      )}

      {kind === 'fire' && (
        <g transform={`translate(100, ${82 + bob * 0.3}) scale(${pulse})`}>
          <path
            d={`M 0 ${-42 - sway * 0.5} C 22 -20 30 0 20 18 C 12 30 -12 30 -20 18 C -30 0 -22 -20 0 ${-42 - sway * 0.5} Z`}
            fill={accentColor}
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path
            d={`M 0 ${-22 + sway * 0.4} C 10 -8 14 6 8 16 C 4 22 -4 22 -8 16 C -14 6 -10 -8 0 ${-22 + sway * 0.4} Z`}
            fill={primaryStroke}
            fillOpacity={0.3 * fillProgress}
            stroke={secondaryStroke}
            strokeWidth="1.8"
          />
        </g>
      )}

      {kind === 'cookie' && (
        <g transform={`translate(100, ${70 + bob * 0.4}) rotate(${sway * 0.6})`}>
          <circle
            cx="0"
            cy="0"
            r={30 * pulse}
            fill={primaryStroke}
            fillOpacity={0.2 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.3"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          {[[-10, -10], [12, -8], [-12, 10], [8, 12], [0, -2]].map(([cx, cy], idx) => (
            <circle key={idx} cx={cx} cy={cy} r="3.2" fill={accentColor} opacity={fillProgress} />
          ))}
        </g>
      )}

      {kind === 'door' && (
        <g transform={`translate(100, ${72 + bob * 0.2})`}>
          <rect
            x="-22"
            y="-32"
            width="44"
            height="64"
            rx="4"
            fill={secondaryStroke}
            fillOpacity={0.18 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <circle cx={12 + sway * 0.2} cy="2" r="3.5" fill={primaryStroke} opacity={drawProgress} />
        </g>
      )}

      {kind === 'hat' && (
        <g transform={`translate(100, ${74 + bob * 0.5}) rotate(${sway * 0.5})`}>
          <ellipse cx="0" cy="14" rx="42" ry="10" fill={secondaryStroke} fillOpacity={0.2 * fillProgress} stroke={primaryStroke} strokeWidth="2.2" />
          <path
            d="M -22 12 L -18 -24 C -18 -30 18 -30 18 -24 L 22 12 Z"
            fill={primaryStroke}
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
        </g>
      )}

      {kind === 'butterfly' && (
        <g transform={`translate(100, ${70 + bob})`}>
          <path
            d="M 0 -4 C -28 -32 -44 -8 -22 6 C -38 18 -24 34 0 12"
            fill={primaryStroke}
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2"
            transform={`scale(${1 - Math.abs(Math.sin(animTick * 3)) * 0.25 * motionAmp}, 1)`}
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path
            d="M 0 -4 C 28 -32 44 -8 22 6 C 38 18 24 34 0 12"
            fill={secondaryStroke}
            fillOpacity={0.22 * fillProgress}
            stroke={secondaryStroke}
            strokeWidth="2"
            transform={`scale(${1 - Math.abs(Math.sin(animTick * 3)) * 0.25 * motionAmp}, 1)`}
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <line x1="0" y1="-16" x2="0" y2="18" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {kind === 'plane' && (
        <g transform={`translate(${100 + sway}, ${70 + bob}) rotate(${sway * 0.5})`}>
          <path
            d="M -38 4 L 36 -8 L -8 14 L -38 4 Z M -14 8 L 6 26 L 12 4"
            fill={secondaryStroke}
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
        </g>
      )}

      {kind === 'boat' && (
        <g transform="translate(100, 75)">
          <g transform={`translate(0, ${bob * 0.7}) rotate(${sway * 0.8})`}>
            <path
              d="M -36 10 L 36 10 L 24 26 L -24 26 Z"
              fill={primaryStroke}
              fillOpacity={0.22 * fillProgress}
              stroke={primaryStroke}
              strokeWidth="2.2"
              strokeDasharray="320"
              strokeDashoffset={dashOffset}
            />
            <path
              d={`M 0 8 L 0 -36 L ${26 + sway * 0.5} 4 Z`}
              fill={secondaryStroke}
              fillOpacity={0.2 * fillProgress}
              stroke={secondaryStroke}
              strokeWidth="2"
              strokeDasharray="320"
              strokeDashoffset={dashOffset}
            />
            <path
              d={`M -2 6 L -2 -28 L ${-20 + sway * 0.3} 4 Z`}
              fill={accentColor}
              fillOpacity={0.16 * fillProgress}
              stroke={accentColor}
              strokeWidth="1.8"
              strokeDasharray="320"
              strokeDashoffset={dashOffset}
            />
          </g>
          <path
            d={`M -55 30 Q ${-28 + sway} 24 0 30 T 55 30`}
            fill="none"
            stroke={secondaryStroke}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={drawProgress}
          />
        </g>
      )}

      {kind === 'tree' && (
        <g transform="translate(100, 78)">
          <path
            d="M -6 32 L -4 2 L 4 2 L 6 32 Z"
            fill={accentColor}
            fillOpacity={0.25 * fillProgress}
            stroke={accentColor}
            strokeWidth="2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <g transform={`rotate(${sway * 0.6})`}>
            <circle cx="0" cy="-14" r="24" fill={secondaryStroke} fillOpacity={0.2 * fillProgress} stroke={secondaryStroke} strokeWidth="2.2" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <circle cx="-16" cy="-4" r="16" fill={primaryStroke} fillOpacity={0.18 * fillProgress} stroke={primaryStroke} strokeWidth="1.8" strokeDasharray="320" strokeDashoffset={dashOffset} />
            <circle cx="16" cy="-4" r="16" fill={primaryStroke} fillOpacity={0.18 * fillProgress} stroke={primaryStroke} strokeWidth="1.8" strokeDasharray="320" strokeDashoffset={dashOffset} />
          </g>
        </g>
      )}

      {kind === 'house' && (
        <g transform={`translate(100, ${76 + bob * 0.3})`}>
          <rect
            x="-28"
            y="-4"
            width="56"
            height="34"
            rx="3"
            fill={secondaryStroke}
            fillOpacity={0.16 * fillProgress}
            stroke={secondaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path
            d="M -36 -4 L 0 -34 L 36 -4 Z"
            fill={accentColor}
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.4"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <rect
            x="-8"
            y="6"
            width="16"
            height="14"
            rx="2"
            fill={primaryStroke}
            fillOpacity={0.35 * fillProgress * pulse}
            stroke={primaryStroke}
            strokeWidth="1.6"
          />
        </g>
      )}

      {kind === 'bird' && (
        <g transform={`translate(100, ${70 + bob})`}>
          <path
            d="M 0 0 Q -26 -24 -44 -6 Q -24 6 0 4"
            fill={primaryStroke}
            fillOpacity={0.2 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            transform={`rotate(${wingAngle})`}
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <path
            d="M 0 0 Q 26 -24 44 -6 Q 24 6 0 4"
            fill={secondaryStroke}
            fillOpacity={0.2 * fillProgress}
            stroke={secondaryStroke}
            strokeWidth="2.2"
            transform={`rotate(${-wingAngle})`}
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <circle cx="0" cy="0" r="6" fill={accentColor} opacity={drawProgress} />
        </g>
      )}

      {kind === 'fish' && (
        <g transform={`translate(${100 + sway}, ${70 + bob * 0.5})`}>
          <path
            d="M -30 0 Q -10 -22 22 0 Q -10 22 -30 0 Z"
            fill={secondaryStroke}
            fillOpacity={0.22 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <polygon
            points="-28,0 -44,-12 -40,0 -44,12"
            fill={accentColor}
            fillOpacity={0.25 * fillProgress}
            stroke={accentColor}
            strokeWidth="1.8"
            transform={`rotate(${sway * 1.5}, -28, 0)`}
          />
          <circle cx="10" cy="-3" r="2.5" fill={primaryStroke} opacity={drawProgress} />
        </g>
      )}

      {kind === 'book' && (
        <g transform={`translate(100, ${74 + bob * 0.4}) scale(${pulse})`}>
          <path
            d="M 0 -18 Q -20 -24 -38 -14 L -38 20 Q -20 12 0 18 Q 20 12 38 20 L 38 -14 Q 20 -24 0 -18 Z"
            fill={primaryStroke}
            fillOpacity={0.18 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <line x1="0" y1="-18" x2="0" y2="18" stroke={secondaryStroke} strokeWidth="2" opacity={drawProgress} />
        </g>
      )}

      {kind === 'car' && (
        <g transform={`translate(${100 + sway * 0.8}, ${76 + bob * 0.2})`}>
          <path
            d="M -38 10 L -34 -4 L -18 -18 L 16 -18 L 30 -4 L 38 10 Z"
            fill={secondaryStroke}
            fillOpacity={0.2 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="2.2"
            strokeDasharray="320"
            strokeDashoffset={dashOffset}
          />
          <circle cx="-22" cy="12" r="8" fill="#1e293b" stroke={accentColor} strokeWidth="2.2" />
          <circle cx="22" cy="12" r="8" fill="#1e293b" stroke={accentColor} strokeWidth="2.2" />
        </g>
      )}

      {(kind === 'harmonic_bloom' || kind === 'letter_constellation') && (
        <g transform={`translate(100, 70) rotate(${animTick * 12 * (level === 0 ? 1 : motionAmp)})`}>
          {[0, 60, 120].map((angle, idx) => (
            <ellipse
              key={angle}
              cx="0"
              cy="0"
              rx={38 * pulse}
              ry={16 * pulse}
              fill={EUROPEAN_HEX[idx % EUROPEAN_HEX.length]}
              fillOpacity={0.09 * fillProgress}
              stroke={idx === 0 ? primaryStroke : secondaryStroke}
              strokeWidth="1.8"
              transform={`rotate(${angle})`}
              strokeDasharray="320"
              strokeDashoffset={dashOffset}
            />
          ))}
          <circle
            cx="0"
            cy="0"
            r={8 * pulse}
            fill={accentColor}
            fillOpacity={0.3 * fillProgress}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
        </g>
      )}
      </g>
      )}
    </svg>
  );
};

// ============================================================================
// 18-EXPRESSION ANIMATED TUTOR AVATAR HEADER (Strictly Non-Angry)
// ============================================================================

interface TutorAvatarProps {
  emotion: TutorEmotion;
  isSilent: boolean;
  aliveness: number;
  language: LanguageCode;
  onClickAvatar: () => void;
  onCycleExpression: (e: React.MouseEvent) => void;
}

const TutorAvatarHeader: React.FC<TutorAvatarProps> = ({
  emotion,
  isSilent,
  aliveness,
  language,
  onClickAvatar,
  onCycleExpression
}) => {
  const meta = EMOTION_META[emotion];

  const renderEyes = () => {
    if (isSilent || emotion === 'MEDITATIVE' || emotion === 'SOOTHING') {
      return (
        <>
          <path d="M 14 22 Q 18 25 22 22" fill="none" stroke={isSilent ? '#94a3b8' : meta.color} strokeWidth="2" strokeLinecap="round" />
          <path d="M 26 22 Q 30 25 34 22" fill="none" stroke={isSilent ? '#94a3b8' : meta.color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    }
    if (emotion === 'DELIGHTED' || emotion === 'PLAYFUL' || emotion === 'WARM_PRIDE' || emotion === 'RADIANT') {
      return (
        <>
          <path d="M 14 22 Q 18 17 22 22" fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 26 22 Q 30 17 34 22" fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    }
    if (emotion === 'WONDER' || emotion === 'GENTLE_SURPRISE' || emotion === 'INSPIRED' || emotion === 'ROCKET_LAUNCH') {
      return (
        <>
          <circle cx="18" cy="21" r="3.4" fill="none" stroke={meta.color} strokeWidth="2" />
          <circle cx="18" cy="21" r="1.4" fill="#fff" />
          <circle cx="30" cy="21" r="3.4" fill="none" stroke={meta.color} strokeWidth="2" />
          <circle cx="30" cy="21" r="1.4" fill="#fff" />
        </>
      );
    }
    if (emotion === 'CURIOUS' || emotion === 'ATTENTIVE' || emotion === 'EAGER') {
      return (
        <>
          <circle cx="18" cy="22" r="2.6" fill={meta.color} />
          <circle cx="30" cy="21.5" r="3.1" fill={meta.color} />
          <path d="M 14 16 Q 18 14 22 16" fill="none" stroke={meta.color} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M 26 14.5 Q 30 12 34 15" fill="none" stroke={meta.color} strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    }
    return (
      <>
        <circle cx="18" cy="22" r="2.5" fill={meta.color} />
        <circle cx="30" cy="22" r="2.5" fill={meta.color} />
      </>
    );
  };

  const renderMouth = () => {
    if (isSilent) {
      return <line x1="20" y1="31" x2="28" y2="31" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />;
    }
    if (emotion === 'WONDER' || emotion === 'GENTLE_SURPRISE' || emotion === 'CURIOUS') {
      return <ellipse cx="24" cy="31" rx="3.2" ry="2.8" fill="none" stroke={meta.color} strokeWidth="2" />;
    }
    if (emotion === 'DELIGHTED' || emotion === 'RADIANT' || emotion === 'ROCKET_LAUNCH' || emotion === 'INSPIRED') {
      return <path d="M 16 28 Q 24 37 32 28 Z" fill={meta.color} fillOpacity="0.25" stroke={meta.color} strokeWidth="2" strokeLinejoin="round" />;
    }
    return <path d="M 17 29.5 Q 24 34.5 31 29.5" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round" />;
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1 shadow-xl shrink-0">
      <button
        onClick={onClickAvatar}
        title={language === 'nl' ? 'Klik voor stem-introspectie' : 'Click for voice introspection'}
        className="flex items-center gap-2 text-left group"
      >
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
          <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-10 sm:h-10 overflow-visible">
            <circle
              cx="24"
              cy="24"
              r={20 + aliveness * 2.5}
              fill="none"
              stroke={isSilent ? '#64748b' : meta.color}
              strokeWidth="1.8"
              strokeDasharray={isSilent ? '3 5' : emotion === 'RADIANT' || emotion === 'ROCKET_LAUNCH' ? '2 3' : 'none'}
              opacity={isSilent ? 0.45 : 0.85}
            />
            <circle
              cx="24"
              cy="24"
              r="16"
              fill="#0f172a"
              stroke={isSilent ? '#94a3b8' : meta.color}
              strokeWidth="2.2"
            />
            {renderEyes()}
            {renderMouth()}
          </svg>
        </div>

        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSilent ? '#94a3b8' : meta.color }} />
            <span className="text-[11px] sm:text-xs font-bold tracking-wide text-slate-200">
              {isSilent
                ? (language === 'nl' ? 'Stille Wachtstand' : 'Silent Standby')
                : (language === 'nl' ? meta.labelNL.replace(/^\d+\.\s*/, '') : meta.labelEN.replace(/^\d+\.\s*/, ''))}
            </span>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono text-slate-400">
            {isSilent
              ? (language === 'nl' ? 'Tik of beweeg' : 'Tap or move')
              : (language === 'nl' ? 'Lieve begeleiding actief' : 'Sweet guidance active')}
          </span>
        </div>
      </button>
    </div>
  );
};

// ============================================================================
// MAIN APPLICATION COMPONENT: RTTutor
// ============================================================================

export default function RTTutor() {
  // Core Persistent States — Always default to Level 0 ('standard' mode, single letters with Leesplankje figures)
  const [started, setStarted] = useState<boolean>(false);
  const [curriculumMode, setCurriculumMode] = useState<CurriculumMode>('standard');
  const [level, setLevel] = useState<number>(0);
  const [language, setLanguage] = useState<LanguageCode>(() => (localStorage.getItem('tutor_lang') as LanguageCode) || 'nl');
  const [autoLevel, setAutoLevel] = useState<boolean>(true);
  const [inspectMode, setInspectMode] = useState<boolean>(false);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);

  // Usability Research Pinhole Spotlight State
  const [pinholeEnabled, setPinholeEnabled] = useState<boolean>(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 500,
    y: typeof window !== 'undefined' ? Math.round(window.innerHeight / 2) : 400
  });

  // Advanced Tutoring & Introspection States
  const [introspectionLevel, setIntrospectionLevel] = useState<IntrospectionLevel>(() => {
    const saved = localStorage.getItem('tutor_introspect_lvl');
    return saved !== null ? (parseInt(saved, 10) as IntrospectionLevel) : 1;
  });
  const [tutorEmotion, setTutorEmotion] = useState<TutorEmotion>('SERENE');
  const [isVoiceSilent, setIsVoiceSilent] = useState<boolean>(false);
  const [kineticMode, setKineticMode] = useState<boolean>(false);
  const [introspectionLog, setIntrospectionLog] = useState<string>(
    'Systeem gereed. Leren is een raket lanceren in je brein!'
  );
  const [activeVoiceName, setActiveVoiceName] = useState<string>('Default OS Voice');

  // Round, Hover & Timing States
  const [currentRound, setCurrentRound] = useState<RoundState | null>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [cellDwellState, setCellDwellState] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [idleMs, setIdleMs] = useState<number>(0);
  const [animTick, setAnimTick] = useState<number>(0);
  const [kineticOffsets, setKineticOffsets] = useState<{ dx: number; dy: number; rot: number }[]>([]);
  const [laserShots, setLaserShots] = useState<LaserShot[]>([]);
  const [rocketFlight, setRocketFlight] = useState<BrainRocketFlight>({
    active: false,
    word: '',
    streakCount: 0,
    startedAt: 0
  });

  // Aap-Noot-Mies Cut-Out Figure Rendering Mode & Leesplankje Overview Modal
  const [anmFigureMode, setAnmFigureMode] = useState<AnmFigureMode>('hybrid');
  const [showLeesplankModal, setShowLeesplankModal] = useState<boolean>(false);
  const [mcpConnected, setMcpConnected] = useState<boolean>(false);
  const [drillThroughToast, setDrillThroughToast] = useState<string | null>(null);
  const [aiAugmentation, setAiAugmentation] = useState<AiLearningAugmentationConfig>({
    hintThrottleMultiplier: 1.0,
    kineticSpeedMultiplier: 1.0,
    customEncouragementBanner: null,
    focusPrefix: null,
    lastUpdatedByAiAt: null
  });
  const lastMcpPushRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const eventSeqRef = useRef<number>(0);
  const eventTimelineRef = useRef<DrillThroughEventEntry[]>([]);

  const logTimelineEvent = useCallback((eventType: string, detail: Record<string, unknown> = {}) => {
    const now = Date.now();
    const entry: DrillThroughEventEntry = {
      seq: ++eventSeqRef.current,
      isoTime: new Date(now).toISOString(),
      epochMs: now,
      perfMs: typeof performance !== 'undefined' ? Number(performance.now().toFixed(2)) : 0,
      roundElapsedMs: now - roundStartTime.current,
      eventType,
      detail
    };
    eventTimelineRef.current.push(entry);
    if (eventTimelineRef.current.length > 120) {
      eventTimelineRef.current.shift();
    }
  }, []);

  // Modal / Massive JSON Dump States
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Refs for Low-Latency Audio, Mobile Voices, Hover Dwell & Telemetry
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const lastToneIdx = useRef<number>(-1);
  const lastPraiseIdx = useRef<number>(-1);
  const lastIdleIdx = useRef<number>(-1);
  const telemetryData = useRef<TelemetryPoint[]>([]);
  const roundStartTime = useRef<number>(Date.now());
  const lastInteraction = useRef<number>(Date.now());
  const lastPointerPos = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: Date.now() });
  const currentVelocityRef = useRef<number>(0);
  const hoveredWordRef = useRef<string | null>(null);
  const cellDwellRef = useRef<Record<string, number>>({});
  const cellVisitsRef = useRef<Record<string, number>>({});
  const firstGoldenHoverMsRef = useRef<number | null>(null);
  const goldenSpokenStageRef = useRef<number>(0);
  const idlePhaseRef = useRef<IdlePhase>(0);
  const spokenStageRef = useRef<number>(0);
  const lastOpaKoTime = useRef<number>(Date.now());
  const kineticBodiesRef = useRef<KineticBody[]>([]);

  // ==========================================================================
  // MOBILE TTS VOICE OBJECT LOADER (Fixes Android Chrome & iOS Safari Voices)
  // ==========================================================================

  const selectBestVoice = useCallback((targetLang: LanguageCode): SpeechSynthesisVoice | null => {
    const list = voicesRef.current;
    if (!list || list.length === 0) return null;

    const prefixes = targetLang === 'nl' ? ['nl-nl', 'nl-be', 'nl_nl', 'nl'] : ['en-us', 'en-gb', 'en_us', 'en'];
    const candidates = list.filter(v => v.lang && prefixes.some(p => v.lang.toLowerCase().startsWith(p)));
    if (candidates.length === 0) return null;

    // Prefer natural, sweet female / motherly voices (Fenna, Colette, Laura, Lotte, Claire, Google Nederlands, Natural/Neural)
    const motherlyKeywords = [
      'fenna', 'colette', 'laura', 'lotte', 'claire', 'ellen', 'hanna', 'saskia',
      'samantha', 'victoria', 'karen', 'moira', 'tessa', 'ava', 'jenny', 'aria',
      'female', 'vrouw', 'natural', 'neural', 'google'
    ];
    const sweetMatch = candidates.find(v =>
      motherlyKeywords.some(kw => v.name.toLowerCase().includes(kw))
    );
    return sweetMatch || candidates[0];
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          voicesRef.current = available;
          const best = selectBestVoice(language);
          if (best) setActiveVoiceName(`${best.name} (${best.lang})`);
        }
      } catch (e) {
        // Ignore mobile WebView restrictions
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [language, selectBestVoice]);

  // ==========================================================================
  // AUDIO SYNTHESIS ENGINE (Mobile WebView Safe + Harmonious + Rocket Chime)
  // ==========================================================================

  const initAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn('AudioContext blocked by mobile environment:', err);
    }
  }, []);

  const playSynth = useCallback((type: 'correct' | 'curious' | 'levelup' | 'laser' | 'wake' | 'golden' = 'correct') => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const t = ctx.currentTime;

      if (type === 'correct') {
        let idx = Math.floor(Math.random() * BACH_MOTIFS.length);
        while (idx === lastToneIdx.current) idx = Math.floor(Math.random() * BACH_MOTIFS.length);
        lastToneIdx.current = idx;

        const motif = BACH_MOTIFS[idx];
        motif.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, t + i * 0.15);
          gain.gain.linearRampToValueAtTime(0.08, t + i * 0.15 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.32);
          osc.start(t + i * 0.15);
          osc.stop(t + i * 0.15 + 0.32);
        });
      } else if (type === 'curious') {
        [329.63, 392.00].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, t + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.06, t + i * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.25);
          osc.start(t + i * 0.12);
          osc.stop(t + i * 0.12 + 0.25);
        });
      } else if (type === 'levelup') {
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, t + i * 0.09);
          gain.gain.linearRampToValueAtTime(0.08, t + i * 0.09 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.42);
          osc.start(t + i * 0.09);
          osc.stop(t + i * 0.09 + 0.42);
        });
      } else if (type === 'golden') {
        [587.33, 880.00].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, t + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.035, t + i * 0.1 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.28);
          osc.start(t + i * 0.1);
          osc.stop(t + i * 0.1 + 0.28);
        });
      } else if (type === 'laser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.start(t);
        osc.stop(t + 0.14);
      } else if (type === 'wake') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(587.33, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
      }
    } catch (err) {
      console.warn('Synth error:', err);
    }
  }, []);

  // ==========================================================================
  // SPEECH SYNTHESIS & NATURAL NON-"SVG" VOICE ENGINE
  // ==========================================================================

  const sanitizeForNaturalSpeech = (rawText: string, lang: LanguageCode): string => {
    // Ensure the TTS never pronounces the raw acronym "SVG" without natural explanation
    if (lang === 'nl') {
      return rawText
        .replace(/\bSVG-lijnen\b/gi, 'bewegende lijntekeningetjes')
        .replace(/\bSVG-tekeningen\b/gi, 'bewegende figuurtjes')
        .replace(/\bSVG-levendigheid\b/gi, 'levendigheid van de bewegende figuurtjes')
        .replace(/\bSVG\b/gi, 'bewegende lijntekening');
    }
    return rawText
      .replace(/\bSVG lines\b/gi, 'moving line drawings')
      .replace(/\bSVG drawings\b/gi, 'moving little figures')
      .replace(/\bSVG aliveness\b/gi, 'aliveness of the moving figures')
      .replace(/\bSVG\b/gi, 'moving line drawing');
  };

  const speakText = useCallback((
    text: string,
    options?: { forceLang?: LanguageCode; emotionOverride?: TutorEmotion; bypassSilence?: boolean; cancelFirst?: boolean }
  ) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isVoiceSilent && !options?.bypassSilence) return;

    try {
      if (options?.cancelFirst) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.resume();

      const targetLang = options?.forceLang || language;
      const emo = options?.emotionOverride || tutorEmotion;
      const emoMeta = EMOTION_META[emo];

      const spokenString = sanitizeForNaturalSpeech(text, targetLang);
      const utterance = new SpeechSynthesisUtterance(spokenString);
      const matchedVoice = selectBestVoice(targetLang);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang;
      } else {
        utterance.lang = targetLang === 'nl' ? 'nl-NL' : 'en-US';
      }

      utterance.pitch = Math.min(1.25, Math.max(0.85, emoMeta.pitchMod + (Math.random() * 0.06 - 0.03)));
      utterance.rate = emoMeta.rateMod;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, [isVoiceSilent, tutorEmotion, language, selectBestVoice]);

  const speakWord = useCallback((word: string, forceLang?: LanguageCode) => {
    speakText(word, { forceLang, cancelFirst: true });
  }, [speakText]);

  const speakVariedFromArray = useCallback((arr: string[], kind: 'praise' | 'idle', emotionOverride?: TutorEmotion) => {
    if (!arr || arr.length === 0) return;
    const ref = kind === 'praise' ? lastPraiseIdx : lastIdleIdx;
    let idx = Math.floor(Math.random() * arr.length);
    if (arr.length > 1) {
      while (idx === ref.current) idx = Math.floor(Math.random() * arr.length);
    }
    ref.current = idx;
    speakText(arr[idx], { emotionOverride });
  }, [speakText]);

  // ==========================================================================
  // ROUND GENERATOR (Supports Standard Levels L0-L5 & "Aap Noot Mies" Mode)
  // ==========================================================================

  const initKineticBodies = useCallback((count: number) => {
    const isNarrowPhone = typeof window !== 'undefined' && window.innerWidth < 640;
    const bodies: KineticBody[] = [];
    for (let i = 0; i < count; i++) {
      bodies.push({
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        freqX: 0.65 + (i % 3) * 0.2,
        freqY: 0.55 + ((i + 1) % 3) * 0.22,
        ampX: isNarrowPhone ? (level === 0 ? 9 : 6) : (level === 0 ? 18 : 11),
        ampY: isNarrowPhone ? (level === 0 ? 7 : 5) : (level === 0 ? 14 : 9)
      });
    }
    kineticBodiesRef.current = bodies;
  }, [level]);

  const generateRound = useCallback((
    currentLevel: number,
    nextStreak: number = streak,
    modeOverride: CurriculumMode = curriculumMode
  ) => {
    const isAapNootMies = modeOverride === 'aapnootmies';
    const pool = isAapNootMies
      ? AAP_NOOT_MIES_WORDS
      : (DICTIONARIES[language][currentLevel] || DICTIONARIES[language][0]);

    let numWords = isAapNootMies ? 6 : 4;
    if (!isAapNootMies) {
      if (currentLevel >= 3) numWords = 6;
      if (currentLevel >= 4) numWords = 8;
      if (currentLevel === 5) numWords = 10;
    }

    const targetWord = pool[Math.floor(Math.random() * pool.length)];
    const targetStart = targetWord.charAt(0);
    let availableDistractors = [...pool].filter(w => w !== targetWord);

    if (!isAapNootMies && currentLevel === 1) {
      availableDistractors = availableDistractors.filter(w => w.charAt(0) !== targetStart);
    } else if (!isAapNootMies && currentLevel === 2) {
      const sameLetter = availableDistractors.filter(w => w.charAt(0) === targetStart);
      const diffLetter = availableDistractors.filter(w => w.charAt(0) !== targetStart);
      availableDistractors = [];
      if (sameLetter.length > 0) {
        availableDistractors.push(sameLetter[Math.floor(Math.random() * sameLetter.length)]);
      }
      while (availableDistractors.length < numWords - 1 && diffLetter.length > 0) {
        const pickIdx = Math.floor(Math.random() * diffLetter.length);
        availableDistractors.push(diffLetter.splice(pickIdx, 1)[0]);
      }
    } else {
      const sameLetter = availableDistractors.filter(w => w.charAt(0) === targetStart);
      const diffLetter = availableDistractors.filter(w => w.charAt(0) !== targetStart).sort(() => 0.5 - Math.random());
      availableDistractors = [...sameLetter, ...diffLetter];
    }

    availableDistractors = availableDistractors.slice(0, numWords - 1);
    const finalWords = [targetWord, ...availableDistractors].sort(() => 0.5 - Math.random());

    roundStartTime.current = Date.now();
    lastInteraction.current = Date.now();
    idlePhaseRef.current = 0;
    spokenStageRef.current = 0;
    goldenSpokenStageRef.current = 0;
    firstGoldenHoverMsRef.current = null;
    hoveredWordRef.current = null;
    setHoveredWord(null);

    const freshDwell: Record<string, number> = {};
    const freshVisits: Record<string, number> = {};
    finalWords.forEach(w => {
      freshDwell[w] = 0;
      freshVisits[w] = 0;
    });
    cellDwellRef.current = freshDwell;
    cellVisitsRef.current = freshVisits;
    setCellDwellState(freshDwell);

    telemetryData.current = [];
    setElapsedTime(0);
    setIdleMs(0);

    initKineticBodies(finalWords.length);

    setCurrentRound({
      target: targetWord,
      options: finalWords
    });

    const throttleSec = ((4000 + Math.max(0, nextStreak) * 2000) / 1000).toFixed(1);
    const sameStartCount = finalWords.filter(w => w.charAt(0) === targetStart).length;

    setIntrospectionLog(
      language === 'nl'
        ? `[${isAapNootMies ? 'Aap-Noot-Mies' : `Level ${currentLevel}`}] Doel="${targetWord}" | Zelfde beginletter=${sameStartCount}/${finalWords.length} | Hint-wachttijd=${throttleSec}s`
        : `[Round Start] Target="${targetWord}" (L${currentLevel}) | Shared 1st char=${sameStartCount}/${finalWords.length} | Hint delay=${throttleSec}s`
    );

    speakWord(targetWord, isAapNootMies ? 'nl' : undefined);
  }, [language, streak, curriculumMode, initKineticBodies, speakWord]);

  useEffect(() => {
    if (started && !currentRound) {
      generateRound(level, streak, curriculumMode);
    }
  }, [started, currentRound, level, streak, curriculumMode, generateRound]);

  // ==========================================================================
  // REQUESTANIMATIONFRAME LOOP FOR SMOOTH 2D KINETIC LISSAJOUS MOTION
  // ==========================================================================

  useEffect(() => {
    if (!started || !currentRound || showJsonModal) return;

    let rafId: number;
    const animate = () => {
      const elapsedSec = (Date.now() - roundStartTime.current) / 1000;
      setAnimTick(elapsedSec * 1.4);

      if (kineticMode && kineticBodiesRef.current.length > 0) {
        const kMult = aiAugmentation.kineticSpeedMultiplier;
        const nextOffsets = kineticBodiesRef.current.map((b, idx) => ({
          dx: Math.sin(elapsedSec * b.freqX * kMult + b.phaseX) * b.ampX,
          dy: Math.cos(elapsedSec * b.freqY * kMult + b.phaseY) * b.ampY,
          rot: Math.sin(elapsedSec * 0.7 * kMult + idx) * (level === 0 ? 4.0 : 2.0)
        }));
        setKineticOffsets(nextOffsets);
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [started, currentRound, showJsonModal, kineticMode, level, aiAugmentation.kineticSpeedMultiplier]);

  // ==========================================================================
  // COMPUTED COGNITIVE & ORTHOGRAPHIC VARIABLES
  // ==========================================================================

  const baseThreshold = useMemo(
    () => Math.round((4000 + Math.max(0, streak) * 2000) * aiAugmentation.hintThrottleMultiplier),
    [streak, aiAugmentation.hintThrottleMultiplier]
  );

  const aliveness = useMemo(() => {
    const startMs = Math.max(1500, baseThreshold - 1500);
    return Math.min(1, Math.max(0, (elapsedTime - startMs) / 9000));
  }, [elapsedTime, baseThreshold]);

  const hesitationIndex = useMemo(() => {
    return Math.min(1, Math.max(0, elapsedTime / (baseThreshold + 8000)));
  }, [elapsedTime, baseThreshold]);

  const getMatchingPrefixLength = useCallback((target: string, word: string): number => {
    if (!target || !word) return 0;
    let match = 0;
    for (let i = 0; i < Math.min(target.length, word.length); i++) {
      if (target[i] === word[i]) match++;
      else break;
    }
    return match;
  }, []);

  // ==========================================================================
  // REAL-TIME COGNITIVE TIMERS: HOVER DWELL, GOLDEN CELL EVOLUTION & AUTO-SAVE
  // ==========================================================================

  useEffect(() => {
    if (!started || !currentRound || showJsonModal) return;

    const intervalMs = 150;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - roundStartTime.current;
      const currentIdle = now - lastInteraction.current;

      setElapsedTime(elapsed);
      setIdleMs(currentIdle);

      // 1. ACCUMULATE HOVER DWELL TIME & TRIGGER GOLDEN CELL EVOLUTION!
      const activeHover = hoveredWordRef.current;
      if (activeHover && currentIdle < 4000) {
        const prevDwell = cellDwellRef.current[activeHover] || 0;
        const nextDwell = prevDwell + intervalMs;
        cellDwellRef.current[activeHover] = nextDwell;
        setCellDwellState({ ...cellDwellRef.current });

        if (activeHover === currentRound.target) {
          // User is hovering in the GOLDEN CELL!
          if (nextDwell > 2400 && goldenSpokenStageRef.current < 3) {
            goldenSpokenStageRef.current = 3;
            setTutorEmotion('RADIANT');
            playSynth('golden');
            const isSingleCharHover = activeHover.length === 1;
            const msgNL = isSingleCharHover
              ? `Ja hoor lieverd, daar staat de letter '${activeHover}'!`
              : `Ja hoor lieverd, daar staat '${activeHover}'!`;
            const msgEN = isSingleCharHover
              ? `Yes darling, there is the letter '${activeHover}'!`
              : `Yes darling, there is '${activeHover}'!`;
            setIntrospectionLog(language === 'nl' ? msgNL : msgEN);
            if (introspectionLevel >= 1 && !isVoiceSilent) {
              speakText(language === 'nl' ? msgNL : msgEN, { emotionOverride: 'RADIANT' });
            }
          } else if (nextDwell > 1200 && goldenSpokenStageRef.current < 2) {
            goldenSpokenStageRef.current = 2;
            setTutorEmotion('WONDER');
            playSynth('golden');
          } else if (nextDwell > 450 && goldenSpokenStageRef.current < 1) {
            goldenSpokenStageRef.current = 1;
            setTutorEmotion('ATTENTIVE');
          }
        } else if (nextDwell > 900) {
          // Hovering a distractor cell -> Gentle curiosity
          setTutorEmotion('CURIOUS');
        }
      }

      // 2. SMART SILENCE ON INACTIVITY (Self-Announcing Standby at 28s)
      if (currentIdle > 28000 && idlePhaseRef.current === 1) {
        idlePhaseRef.current = 2;
        const msg = SILENCE_ANNOUNCEMENTS[language];
        setIntrospectionLog(
          language === 'nl'
            ? `[Stille Wachtstand] 28s geen activiteit -> Stem kondigt ruststand aan en gaat op stil.`
            : `[Silent Standby] 28s inactivity -> Voice announces standby and goes silent.`
        );
        setTutorEmotion('MEDITATIVE');
        speakText(msg, { emotionOverride: 'MEDITATIVE', bypassSilence: true, cancelFirst: true });
        setIsVoiceSilent(true);
      } else if (currentIdle > 16000 && idlePhaseRef.current === 0) {
        idlePhaseRef.current = 1;
        setTutorEmotion('PATIENT');
        setIntrospectionLog(
          language === 'nl'
            ? `[Inactiviteit Detectie] 16s stilte -> Geduldige check-in vraag gesteld.`
            : `[Inactivity Detected] 16s idle -> Patient check-in prompt spoken.`
        );
        speakVariedFromArray(IDLE_PROMPTS[language], 'idle', 'PATIENT');
      }

      // 3. PROGRESSIVE INTROSPECTION (Strictly distinguishes single-letter Level 0 vs multi-letter words!)
      if (!isVoiceSilent && currentIdle < 15000) {
        if (elapsed > baseThreshold && spokenStageRef.current < 1) {
          spokenStageRef.current = 1;
          setTutorEmotion('CONTEMPLATIVE');

          const isSingleLetterTarget = currentRound.target.length === 1;
          const sameFirstCount = currentRound.options.filter(
            w => w.charAt(0) === currentRound.target.charAt(0)
          ).length;

          const logL1 = isSingleLetterTarget
            ? (language === 'nl'
                ? `Kijk maar rustig naar het plaatje en de letter '${currentRound.target}' eronder.`
                : `Look calmly at the picture and the letter '${currentRound.target}' below it.`)
            : (language === 'nl'
                ? `Kijk maar rustig naar het plaatje en de beginletter '${currentRound.target.charAt(0)}'.`
                : `Look calmly at the picture and the first letter '${currentRound.target.charAt(0)}'.`);

          const logL2 = isSingleLetterTarget
            ? (language === 'nl'
                ? `Na ${(baseThreshold / 1000).toFixed(0)} seconden geef ik de gezochte letter '${currentRound.target}' een warme kleur onder het bijbehorende leesplank-figuurtje.`
                : `After ${(baseThreshold / 1000).toFixed(0)} seconds, coloring the target letter '${currentRound.target}' below its matching figure.`)
            : (language === 'nl'
                ? `Na ${(baseThreshold / 1000).toFixed(0)} seconden kleur ik de beginletter '${currentRound.target.charAt(0)}'. Er zijn ${sameFirstCount} woorden met de beginletter '${currentRound.target.charAt(0)}'.`
                : `After ${(baseThreshold / 1000).toFixed(0)} seconds, coloring the first letter '${currentRound.target.charAt(0)}'. ${sameFirstCount} words start with '${currentRound.target.charAt(0)}'.`);

          setIntrospectionLog(introspectionLevel === 2 ? logL2 : logL1);

          if (introspectionLevel === 1) {
            speakText(logL1, { emotionOverride: 'CONTEMPLATIVE' });
          } else if (introspectionLevel === 2) {
            speakText(logL2, { emotionOverride: 'CONTEMPLATIVE' });
          }
        }

        const stage2Time = baseThreshold + 4000;
        if (elapsed > stage2Time && spokenStageRef.current < 2 && currentRound.target.length > 1) {
          spokenStageRef.current = 2;
          setTutorEmotion('ENCOURAGING');

          const prefix2 = currentRound.target.substring(0, 2);
          const logL1 = language === 'nl'
            ? `Kijk eens naar de tweede letter en de verlichte figuurtjes boven de woorden. Welke past bij ${currentRound.target}?`
            : `Look closely at the second letter and the lit figures above the words. Which one matches ${currentRound.target}?`;

          const logL2 = language === 'nl'
            ? `Ik activeer nu de tweede letter-kleur voor woorden die beginnen met '${prefix2}'.`
            : `Activating second-letter coloring for words starting with '${prefix2}'.`;

          setIntrospectionLog(introspectionLevel === 2 ? logL2 : logL1);

          if (introspectionLevel === 1) {
            speakText(logL1, { emotionOverride: 'ENCOURAGING' });
          } else if (introspectionLevel === 2) {
            speakText(logL2, { emotionOverride: 'ENCOURAGING' });
          }
        }
      }

      // 4. CONTINUOUS AUTO-SAVE OF HARD DATA + DERIVED 2D-FFT TO LOCALSTORAGE
      const derived = computeDerivedHardData(
        telemetryData.current,
        currentRound.target,
        currentRound.options,
        cellDwellRef.current,
        cellVisitsRef.current,
        hoveredWordRef.current,
        firstGoldenHoverMsRef.current
      );

      const snapshot: TelemetryDumpPayload = {
        timestamp: new Date().toISOString(),
        curriculumMode,
        level,
        language,
        elapsedMs: elapsed,
        idleMs: currentIdle,
        streak,
        tutorEmotion,
        introspectionLevel,
        isVoiceSilent,
        kineticMode,
        pinholeEnabled,
        aliveness: Number(aliveness.toFixed(3)),
        hesitationIndex: Number(hesitationIndex.toFixed(3)),
        roundTarget: currentRound.target,
        roundOptions: currentRound.options,
        lastIntrospectionLog: introspectionLog,
        voiceSelected: activeVoiceName,
        viewport: {
          w: typeof window !== 'undefined' ? window.innerWidth : 0,
          h: typeof window !== 'undefined' ? window.innerHeight : 0
        },
        derivedHardData: derived,
        telemetryPointCount: telemetryData.current.length,
        telemetry: telemetryData.current
      };
      try {
        localStorage.setItem('tutor_last_telemetry', JSON.stringify(snapshot));
      } catch (e) {
        // Ignore storage quota warnings
      }

      // 5. STREAM HARD DATA & 2D-FFT TO LOCAL TYPESCRIPT MCP TRANSPONDER (:3001) WHEN ON LOCALHOST
      const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocalHost && now - lastMcpPushRef.current > 1200) {
        lastMcpPushRef.current = now;
        fetch('http://localhost:3001/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot)
        })
          .then(r => {
            if (r.ok && !mcpConnected) setMcpConnected(true);
          })
          .catch(() => {
            if (mcpConnected) setMcpConnected(false);
          });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    started,
    currentRound,
    showJsonModal,
    curriculumMode,
    kineticMode,
    pinholeEnabled,
    level,
    language,
    baseThreshold,
    streak,
    aliveness,
    hesitationIndex,
    tutorEmotion,
    introspectionLevel,
    isVoiceSilent,
    introspectionLog,
    activeVoiceName,
    playSynth,
    speakText,
    speakVariedFromArray
  ]);

  // ==========================================================================
  // LIVE DERIVED HARD DATA MEMO FOR HUD & EXPORT
  // ==========================================================================

  const liveDerivedData = useMemo(() => {
    return computeDerivedHardData(
      telemetryData.current,
      currentRound?.target || '',
      currentRound?.options || [],
      cellDwellState,
      cellVisitsRef.current,
      hoveredWord,
      firstGoldenHoverMsRef.current
    );
  }, [currentRound, cellDwellState, hoveredWord, elapsedTime]);

  // ==========================================================================
  // TELEMETRY PAYLOAD BUILDER & STANDALONE HTML GENERATOR
  // ==========================================================================

  const getTelemetryPayload = useCallback((): TelemetryDumpPayload => {
    const derived = computeDerivedHardData(
      telemetryData.current,
      currentRound?.target || '',
      currentRound?.options || [],
      cellDwellRef.current,
      cellVisitsRef.current,
      hoveredWordRef.current,
      firstGoldenHoverMsRef.current
    );

    if (telemetryData.current.length > 0 || currentRound) {
      return {
        timestamp: new Date().toISOString(),
        curriculumMode,
        level,
        language,
        elapsedMs: elapsedTime,
        idleMs,
        streak,
        tutorEmotion,
        introspectionLevel,
        isVoiceSilent,
        kineticMode,
        pinholeEnabled,
        aliveness: Number(aliveness.toFixed(3)),
        hesitationIndex: Number(hesitationIndex.toFixed(3)),
        roundTarget: currentRound?.target || '',
        roundOptions: currentRound?.options || [],
        lastIntrospectionLog: introspectionLog,
        voiceSelected: activeVoiceName,
        viewport: {
          w: typeof window !== 'undefined' ? window.innerWidth : 0,
          h: typeof window !== 'undefined' ? window.innerHeight : 0
        },
        derivedHardData: derived,
        telemetryPointCount: telemetryData.current.length,
        telemetry: telemetryData.current
      };
    }
    const saved = localStorage.getItem('tutor_last_telemetry');
    if (saved) {
      try {
        return JSON.parse(saved) as TelemetryDumpPayload;
      } catch (e) {
        // fallback below
      }
    }
    return {
      timestamp: new Date().toISOString(),
      curriculumMode,
      level,
      language,
      elapsedMs: elapsedTime,
      idleMs,
      streak,
      tutorEmotion,
      introspectionLevel,
      isVoiceSilent,
      kineticMode,
      pinholeEnabled,
      aliveness: 0,
      hesitationIndex: 0,
      roundTarget: '',
      roundOptions: [],
      lastIntrospectionLog: introspectionLog,
      voiceSelected: activeVoiceName,
      viewport: { w: 0, h: 0 },
      derivedHardData: derived,
      telemetryPointCount: 0,
      telemetry: []
    };
  }, [
    curriculumMode,
    level,
    language,
    elapsedTime,
    idleMs,
    streak,
    tutorEmotion,
    introspectionLevel,
    isVoiceSilent,
    kineticMode,
    pinholeEnabled,
    aliveness,
    hesitationIndex,
    currentRound,
    introspectionLog,
    activeVoiceName
  ]);

  const generateJsonDump = useCallback(() => {
    const payload = getTelemetryPayload();
    setJsonText(JSON.stringify(payload, null, 2));
    setShowJsonModal(true);
    setCopySuccess(false);
  }, [getTelemetryPayload]);

  // ==========================================================================
  // CTRL+SHIFT+ALT+G DRILL-THROUGH CONTEXT & AI CO-PILOT BUFFER ENGINE
  // ==========================================================================

  const buildDrillThroughPacket = useCallback(
    (triggerSource: DrillThroughContextPacket['triggerSource'] = 'CTRL_SHIFT_ALT_G'): DrillThroughContextPacket => {
      const now = Date.now();
      const vw = typeof window !== 'undefined' ? Math.max(1, window.innerWidth) : 1280;
      const vh = typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 800;

      const domStack: DomDrillThroughLayer[] = [];
      if (typeof document !== 'undefined' && document.elementsFromPoint) {
        const els = document.elementsFromPoint(pointerPos.x, pointerPos.y).slice(0, 8);
        els.forEach((el, idx) => {
          const r = el.getBoundingClientRect();
          domStack.push({
            depth: idx,
            tagName: el.tagName.toLowerCase(),
            id: el.id || null,
            className: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
            dataWord: el.getAttribute('data-word'),
            rect: {
              x: Math.round(r.left),
              y: Math.round(r.top),
              w: Math.round(r.width),
              h: Math.round(r.height)
            }
          });
        });
      }

      const derived = computeDerivedHardData(
        telemetryData.current,
        currentRound?.target || '',
        currentRound?.options || [],
        cellDwellRef.current,
        cellVisitsRef.current,
        hoveredWordRef.current,
        firstGoldenHoverMsRef.current
      );

      let flowDiagnosis: DrillThroughContextPacket['aiAugmentationState']['learnerFlowDiagnosis'] = 'ACTIVE_DECODING';
      if (idleMs > 15000) {
        flowDiagnosis = 'IDLE_STANDBY';
      } else if (
        derived.fft2D.cognitiveLoadSignature === 'HIGH_HESITATION' ||
        hesitationIndex > 0.65 ||
        streak < 0
      ) {
        flowDiagnosis = 'HESITATION_SCAFFOLD_NEEDED';
      } else if (streak >= 2 && derived.hoverAnalytics.goldenToDistractorRatio >= 0.6) {
        flowDiagnosis = 'FLOW_MASTERY';
      }

      const recHintMult =
        flowDiagnosis === 'HESITATION_SCAFFOLD_NEEDED'
          ? 0.70
          : flowDiagnosis === 'FLOW_MASTERY'
            ? 1.25
            : 1.0;
      const recKineticMult =
        flowDiagnosis === 'HESITATION_SCAFFOLD_NEEDED'
          ? 0.75
          : flowDiagnosis === 'FLOW_MASTERY'
            ? 1.20
            : 1.0;

      const targetPrefix = (currentRound?.target || 'a').slice(0, 1);
      const pool = curriculumMode === 'aapnootmies'
        ? AAP_NOOT_MIES_WORDS
        : (DICTIONARIES[language][level] || AAP_NOOT_MIES_WORDS);
      const recNextWords = pool
        .filter(w => w !== currentRound?.target && w.startsWith(targetPrefix))
        .slice(0, 4);

      return {
        packetId: `dt_${now}_${Math.random().toString(36).slice(2, 7)}`,
        triggerSource,
        timestamps: {
          isoTimestamp: new Date(now).toISOString(),
          epochMs: now,
          performanceNowMs: typeof performance !== 'undefined' ? Number(performance.now().toFixed(2)) : 0,
          timezoneOffsetMin: new Date().getTimezoneOffset(),
          sessionUptimeMs: now - sessionStartTimeRef.current,
          roundElapsedMs: elapsedTime,
          idleMs,
          firstGoldenHoverMs: firstGoldenHoverMsRef.current
        },
        pointerAndDomDrillThrough: {
          pointerX: pointerPos.x,
          pointerY: pointerPos.y,
          normalizedX: Number((pointerPos.x / vw).toFixed(3)),
          normalizedY: Number((pointerPos.y / vh).toFixed(3)),
          hoveredWordCell: hoveredWordRef.current,
          isGoldenCellUnderPointer: Boolean(currentRound && hoveredWordRef.current === currentRound.target),
          domStackUnderPointer: domStack
        },
        cognitiveAndPedagogicalState: {
          curriculumMode,
          anmFigureMode,
          level,
          language,
          roundTarget: currentRound?.target || '',
          roundOptions: currentRound?.options || [],
          streak,
          tutorEmotion,
          introspectionLevel,
          lastIntrospectionLog: introspectionLog,
          aliveness: Number(aliveness.toFixed(3)),
          hesitationIndex: Number(hesitationIndex.toFixed(3)),
          baseThresholdMs: baseThreshold,
          kineticMode,
          pinholeEnabled
        },
        aiAugmentationState: {
          activeConfig: aiAugmentation,
          learnerFlowDiagnosis: flowDiagnosis,
          recommendedHintThrottleMultiplier: recHintMult,
          recommendedKineticSpeedMultiplier: recKineticMult,
          recommendedNextTargetWords: recNextWords.length > 0 ? recNextWords : ['aap', 'noot', 'mies']
        },
        derivedHardData: derived,
        recentEventTimeline: [...eventTimelineRef.current.slice(-40)],
        recentTrajectorySample: [...telemetryData.current.slice(-32)]
      };
    },
    [
      pointerPos,
      currentRound,
      idleMs,
      hesitationIndex,
      streak,
      curriculumMode,
      anmFigureMode,
      language,
      level,
      elapsedTime,
      tutorEmotion,
      introspectionLevel,
      introspectionLog,
      aliveness,
      baseThreshold,
      kineticMode,
      pinholeEnabled,
      aiAugmentation
    ]
  );

  const triggerDrillThroughCapture = useCallback(
    (source: DrillThroughContextPacket['triggerSource'] = 'CTRL_SHIFT_ALT_G', openModal: boolean = false) => {
      logTimelineEvent('drill_through_capture', { source, pointer: pointerPos, hoveredWord: hoveredWordRef.current });
      const packet = buildDrillThroughPacket(source);
      const formatted = JSON.stringify(packet, null, 2);

      setJsonText(formatted);
      if (openModal) {
        setShowJsonModal(true);
      }

      // 1. Auto-Copy to System Clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(formatted).then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2500);
        }).catch(() => {
          // ignore clipboard permission blocks in headless environments
        });
      }

      // 2. Push to TypeScript MCP Server Channel Buffer (:3001/api/drill-through)
      fetch('http://localhost:3001/api/drill-through', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: formatted
      })
        .then(r => {
          if (r.ok) setMcpConnected(true);
        })
        .catch(() => {
          // Offline mode fallback: store in localStorage
        });

      try {
        localStorage.setItem('tutor_last_drill_through', formatted);
      } catch {
        // ignore storage quota
      }

      playSynth('golden');
      setDrillThroughToast(
        `🎯 Drill-Through Context (${packet.packetId}) Auto-Copied & Buffered to MCP :3001! [Flow: ${packet.aiAugmentationState.learnerFlowDiagnosis}]`
      );
      setTimeout(() => {
        setDrillThroughToast(prev => (prev && prev.includes(packet.packetId) ? null : prev));
      }, 4500);

      return packet;
    },
    [buildDrillThroughPacket, logTimelineEvent, pointerPos, playSynth]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+Alt+G -> Instant Drill-Through Context Auto-Copy & MCP Channel Buffer Push!
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        triggerDrillThroughCapture('CTRL_SHIFT_ALT_G', false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        generateJsonDump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generateJsonDump, triggerDrillThroughCapture]);

  // ==========================================================================
  // 3-CHANNEL BRIDGE: MCP TRANSPONDER (SSE :3001), PLAYWRIGHT & EDGE DEVTOOLS
  // ==========================================================================

  const executeTransponderCommand = useCallback(
    (cmd: { action: string; payload?: Record<string, unknown> }) => {
      const p = cmd.payload || (cmd as Record<string, unknown>);
      switch (cmd.action) {
        case 'start_engine':
          initAudio();
          setStarted(true);
          playSynth('wake');
          break;
        case 'set_curriculum': {
          initAudio();
          const mode = (p.mode as CurriculumMode) || 'aapnootmies';
          setCurriculumMode(mode);
          localStorage.setItem('tutor_curriculum', mode);
          if (mode === 'aapnootmies') setLanguage('nl');
          generateRound(level, streak, mode);
          break;
        }
        case 'set_level': {
          initAudio();
          const nextLvl = Math.max(0, Math.min(5, Number(p.level ?? 0)));
          setCurriculumMode('standard');
          setLevel(nextLvl);
          localStorage.setItem('tutor_level', String(nextLvl));
          generateRound(nextLvl, streak, 'standard');
          break;
        }
        case 'set_language': {
          const nextLang: LanguageCode = p.language === 'en' ? 'en' : 'nl';
          setLanguage(nextLang);
          localStorage.setItem('tutor_lang', nextLang);
          break;
        }
        case 'set_figure_mode': {
          const fm = ((p.mode || p.figureMode) as AnmFigureMode) || 'hybrid';
          if (['hybrid', 'photo', 'vector'].includes(fm)) setAnmFigureMode(fm);
          break;
        }
        case 'set_target_word': {
          initAudio();
          const w = String(p.word || 'mies').toLowerCase();
          const pool = curriculumMode === 'aapnootmies'
            ? AAP_NOOT_MIES_WORDS
            : (DICTIONARIES[language][level] || AAP_NOOT_MIES_WORDS);
          const distractors = pool.filter(x => x !== w).sort(() => 0.5 - Math.random()).slice(0, 5);
          const opts = [w, ...distractors].sort(() => 0.5 - Math.random());
          roundStartTime.current = Date.now();
          setCurrentRound({ target: w, options: opts });
          playSynth('golden');
          speakWord(w, curriculumMode === 'aapnootmies' ? 'nl' : undefined);
          break;
        }
        case 'click_word': {
          const w = String(p.word || currentRound?.target || '').toLowerCase();
          if (typeof document !== 'undefined') {
            const btn = document.querySelector(`[data-word="${w}"]`) as HTMLButtonElement | null;
            if (btn) btn.click();
          }
          break;
        }
        case 'set_emotion': {
          const emo = String(p.emotion || 'SERENE') as TutorEmotion;
          if (EMOTION_LIST.includes(emo)) setTutorEmotion(emo);
          break;
        }
        case 'toggle_pinhole':
          setPinholeEnabled(prev => (typeof p.enabled === 'boolean' ? p.enabled : !prev));
          break;
        case 'toggle_kinetic':
          setKineticMode(prev => (typeof p.enabled === 'boolean' ? p.enabled : !prev));
          break;
        case 'toggle_inspect':
          setInspectMode(prev => (typeof p.enabled === 'boolean' ? p.enabled : !prev));
          break;
        case 'toggle_leesplank_modal':
          setShowLeesplankModal(prev => (typeof p.enabled === 'boolean' ? p.enabled : !prev));
          break;
        case 'trigger_introspection':
          triggerManualIntrospection();
          break;
        case 'trigger_drill_through':
          triggerDrillThroughCapture('MCP_REMOTE_TRIGGER', Boolean(p.openModal));
          break;
        case 'reload_page':
          if (typeof window !== 'undefined') window.location.reload();
          break;
        case 'augment_learning_play': {
          const nextHintMult = typeof p.hintThrottleMultiplier === 'number'
            ? Math.max(0.3, Math.min(2.5, p.hintThrottleMultiplier))
            : aiAugmentation.hintThrottleMultiplier;
          const nextKineticMult = typeof p.kineticSpeedMultiplier === 'number'
            ? Math.max(0.2, Math.min(2.5, p.kineticSpeedMultiplier))
            : aiAugmentation.kineticSpeedMultiplier;
          const banner = typeof p.customEncouragementBanner === 'string'
            ? p.customEncouragementBanner
            : aiAugmentation.customEncouragementBanner;
          const focusPref = typeof p.focusPrefix === 'string'
            ? p.focusPrefix
            : aiAugmentation.focusPrefix;

          setAiAugmentation({
            hintThrottleMultiplier: nextHintMult,
            kineticSpeedMultiplier: nextKineticMult,
            customEncouragementBanner: banner,
            focusPrefix: focusPref,
            lastUpdatedByAiAt: new Date().toISOString()
          });

          if (typeof p.emotion === 'string' && EMOTION_LIST.includes(p.emotion as TutorEmotion)) {
            setTutorEmotion(p.emotion as TutorEmotion);
          }
          initAudio();
          playSynth('correct');
          if (typeof p.spokenEncouragement === 'string' && p.spokenEncouragement.trim()) {
            speakText(p.spokenEncouragement, { emotionOverride: 'ENCOURAGING', cancelFirst: true });
          } else if (typeof banner === 'string' && banner.trim()) {
            speakText(banner.replace(/[^\p{L}\p{N}\s,!.?-]/gu, ''), { emotionOverride: 'ENCOURAGING', cancelFirst: true });
          }
          logTimelineEvent('ai_augmentation_applied', {
            hintThrottleMultiplier: nextHintMult,
            kineticSpeedMultiplier: nextKineticMult,
            customEncouragementBanner: banner,
            focusPrefix: focusPref
          });
          break;
        }
      }
    },
    [
      initAudio,
      generateRound,
      level,
      streak,
      curriculumMode,
      language,
      currentRound,
      speakWord,
      speakText,
      triggerDrillThroughCapture,
      aiAugmentation,
      logTimelineEvent
    ]
  );

  const executeTransponderCommandRef = useRef(executeTransponderCommand);
  useEffect(() => {
    executeTransponderCommandRef.current = executeTransponderCommand;
  }, [executeTransponderCommand]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as Record<string, unknown>).__RT_TUTOR_BRIDGE__ = {
      getTelemetry: getTelemetryPayload,
      triggerDrillThrough: () => triggerDrillThroughCapture('MCP_REMOTE_TRIGGER', false),
      executeCommand: executeTransponderCommand,
      figures: AAP_NOOT_MIES_FIGURES
    };
  }, [getTelemetryPayload, triggerDrillThroughCapture, executeTransponderCommand]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalHost) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource('http://localhost:3001/api/events');
      es.addEventListener('connected', () => setMcpConnected(true));
      es.addEventListener('command', (ev: MessageEvent) => {
        try {
          const cmd = JSON.parse(ev.data);
          executeTransponderCommandRef.current(cmd);
        } catch {
          // ignore malformed command
        }
      });
      es.onerror = () => setMcpConnected(false);
    } catch {
      // Offline / Standalone mode
    }
    return () => {
      if (es) es.close();
    };
  }, []);

  // Export Standalone Self-Contained Mobile HTML File (With Aap Noot Mies & Pinhole!)
  const exportStandaloneHtml = () => {
    const dictJson = JSON.stringify(DICTIONARIES);
    const aapNootJson = JSON.stringify(AAP_NOOT_MIES_WORDS);
    const praisesJson = JSON.stringify(PRAISES);
    const colorsJson = JSON.stringify(EUROPEAN_HEX);
    const anmFiguresCompact: Record<string, string> = {};
    Object.values(AAP_NOOT_MIES_FIGURES).forEach(f => {
      anmFiguresCompact[f.word] = f.dataUri;
    });
    const anmImagesJson = JSON.stringify(anmFiguresCompact);

    const htmlContent = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>RT Tutor — Standalone Mobile & Aap Noot Mies Edition</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='2' y='2' width='60' height='60' rx='15' fill='%23090414' stroke='%23a855f7' stroke-width='3.5'/%3E%3Cpath d='M 32 14 L 47 50 L 39.5 50 L 36.2 41 L 27.8 41 L 24.5 50 L 17 50 Z M 32 23.5 L 29.3 35.5 L 34.7 35.5 Z' fill='%23c084fc'/%3E%3Ccircle cx='32' cy='11' r='2.6' fill='%23f5d0fe'/%3E%3C/svg%3E" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { overscroll-behavior: none; touch-action: manipulation; user-select: none; -webkit-user-select: none; background: #0f172a; color: #f1f5f9; margin: 0; padding: 0; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between p-4 font-sans overflow-hidden">
  <header class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 z-40">
    <div class="flex items-center gap-2">
      <button id="prevLvl" class="px-3 py-1.5 bg-slate-800 rounded-lg font-bold">◀</button>
      <span id="lvlBadge" class="px-4 py-1.5 bg-slate-950 text-blue-400 font-mono font-bold rounded-lg">L${level}</span>
      <button id="nextLvl" class="px-3 py-1.5 bg-slate-800 rounded-lg font-bold">▶</button>
      <button id="anmBtn" class="px-3 py-1.5 bg-amber-800/80 text-amber-100 rounded-lg text-xs font-bold">🇳🇱 Aap Noot Mies</button>
      <button id="langBtn" class="px-3 py-1.5 bg-slate-800 rounded-lg font-bold">${language.toUpperCase()}</button>
    </div>
    <div id="statusText" class="text-xs font-mono text-amber-300 truncate">🚀 Brein-Raket Ready</div>
    <button id="dlJsonBtn" class="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-mono font-bold">💾 Download .JSON</button>
  </header>

  <main class="flex-1 flex flex-col items-center justify-center my-4 z-20">
    <div id="targetBox" class="text-6xl sm:text-8xl font-black tracking-tight text-white mb-10 cursor-pointer"></div>
    <div id="gridBox" class="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-4xl"></div>
  </main>

  <script>
    const DICTIONARIES = ${dictJson};
    const AAP_NOOT = ${aapNootJson};
    const PRAISES = ${praisesJson};
    const COLORS = ${colorsJson};
    const ANM_IMAGES = ${anmImagesJson};
    let level = ${level}, lang = "${language}", mode = "${curriculumMode}", streak = 0, target = "", options = [], startTime = Date.now(), telemetry = [];

    function speak(txt) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(txt);
      const voices = window.speechSynthesis.getVoices();
      const pref = lang === 'nl' ? 'nl' : 'en';
      const candidates = voices.filter(x => x.lang && x.lang.toLowerCase().startsWith(pref));
      const sweet = candidates.find(x => /fenna|colette|laura|lotte|claire|female|vrouw|natural|google/i.test(x.name));
      if (sweet || candidates[0]) u.voice = sweet || candidates[0];
      u.lang = lang === 'nl' ? 'nl-NL' : 'en-US';
      u.rate = 1.00;
      u.pitch = 1.06;
      window.speechSynthesis.speak(u);
    }

    function nextRound() {
      const pool = mode === 'aapnootmies' ? AAP_NOOT : (DICTIONARIES[lang][level] || DICTIONARIES[lang][0]);
      target = pool[Math.floor(Math.random() * pool.length)];
      const dist = pool.filter(w => w !== target).sort(() => 0.5 - Math.random()).slice(0, mode === 'aapnootmies' || level >= 3 ? 5 : 3);
      options = [target, ...dist].sort(() => 0.5 - Math.random());
      startTime = Date.now();
      document.getElementById('lvlBadge').textContent = mode === 'aapnootmies' ? 'ANM' : ('L' + level);
      document.getElementById('langBtn').textContent = lang.toUpperCase();
      document.getElementById('targetBox').textContent = target + ' 🔊';
      renderGrid();
      speak(target);
    }

    function renderGrid() {
      const elapsed = Date.now() - startTime;
      const base = 4000 + Math.max(0, streak) * 2000;
      const box = document.getElementById('gridBox');
      box.innerHTML = '';
      options.forEach(w => {
        const btn = document.createElement('button');
        btn.className = 'relative overflow-hidden h-32 sm:h-40 rounded-3xl border-4 border-slate-700 bg-slate-800 text-4xl sm:text-6xl font-bold flex items-center justify-center active:scale-95 transition-transform';
        const imgUri = ANM_IMAGES[w.toLowerCase()];
        if (imgUri) {
          const aliveness = Math.min(1, Math.max(0.25, (elapsed - 1200) / 6000));
          const dashOff = Math.round(420 * (1 - aliveness));
          const svgWrap = document.createElement('div');
          svgWrap.className = 'absolute inset-0 pointer-events-none';
          svgWrap.innerHTML = '<svg viewBox="0 0 200 140" class="w-full h-full"><defs><clipPath id="cp-' + w + '"><rect x="44" y="20" width="112" height="100" rx="14"/></clipPath></defs><g opacity="' + (0.25 + aliveness * 0.65).toFixed(2) + '"><image href="' + imgUri + '" x="44" y="20" width="112" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp-' + w + ')"/><rect x="44" y="20" width="112" height="100" rx="14" fill="none" stroke="#d4b483" stroke-width="2.2" stroke-dasharray="420" stroke-dashoffset="' + dashOff + '"/></g></svg>';
          btn.appendChild(svgWrap);
        }
        const wordWrap = document.createElement('div');
        wordWrap.className = 'relative z-10 px-3 py-0.5 rounded-2xl bg-slate-900/65';
        w.split('').forEach((ch, idx) => {
          const span = document.createElement('span');
          span.textContent = ch;
          const prefixOk = w.substring(0, idx) === target.substring(0, idx);
          const lit = prefixOk && elapsed > (base + idx * 3000);
          span.style.color = lit ? COLORS[idx % COLORS.length] : '#ffffff';
          span.style.transition = 'color 0.6s ease';
          wordWrap.appendChild(span);
        });
        btn.appendChild(wordWrap);
        btn.onclick = () => {
          if (w === target) {
            streak++;
            const pr = PRAISES[lang];
            speak(pr[Math.floor(Math.random() * pr.length)]);
            nextRound();
          } else {
            streak = 0;
            speak(w);
          }
        };
        box.appendChild(btn);
      });
    }

    setInterval(renderGrid, 400);
    window.addEventListener('pointermove', e => telemetry.push({ x: Math.round(e.clientX), y: Math.round(e.clientY), t: Date.now(), l: level }));
    document.getElementById('targetBox').onclick = () => speak(target);
    document.getElementById('prevLvl').onclick = () => { mode = 'standard'; level = (level + 5) % 6; nextRound(); };
    document.getElementById('nextLvl').onclick = () => { mode = 'standard'; level = (level + 1) % 6; nextRound(); };
    document.getElementById('anmBtn').onclick = () => { mode = mode === 'aapnootmies' ? 'standard' : 'aapnootmies'; nextRound(); };
    document.getElementById('langBtn').onclick = () => { lang = lang === 'nl' ? 'en' : 'nl'; nextRound(); };
    document.getElementById('dlJsonBtn').onclick = () => {
      const a = document.createElement('a');
      a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ target, mode, level, lang, streak, telemetry }, null, 2));
      a.download = 'rt_tutor_mobile_' + Date.now() + '.json';
      a.click();
    };
    nextRound();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rt_tutor_standalone.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ==========================================================================
  // HIGH-RESOLUTION TELEMETRY, HOVER-CELL DETECTION & PINHOLE TRACKER
  // ==========================================================================

  const registerCellHover = useCallback((word: string | null) => {
    if (hoveredWordRef.current !== word) {
      hoveredWordRef.current = word;
      setHoveredWord(word);

      if (word) {
        cellVisitsRef.current[word] = (cellVisitsRef.current[word] || 0) + 1;
        const isGold = Boolean(currentRound && word === currentRound.target);
        if (isGold && firstGoldenHoverMsRef.current === null) {
          firstGoldenHoverMsRef.current = Date.now() - roundStartTime.current;
        }
        logTimelineEvent(isGold ? 'golden_hover_enter' : 'distractor_hover_enter', {
          word,
          visitCount: cellVisitsRef.current[word]
        });
      }
    }
  }, [currentRound, logTimelineEvent]);

  const handleInteractionEvent = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    lastInteraction.current = now;

    if (isVoiceSilent || idlePhaseRef.current === 2) {
      idlePhaseRef.current = 0;
      setIsVoiceSilent(false);
      setTutorEmotion(kineticMode ? 'PLAYFUL' : 'SERENE');
      playSynth('wake');
      setIntrospectionLog(
        language === 'nl'
          ? `[Beweging Gedetecteerd] Welkom terug! Stem-begeleiding en de bewegende figuurtjes zijn weer actief.`
          : `[Motion Detected] Welcome back! Voice guidance and moving figures are active again.`
      );
    } else if (idlePhaseRef.current === 1) {
      idlePhaseRef.current = 0;
    }

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = Math.round(e.touches[0].clientX);
      clientY = Math.round(e.touches[0].clientY);
    } else if ('clientX' in e) {
      clientX = Math.round(e.clientX);
      clientY = Math.round(e.clientY);
    }

    if (clientX > 0 || clientY > 0) {
      setPointerPos({ x: clientX, y: clientY });

      // Detect hovered word cell via DOM hit-test (works for both mouse & touch drag!)
      if (typeof document !== 'undefined' && document.elementFromPoint) {
        const hitEl = document.elementFromPoint(clientX, clientY);
        const cellButton = hitEl ? hitEl.closest('[data-word]') : null;
        const detectedWord = cellButton ? cellButton.getAttribute('data-word') : null;
        registerCellHover(detectedWord);
      }

      const dt = Math.max(1, now - lastPointerPos.current.t);
      const dx = clientX - lastPointerPos.current.x;
      const dy = clientY - lastPointerPos.current.y;
      const vx = Number((dx / dt).toFixed(3));
      const vy = Number((dy / dt).toFixed(3));
      const velocity = Number((Math.hypot(dx, dy) / dt).toFixed(3));

      currentVelocityRef.current = velocity;
      lastPointerPos.current = { x: clientX, y: clientY, t: now };

      const currentHover = hoveredWordRef.current;
      telemetryData.current.push({
        x: clientX,
        y: clientY,
        t: now,
        l: level,
        vx,
        vy,
        v: velocity,
        hoverCell: currentHover,
        isGoldenHover: Boolean(currentRound && currentHover === currentRound.target)
      });
    }
  }, [isVoiceSilent, kineticMode, language, level, currentRound, playSynth, registerCellHover]);

  // ==========================================================================
  // WORD CLICK HANDLER (With Brain-Rocket Launch & Non-Angry Curiosity)
  // ==========================================================================

  const handleWordClick = (word: string, e: React.MouseEvent<HTMLButtonElement>) => {
    initAudio();
    lastInteraction.current = Date.now();
    if (isVoiceSilent) setIsVoiceSilent(false);
    idlePhaseRef.current = 0;

    if (!currentRound) return;
    const isHit = word === currentRound.target;
    logTimelineEvent(isHit ? 'word_click_hit' : 'word_click_explore', {
      clickedWord: word,
      targetWord: currentRound.target,
      streakBefore: streak
    });

    const rect = e.currentTarget.getBoundingClientRect();
    const shotX = e.clientX || rect.left + rect.width / 2;
    const shotY = e.clientY || rect.top + rect.height / 2;
    const newShot: LaserShot = {
      id: Date.now() + Math.random(),
      x: shotX,
      y: shotY,
      word,
      isHit,
      createdAt: Date.now()
    };
    setLaserShots(prev => [...prev.slice(-4), newShot]);
    if (kineticMode) playSynth('laser');

    if (isHit) {
      const newStreak = streak + 1;

      setTutorEmotion(newStreak >= 2 ? 'WARM_PRIDE' : 'DELIGHTED');

      const isSingleCharHit = word.length === 1;
      const now = Date.now();
      if (now - lastOpaKoTime.current > 3600000) {
        setTimeout(() => {
          speakWord('Opa Ko!', 'nl');
          lastOpaKoTime.current = Date.now();
        }, 1800);
      } else if (introspectionLevel === 2) {
        const msg = language === 'nl'
          ? `Goed zo lieverd! Je herkende ${isSingleCharHit ? `de letter '${word}'` : `het woord '${word}'`} in ${(elapsedTime / 1000).toFixed(1)} seconden.`
          : `Well done darling! You spotted ${isSingleCharHit ? `the letter '${word}'` : `the word '${word}'`} in ${(elapsedTime / 1000).toFixed(1)} seconds.`;
        speakText(msg, { emotionOverride: 'WARM_PRIDE', cancelFirst: true });
      } else {
        speakVariedFromArray(PRAISES[language], 'praise', newStreak >= 2 ? 'WARM_PRIDE' : 'DELIGHTED');
      }

      if (autoLevel && curriculumMode === 'standard' && newStreak >= 5) {
        playSynth('levelup');
        setStreak(0);
        const nextLvl = Math.min(5, level + 1);
        setLevel(nextLvl);
        localStorage.setItem('tutor_level', String(nextLvl));
        generateRound(nextLvl, 0, curriculumMode);
      } else {
        playSynth('correct');
        setStreak(newStreak);
        generateRound(level, newStreak, curriculumMode);
      }
    } else {
      // EXPLORATORY / DISTRACTOR CLICK -> CURIOUS / GENTLE_SURPRISE (NEVER ANGRY, NEVER CALLS 1 LETTER A WORD!)
      playSynth('curious');
      const sharedLen = getMatchingPrefixLength(currentRound.target, word);
      const isSingleChar = word.length === 1 || currentRound.target.length === 1;
      setTutorEmotion(sharedLen > 0 ? 'GENTLE_SURPRISE' : 'CURIOUS');

      if (introspectionLevel === 0) {
        speakWord(word, curriculumMode === 'aapnootmies' ? 'nl' : undefined);
      } else if (introspectionLevel === 1) {
        const msg = isSingleChar
          ? (language === 'nl'
              ? `Dat is de letter '${word}' lieverd, laten we kijken waar de letter '${currentRound.target}' staat.`
              : `That is the letter '${word}' darling, let's see where the letter '${currentRound.target}' is.`)
          : (language === 'nl'
              ? `Dat is '${word}' lieverd, laten we kijken waar '${currentRound.target}' staat.`
              : `That is '${word}' darling, let's see where '${currentRound.target}' is.`);
        speakText(msg, { emotionOverride: 'CURIOUS', cancelFirst: true });
      } else {
        const msg = isSingleChar
          ? (language === 'nl'
              ? `Je tikte op de letter '${word}', en we zoeken nu de letter '${currentRound.target}'.`
              : `You tapped the letter '${word}', and we are looking for the letter '${currentRound.target}'.`)
          : (language === 'nl'
              ? `Je verkende het woord '${word}'. ${sharedLen > 0 ? `Goed gezien dat de eerste ${sharedLen === 1 ? 'letter klopt' : `${sharedLen} letters kloppen`}!` : `Dit woord begint met de letter '${word.charAt(0)}', en we zoeken '${currentRound.target}' met de beginletter '${currentRound.target.charAt(0)}'.`}`
              : `You explored the word '${word}'. ${sharedLen > 0 ? `Great eye, the first ${sharedLen === 1 ? 'letter matches' : `${sharedLen} letters match`}!` : `This word starts with '${word.charAt(0)}', while we are looking for '${currentRound.target}' starting with '${currentRound.target.charAt(0)}'.`}`);
        speakText(msg, { emotionOverride: 'CURIOUS', cancelFirst: true });
      }

      setIntrospectionLog(
        language === 'nl'
          ? `[Nieuwsgierige Verkenning] Klik op ${isSingleChar ? `letter "${word}"` : `woord "${word}"`} i.p.v. "${currentRound.target}" -> Tutor blijft 100% vriendelijk.`
          : `[Curious Exploration] Clicked ${isSingleChar ? `letter "${word}"` : `word "${word}"`} vs "${currentRound.target}" -> Tutor stays 100% supportive.`
      );

      if (autoLevel && curriculumMode === 'standard' && streak <= -1) {
        const prevLvl = Math.max(0, level - 1);
        setLevel(prevLvl);
        localStorage.setItem('tutor_level', String(prevLvl));
        setStreak(0);
        generateRound(prevLvl, 0, curriculumMode);
      } else {
        setStreak(streak > 0 ? -1 : streak - 1);
      }
    }
  };

  // ==========================================================================
  // NAVIGATION, CURRICULUM TABS, 18-EXPRESSION CYCLER & EXPORT CONTROLS
  // ==========================================================================

  const switchCurriculumMode = (mode: CurriculumMode) => {
    setCurriculumMode(mode);
    localStorage.setItem('tutor_curriculum', mode);
    if (mode === 'aapnootmies') {
      setLanguage('nl');
      localStorage.setItem('tutor_lang', 'nl');
      setAnmFigureMode('hybrid');
      setTutorEmotion('EAGER');
    }
    setTimeout(() => generateRound(level, streak, mode), 40);
  };

  const changeLevel = (direction: number) => {
    setCurriculumMode('standard');
    localStorage.setItem('tutor_curriculum', 'standard');
    let newLevel = level + direction;
    if (newLevel < 0) newLevel = 5;
    if (newLevel > 5) newLevel = 0;
    setLevel(newLevel);
    localStorage.setItem('tutor_level', String(newLevel));
    generateRound(newLevel, streak, 'standard');
  };

  const toggleLanguage = () => {
    const newLang: LanguageCode = language === 'nl' ? 'en' : 'nl';
    setLanguage(newLang);
    localStorage.setItem('tutor_lang', newLang);
    setTimeout(() => generateRound(level, streak, curriculumMode), 50);
  };

  const cycleTutorExpression = (e: React.MouseEvent) => {
    e.stopPropagation();
    const curIdx = EMOTION_LIST.indexOf(tutorEmotion);
    const nextEmotion = EMOTION_LIST[(curIdx + 1) % EMOTION_LIST.length];
    setTutorEmotion(nextEmotion);
    const meta = EMOTION_META[nextEmotion];
    setIntrospectionLog(
      language === 'nl'
        ? `[Expressie Test ${meta.idx}/18] Tutor toont nu: ${meta.labelNL} (0% boos, 100% veilig)`
        : `[Expression Test ${meta.idx}/18] Tutor now expressing: ${meta.labelEN} (0% angry)`
    );
  };

  const cycleIntrospectionLevel = () => {
    const nextLvl = ((introspectionLevel + 1) % 3) as IntrospectionLevel;
    setIntrospectionLevel(nextLvl);
    localStorage.setItem('tutor_introspect_lvl', String(nextLvl));
    const descNL = [
      'Introspectie nul: Enkel de gezochte letter of het woord en warme aanmoediging.',
      'Introspectie één: Tutor geeft rustige uitleg bij de letters, woorden en de verlichte leesplank-figuurtjes.',
      'Introspectie twee: Volledige uitleg van de wachttijd en letter-herkenning.'
    ][nextLvl];
    const descEN = [
      'Introspection zero: Target letter or word and warm praise only.',
      'Introspection one: Tutor gently explains the letters, words and the lit figures.',
      'Introspection two: Full explanation of timing and letter recognition.'
    ][nextLvl];
    const text = language === 'nl' ? descNL : descEN;
    setIntrospectionLog(text);
    speakText(text, { emotionOverride: 'ENCOURAGING', cancelFirst: true });
  };

  const triggerManualIntrospection = () => {
    initAudio();
    lastInteraction.current = Date.now();
    if (isVoiceSilent) setIsVoiceSilent(false);
    idlePhaseRef.current = 0;

    const targetStr = currentRound?.target || '';
    const isSingleCharTarget = targetStr.length === 1;
    const goldenMs = cellDwellRef.current[targetStr] || 0;
    const msg = language === 'nl'
      ? `We zoeken nu ${isSingleCharTarget ? `de letter '${targetStr}'` : `het woord '${targetStr}'`}. Je hebt deze ronde ${Math.round(goldenMs)} milliseconden bij het juiste vakje gekeken.`
      : `We are looking for ${isSingleCharTarget ? `the letter '${targetStr}'` : `the word '${targetStr}'`}. You looked at the target cell for ${Math.round(goldenMs)} milliseconds.`;
    setIntrospectionLog(msg);
    speakText(msg, { emotionOverride: tutorEmotion, bypassSilence: true, cancelFirst: true });
  };

  const downloadJsonFile = () => {
    const payload = getTelemetryPayload();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tutor_telemetry_${curriculumMode}_L${level}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {
      const textArea = document.getElementById('json-textarea-box') as HTMLTextAreaElement | null;
      if (textArea) {
        textArea.select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    });
  };

  // ==========================================================================
  // PROGRESSIVE ORTHOGRAPHIC FILTER RENDERER (Smooth Real-Time RGB Morphing)
  // ==========================================================================

  const renderWordWithSmartColors = (word: string, targetWord?: string) => {
    if (!targetWord) return word;

    return word.split('').map((char, idx) => {
      const prefixMatches = word.substring(0, idx) === targetWord.substring(0, idx);

      let overlayOpacity = 0;
      const targetRgb = EURO_RGB[idx % EURO_RGB.length];
      const overlayColor = `rgb(${targetRgb[0]}, ${targetRgb[1]}, ${targetRgb[2]})`;

      if (prefixMatches) {
        const charDelay = baseThreshold + idx * 3200;
        const fadeDuration = 3500;
        overlayOpacity = Math.min(1, Math.max(0, (elapsedTime - charDelay) / fadeDuration));
      }

      return (
        <span key={`${char}-${idx}`} className="relative inline-block">
          <span className="text-slate-100">{char}</span>
          {prefixMatches && (
            <span
              className="absolute left-0 top-0 pointer-events-none"
              style={{
                color: overlayColor,
                opacity: overlayOpacity,
                transition: 'opacity 0.12s linear'
              }}
            >
              {char}
            </span>
          )}
        </span>
      );
    });
  };

  // ==========================================================================
  // START SCREEN (With Brain-Rocket Philosophy & Curriculum Preview)
  // ==========================================================================

  if (!started) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 text-slate-100 flex flex-col items-center justify-center font-sans p-5 overscroll-none select-none">
        <div className="mb-5">
          <TutorAvatarHeader
            emotion="ROCKET_LAUNCH"
            isSilent={false}
            aliveness={0.85}
            language={language}
            onClickAvatar={() => {}}
            onCycleExpression={() => {}}
          />
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold mb-2 text-amber-300 tracking-wide text-center">
          🪵 Aap · Noot · Mies
        </h1>
        <p className="text-xs sm:text-base text-slate-300 mb-6 max-w-md text-center leading-relaxed">
          {language === 'nl'
            ? 'Speels leren lezen met het klassieke Nederlandse leesplankje, levende figuurtjes en een lieve stem.'
            : 'Playful reading with the classic Dutch reading board, living figures and a warm voice.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-xs sm:max-w-md justify-center">
          <button
            onClick={() => {
              initAudio();
              setStarted(true);
            }}
            className="w-full sm:w-auto px-10 py-4 sm:py-5 bg-amber-600 hover:bg-amber-500 rounded-2xl text-xl sm:text-2xl font-bold text-white shadow-lg shadow-amber-900/50 transition-all hover:scale-105 active:scale-95"
          >
            🪵 Start Leesplankje
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAIN INTERACTIVE TUTOR VIEW (Mobile-Responsive 360px+ & Overscroll-Safe)
  // ==========================================================================

  return (
    <div
      className="relative min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans select-none touch-manipulation overscroll-none overflow-hidden"
      onMouseMove={handleInteractionEvent}
      onTouchMove={handleInteractionEvent}
      onTouchStart={handleInteractionEvent}
    >
      {/* ==================================================================== */}
      {/* FOCUS PINHOLE OVERLAY LAYER (Usability & Eye-Tracking Research)      */}
      {/* ==================================================================== */}
      {pinholeEnabled && (
        <div
          className="fixed inset-0 z-30 pointer-events-none"
          style={{
            background: `radial-gradient(circle 115px at ${pointerPos.x}px ${pointerPos.y}px, rgba(15, 23, 42, 0.02) 0%, rgba(15, 23, 42, 0.25) 58%, rgba(6, 10, 20, 0.90) 100%)`
          }}
        >
          <svg className="w-full h-full overflow-visible">
            {/* Inner Foveal Window Ring */}
            <circle
              cx={pointerPos.x}
              cy={pointerPos.y}
              r="65"
              fill="none"
              stroke="#d4b483"
              strokeWidth="1.2"
              strokeDasharray="4 6"
              opacity="0.65"
            />
            {/* Outer Parafoveal Research Ring */}
            <circle
              cx={pointerPos.x}
              cy={pointerPos.y}
              r="115"
              fill="none"
              stroke="#7eaba0"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <text
              x={pointerPos.x + 72}
              y={pointerPos.y - 52}
              fill="#f3c663"
              fontSize="10"
              fontFamily="monospace"
              opacity="0.85"
            >
              {`Fovea (${pointerPos.x},${pointerPos.y}) ${hoveredWord ? `[${hoveredWord}]` : ''}`}
            </text>
          </svg>
        </div>
      )}

      {/* Subtle Soft Ring Ripple on Word Click (No Obtrusive Rocket/Laser Lines) */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-30">
        {laserShots
          .filter(s => Date.now() - s.createdAt < 500)
          .map(shot => {
            const age = (Date.now() - shot.createdAt) / 500;
            const radius = 12 + age * 36;
            const strokeColor = shot.isHit ? '#7eaba0' : '#d4b483';
            return (
              <g key={shot.id} opacity={(1 - age) * 0.65}>
                <circle cx={shot.x} cy={shot.y} r={radius} fill="none" stroke={strokeColor} strokeWidth="2" />
              </g>
            );
          })}
      </svg>

      {/* ==================================================================== */}
      {/* TOP BAR: Curriculum Tabs, Pinhole, 18-Emotion Avatar & JSON Exports  */}
      {/* ==================================================================== */}
      <header className="relative z-40 flex flex-col gap-1.5 px-2.5 sm:px-4 pt-2 sm:pt-3 pb-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Essential Player Controls (Fits cleanly on phones!) */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 shadow">
              <button
                onClick={() => changeLevel(-1)}
                className="px-2 py-1 hover:bg-slate-700 text-slate-300 rounded text-xs sm:text-sm transition-colors"
              >
                ◀
              </button>
              <div className="px-2 sm:px-3 py-1 font-mono font-bold text-xs sm:text-base text-amber-300 bg-slate-900 rounded flex items-center">
                {curriculumMode === 'aapnootmies' ? 'ANM' : `L${level}`}
              </div>
              <button
                onClick={() => changeLevel(1)}
                className="px-2 py-1 hover:bg-slate-700 text-slate-300 rounded text-xs sm:text-sm transition-colors"
              >
                ▶
              </button>
            </div>

            {/* Curriculum Switcher: Aap Noot Mies vs. L0-L5 */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 shadow">
              <button
                onClick={() => switchCurriculumMode('aapnootmies')}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  curriculumMode === 'aapnootmies'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🪵 Aap-Noot
              </button>
              <button
                onClick={() => switchCurriculumMode('standard')}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  curriculumMode === 'standard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📚 L0-L5
              </button>
            </div>

            <button
              onClick={() => setShowLeesplankModal(true)}
              title="Bekijk alle 17 Aap-Noot-Mies figuren op het leesplankje"
              className="px-2 sm:px-2.5 py-1.5 bg-amber-900/50 hover:bg-amber-800/70 border border-amber-500/50 rounded-lg font-bold text-xs text-amber-100 transition-colors shadow"
            >
              🪵 17 Plaatjes
            </button>

            <button
              onClick={toggleLanguage}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-bold text-xs text-slate-200 transition-colors shadow"
            >
              {language.toUpperCase()}
            </button>
          </div>

          {/* Right: Friendly Tutor Avatar + Streak + Subtle Dev Tools Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TutorAvatarHeader
              emotion={tutorEmotion}
              isSilent={isVoiceSilent}
              aliveness={aliveness}
              language={language}
              onClickAvatar={triggerManualIntrospection}
              onCycleExpression={cycleTutorExpression}
            />
            {streak > 0 && (
              <span className="px-2 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
                ⭐ {streak}
              </span>
            )}
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              title="Ontwikkelaars- & Telemetrie-opties tonen/verbergen"
              className={`px-2 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                showDevTools
                  ? 'bg-purple-900/80 border-purple-400 text-purple-100'
                  : 'bg-slate-800/70 border-slate-700/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              🛠️
            </button>
          </div>
        </div>

        {/* Collapsible Developer & Telemetry Toolbar (Hidden by default on phones!) */}
        {showDevTools && (
          <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-xs shadow-xl">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => {
                  const order: AnmFigureMode[] = ['hybrid', 'photo', 'vector'];
                  const next = order[(order.indexOf(anmFigureMode) + 1) % order.length];
                  setAnmFigureMode(next);
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 rounded-lg font-bold text-[11px] text-amber-200"
              >
                🖼️ {anmFigureMode}
              </button>
              <button
                onClick={cycleTutorExpression}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-mono text-[11px] text-amber-300"
              >
                🎭 18 Expr
              </button>
              <button
                onClick={() => {
                  const next = !kineticMode;
                  setKineticMode(next);
                  setTutorEmotion(next ? 'PLAYFUL' : 'SERENE');
                }}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] border ${
                  kineticMode
                    ? 'bg-purple-900/60 border-purple-400/60 text-purple-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                🎯 Kinetic: {kineticMode ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setPinholeEnabled(!pinholeEnabled)}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] border ${
                  pinholeEnabled
                    ? 'bg-amber-900/70 border-amber-400 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                🔦 Pinhole: {pinholeEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={cycleIntrospectionLevel}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-mono font-bold text-[11px] text-amber-300"
              >
                🧠 L{introspectionLevel}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => triggerDrillThroughCapture('UI_BUTTON', true)}
                className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded-lg text-[11px] font-bold font-mono text-white"
              >
                🎯 Ctrl+Shift+Alt+G
              </button>
              <button
                onClick={generateJsonDump}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[11px] font-bold font-mono text-white"
              >
                📋 JSON
              </button>
              <button
                onClick={downloadJsonFile}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-[11px] font-bold font-mono text-white"
              >
                💾 .JSON
              </button>
              <button
                onClick={exportStandaloneHtml}
                className="px-2 py-1 bg-amber-700/80 hover:bg-amber-600 rounded-lg text-[11px] font-bold font-mono text-amber-100"
              >
                📦 HTML
              </button>
              <label className="flex items-center gap-1 cursor-pointer pl-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Auto</span>
                <input
                  type="checkbox"
                  checked={autoLevel}
                  onChange={(e) => setAutoLevel(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-500"
                />
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <span className="text-[10px] text-slate-400 font-bold uppercase">FFT</span>
                <input
                  type="checkbox"
                  checked={inspectMode}
                  onChange={(e) => setInspectMode(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500"
                />
              </label>
            </div>
          </div>
        )}
      </header>

      {/* ==================================================================== */}
      {/* FLOATING INSPECT HUD: Live Hard Data & 2D-FFT Spectral Readout       */}
      {/* ==================================================================== */}
      {inspectMode && (
        <div className="fixed top-24 right-3 z-40 w-72 text-[11px] font-mono text-emerald-300 bg-slate-900/95 p-3 rounded-xl border border-emerald-700/80 shadow-2xl space-y-1.5 pointer-events-none">
          <div className="font-bold text-amber-300 border-b border-slate-800 pb-1 flex justify-between">
            <span>🔬 HARD DATA & 2D-FFT</span>
            <span>PTS: {telemetryData.current.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Hover Cel:</span>
            <span className="font-bold text-white">
              {hoveredWord ? `"${hoveredWord}" ${hoveredWord === currentRound?.target ? '🌟(GOUD)' : ''}` : 'geen'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Gouden Cel Dwell:</span>
            <span className="text-amber-300">
              {liveDerivedData.hoverAnalytics.goldenCellDwellMs}ms (Fase {liveDerivedData.hoverAnalytics.goldenCellEvolutionStage}/4)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Snelheid / Jerk:</span>
            <span>{liveDerivedData.kinematics.instantVelocityPxMs} px/ms | {liveDerivedData.kinematics.rmsJerkPxMs3}</span>
          </div>
          <div className="flex justify-between">
            <span>Directheid / Reversals:</span>
            <span>{(liveDerivedData.kinematics.directnessIndex * 100).toFixed(0)}% | {liveDerivedData.kinematics.directionReversals}x</span>
          </div>
          <div className="border-t border-slate-800 pt-1 text-[10px] text-slate-300">
            <div className="flex justify-between">
              <span>2D-FFT Dom. Freq:</span>
              <span className="text-emerald-400">
                X:{liveDerivedData.fft2D.dominantFrequencyXHz}Hz Y:{liveDerivedData.fft2D.dominantFrequencyYHz}Hz
              </span>
            </div>
            <div className="flex justify-between">
              <span>Banden (Nav/Scan/Tremor):</span>
              <span>
                {liveDerivedData.fft2D.lowFreqMacroNavPower.toFixed(2)} / {liveDerivedData.fft2D.midFreqScanPower.toFixed(2)} / {liveDerivedData.fft2D.highFreqTremorPower.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Spectrale Signatuur:</span>
              <span className="text-amber-300 font-bold">{liveDerivedData.fft2D.cognitiveLoadSignature}</span>
            </div>
          </div>
          {/* Mini 2D-FFT Bar Spectrum */}
          <div className="flex items-end gap-1 h-8 pt-1 border-t border-slate-800">
            {liveDerivedData.fft2D.bins.map((b) => {
              const barH = Math.min(28, Math.max(3, Math.round(b.power2D * 180)));
              return (
                <div key={b.freqHz} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-emerald-500/80 rounded-t"
                    style={{ height: `${barH}px` }}
                  />
                  <span className="text-[8px] text-slate-500">{b.freqHz}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CTRL+SHIFT+ALT+G DRILL-THROUGH TOAST & EXTERNAL AI CO-PILOT BANNER   */}
      {/* ==================================================================== */}
      {drillThroughToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-purple-950/95 border-2 border-purple-400 text-purple-100 font-mono text-xs shadow-2xl flex items-center gap-3">
          <span>{drillThroughToast}</span>
          <button
            onClick={() => setShowJsonModal(true)}
            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 rounded-lg font-bold text-white"
          >
            Open Buffer
          </button>
        </div>
      )}

      {aiAugmentation.customEncouragementBanner && (
        <div className="relative z-30 mx-auto mt-1 px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-mono flex items-center gap-2 shadow-lg">
          <span>🤖 AI Co-Pilot: {aiAugmentation.customEncouragementBanner}</span>
          <span className="text-amber-400/80">
            (Hint×{aiAugmentation.hintThrottleMultiplier.toFixed(2)} | Kinetic×{aiAugmentation.kineticSpeedMultiplier.toFixed(2)})
          </span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MAIN COGNITIVE GAME BOARD (Fluid Mobile-Safe Typography & Grid)      */}
      {/* ==================================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center px-2.5 sm:px-6 py-2 sm:py-4">
        {/* Target Word Display */}
        <div
          className="mb-3 sm:mb-8 cursor-pointer group relative"
          onClick={() => {
            lastInteraction.current = Date.now();
            if (isVoiceSilent) setIsVoiceSilent(false);
            speakWord(currentRound?.target || '', curriculumMode === 'aapnootmies' ? 'nl' : undefined);
          }}
        >
          <h1 className="text-5xl sm:text-8xl md:text-[104px] leading-none font-black tracking-tight text-white flex items-center justify-center transition-transform group-active:scale-95">
            {currentRound?.target && renderWordWithSmartColors(currentRound.target, currentRound.target)}
            <span className="ml-2.5 sm:ml-4 text-xl sm:text-3xl opacity-40 group-hover:opacity-90 transition-opacity">
              {isVoiceSilent ? '🔇' : '🔊'}
            </span>
          </h1>
        </div>

        {/* Dynamic Word/Letter Grid with Real-Time Hover Detection & Golden Cell Evolution */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5 max-w-6xl w-full px-1 sm:px-4">
          {currentRound?.options.map((word, i) => {
            const matchLen = getMatchingPrefixLength(currentRound.target, word);
            const isCandidateMatch = matchLen > 0;
            const isExactTarget = word === currentRound.target;
            const isHovered = hoveredWord === word;
            const hoverDwellMs = cellDwellState[word] || 0;
            const goldenGlowIntensity = isExactTarget ? Math.min(1, hoverDwellMs / 2200) : 0;

            const kinetic = kineticMode && kineticOffsets[i]
              ? kineticOffsets[i]
              : { dx: 0, dy: 0, rot: 0 };

            return (
              <button
                key={`${word}-${i}`}
                data-word={word}
                onMouseEnter={() => registerCellHover(word)}
                onMouseLeave={() => {
                  if (hoveredWordRef.current === word) registerCellHover(null);
                }}
                onClick={(e) => handleWordClick(word, e)}
                style={{
                  transform: kineticMode
                    ? `translate3d(${kinetic.dx.toFixed(1)}px, ${kinetic.dy.toFixed(1)}px, 0) rotate(${kinetic.rot.toFixed(2)}deg)`
                    : undefined,
                  borderColor: isExactTarget && goldenGlowIntensity > 0.25
                    ? `rgba(243, 198, 99, ${0.45 + goldenGlowIntensity * 0.55})`
                    : undefined,
                  boxShadow: isExactTarget && goldenGlowIntensity > 0.3
                    ? `0 0 ${Math.round(28 * goldenGlowIntensity)}px rgba(245, 158, 11, ${0.35 * goldenGlowIntensity})`
                    : undefined
                }}
                className="relative group overflow-hidden h-36 sm:h-52 md:h-56 p-0 rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-slate-700 bg-slate-800/95 text-slate-100 hover:border-slate-500 shadow-xl flex flex-col items-stretch justify-between transition-colors active:scale-95"
              >
                {/* TOP COMPARTMENT: Dedicated SVG + Alpha-WebP Aap-Noot-Mies + 1960s Motion-Lamp Animation */}
                <div className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-slate-800/90">
                  <CellSvgUnderlay
                    word={word}
                    aliveness={aliveness}
                    hoverDwellMs={hoverDwellMs}
                    isHovered={isHovered}
                    isCandidateMatch={isCandidateMatch}
                    isTarget={isExactTarget}
                    level={level}
                    animTick={animTick + i * 0.9}
                    anmFigureMode={anmFigureMode}
                  />

                  {/* 2D Kinetic Target Corner Reticles */}
                  {kineticMode && (
                    <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none opacity-25 group-hover:opacity-60 transition-opacity" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M 2 18 L 2 2 L 18 2" fill="none" stroke="#d4b483" strokeWidth="1.5" />
                      <path d="M 82 2 L 98 2 L 98 18" fill="none" stroke="#d4b483" strokeWidth="1.5" />
                      <path d="M 2 82 L 2 98 L 18 98" fill="none" stroke="#d4b483" strokeWidth="1.5" />
                      <path d="M 82 98 L 98 98 L 98 82" fill="none" stroke="#d4b483" strokeWidth="1.5" />
                    </svg>
                  )}
                </div>

                {/* BOTTOM COMPARTMENT: Separate Leesplankje Word / Single Letter Strip */}
                <div className="relative z-10 w-full py-1 sm:py-1.5 px-2 bg-slate-950/95 border-t-2 border-slate-700/80 flex items-center justify-center shrink-0 text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-wide">
                  {renderWordWithSmartColors(word, currentRound.target)}

                  {/* Subtle Golden Cell Stage Progress Bar at Bottom of Cell */}
                  {hoverDwellMs > 150 && (
                    <div
                      className="absolute bottom-0 left-0 h-1 transition-all pointer-events-none"
                      style={{
                        width: `${Math.min(100, Math.round((hoverDwellMs / 2400) * 100))}%`,
                        backgroundColor: isExactTarget ? '#f59e0b' : '#7eaba0',
                        opacity: 0.85
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* BOTTOM BAR: Clean Tutor Message (2D-FFT Telemetry only in Dev Mode)  */}
      {/* ==================================================================== */}
      {showDevTools ? (
        <footer className="relative z-30 mx-2.5 sm:mx-4 mb-2 px-3 py-1.5 rounded-xl bg-slate-800/75 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2 truncate max-w-full sm:max-w-[60%]">
            <span className="text-amber-300 font-bold uppercase shrink-0">
              {isVoiceSilent ? '🔇 Standby:' : `🗣️ L${introspectionLevel}:`}
            </span>
            <span className="text-slate-200 truncate">{introspectionLog}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 shrink-0">
            <span className="text-amber-300/90">
              Hover: {hoveredWord ? `"${hoveredWord}" (${cellDwellState[hoveredWord] || 0}ms)` : '—'}
            </span>
            <span>2D-FFT: {liveDerivedData.fft2D.dominantFrequencyXHz}Hz</span>
            <span>PTS: {telemetryData.current.length}</span>
          </div>
        </footer>
      ) : (
        <div className="h-2 sm:h-3" />
      )}

      {/* ==================================================================== */}
      {/* INTERACTIVE 17-FIGURE LEESPLANKJE (AAP-NOOT-MIES) CUT-OUT MODAL       */}
      {/* ==================================================================== */}
      {showLeesplankModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-amber-500/60 w-full max-w-5xl rounded-2xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 bg-slate-800/80">
              <div>
                <h3 className="font-bold text-amber-300 text-base sm:text-lg flex items-center gap-2">
                  🪵 Het Klassieke Leesplankje — 17 Uitgeknipte & SVG-Geanimeerde Figuren
                </h3>
                <p className="text-xs text-slate-400">
                  Klik op een figuurtje om het woord te horen en direct als doelwoord te oefenen in de Brein-Raket!
                </p>
              </div>
              <button
                onClick={() => setShowLeesplankModal(false)}
                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs sm:text-sm font-bold text-white"
              >
                ✕ Sluiten
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 bg-amber-950/20">
              {[
                ['aap', 'noot', 'mies', 'wim', 'zus', 'jet'],
                ['teun', 'vuur', 'gijs', 'lam', 'kees', 'bok'],
                ['weide', 'does', 'hok', 'duif', 'schapen']
              ].map((rowWords, rIdx) => (
                <div
                  key={rIdx}
                  className={`grid gap-2.5 sm:gap-3 ${
                    rowWords.length === 6 ? 'grid-cols-2 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-5'
                  }`}
                >
                  {rowWords.map((w) => {
                    const fig = AAP_NOOT_MIES_FIGURES[w];
                    return (
                      <button
                        key={w}
                        onClick={() => {
                          initAudio();
                          speakWord(w, 'nl');
                          setCurriculumMode('aapnootmies');
                          localStorage.setItem('tutor_curriculum', 'aapnootmies');
                          const distractors = AAP_NOOT_MIES_WORDS.filter(x => x !== w)
                            .sort(() => 0.5 - Math.random())
                            .slice(0, 5);
                          const opts = [w, ...distractors].sort(() => 0.5 - Math.random());
                          roundStartTime.current = Date.now();
                          setCurrentRound({ target: w, options: opts });
                          setShowLeesplankModal(false);
                        }}
                        className="group relative flex flex-col items-center bg-slate-800/95 hover:bg-slate-800 border-2 border-amber-500/40 hover:border-amber-400 rounded-2xl p-2 shadow-lg transition-all hover:scale-[1.03] active:scale-95"
                      >
                        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                          <CellSvgUnderlay
                            word={w}
                            aliveness={0.92}
                            hoverDwellMs={1600}
                            isHovered={true}
                            isCandidateMatch={true}
                            isTarget={w === currentRound?.target}
                            level={1}
                            animTick={animTick}
                            anmFigureMode={anmFigureMode}
                          />
                        </div>
                        <span className="mt-1.5 text-lg sm:text-xl font-black tracking-wide text-amber-100 group-hover:text-amber-300">
                          {w}
                        </span>
                        {fig && (
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-full">
                            {language === 'nl' ? fig.labelNL : fig.labelEN}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MASSIVE JSON TELEMETRY MODAL (Includes Hard Data + Derived 2D-FFT)   */}
      {/* ==================================================================== */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
              <h3 className="font-mono font-bold text-emerald-400 text-base sm:text-lg">
                Massive JSON Telemetry + Derived 2D-FFT & Golden Cell Dump
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <p className="text-xs text-slate-400 mb-2">
                Contains complete session hard data ({telemetryData.current.length} x,y,t,vx,vy,hoverCell points) + derivedHardData (kinematics, cell dwell matrix, and 2D-FFT spectral power):
              </p>
              <textarea
                id="json-textarea-box"
                readOnly
                value={jsonText}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full flex-1 min-h-[280px] sm:min-h-[340px] bg-slate-950 font-mono text-xs text-emerald-300 p-4 rounded-xl border border-slate-800 resize-none focus:outline-none"
              />
            </div>

            <div className="p-4 border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 bg-slate-800/50 rounded-b-2xl">
              <button
                onClick={downloadJsonFile}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-colors"
              >
                💾 Save as .JSON File
              </button>

              <div className="flex gap-3 items-center">
                {copySuccess && (
                  <span className="text-emerald-400 text-xs sm:text-sm font-bold animate-pulse">
                    Copied to Clipboard!
                  </span>
                )}
                <button
                  onClick={copyToClipboard}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-colors"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}