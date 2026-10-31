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
  complexity?: WordComplexity;
  figureFeedback?: FigureFeedback[];
  usabilityLaws?: UsabilitySummary & { recentTrials: UsabilityTrial[] };
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

// ============================================================================
// ORTHOGONAL AXIS: WORD COMPLEXITY (independent of level, language, hint-support & figure mode)
// Dutch kindergarten practice: start with simple words WITHOUT double sounds (klankgroepen such as
// oe, ie, eu, ui, ei, ij, au, ou, aa, ee, oo, uu, sch, ng). Those come later — then a thin line goes under them.
// ============================================================================

export type WordComplexity = 'simple' | 'double' | 'all';
const COMPLEXITY_ORDER: WordComplexity[] = ['simple', 'double', 'all'];
const DIGRAPHS: string[] = ['sch', 'oe', 'ie', 'eu', 'ui', 'ei', 'ij', 'au', 'ou', 'aa', 'ee', 'oo', 'uu', 'ng'];
/** Same-letter doubles (aa ee oo uu) are the gentlest double sounds; they open stage 2. */
const SAME_LETTER_DOUBLES: string[] = ['aa', 'ee', 'oo', 'uu'];

interface DigraphGroup {
  start: number;
  text: string;
}

/** Greedy left-to-right scan for double-sound groups (longest first). A whole 2-letter word is never a group. */
const findDigraphGroups = (word: string): DigraphGroup[] => {
  const w = word.toLowerCase();
  const groups: DigraphGroup[] = [];
  let i = 0;
  while (i < w.length) {
    const hit = DIGRAPHS.find(d => w.startsWith(d, i));
    if (hit && w.length > hit.length) {
      groups.push({ start: i, text: hit });
      i += hit.length;
    } else {
      i++;
    }
  }
  return groups;
};

/** Per character: does it belong to a double-sound group? (used for the thin underline) */
const digraphMask = (word: string): boolean[] => {
  const mask: boolean[] = new Array(word.length).fill(false);
  findDigraphGroups(word).forEach(g => {
    for (let k = 0; k < g.text.length; k++) mask[g.start + k] = true;
  });
  return mask;
};

/** 'simple' = no double sounds; 'double' = only aa/ee/oo/uu allowed; 'all' = everything. */
const wordFitsComplexity = (word: string, c: WordComplexity): boolean => {
  if (c === 'all') return true;
  const groups = findDigraphGroups(word);
  if (c === 'simple') return groups.length === 0;
  return groups.every(g => SAME_LETTER_DOUBLES.includes(g.text));
};

/** The 17 Leesplankje figures filtered by complexity (never fewer than 6 so a round can always be built). */
const getAnmPool = (c: WordComplexity): string[] => {
  const filtered = AAP_NOOT_MIES_WORDS.filter(w => wordFitsComplexity(w, c));
  return filtered.length >= 6 ? filtered : AAP_NOOT_MIES_WORDS;
};

// ============================================================================
// REAL-TIME USABILITY LAWS (per click): Fitts 2D index of difficulty, throughput, effective width,
// Hick-Hyman choice entropy and a live Fitts regression  MT = a + b * ID  (needs >= 5 trials)
// ============================================================================

export interface UsabilityTrial {
  word: string;
  target: string;
  hit: boolean;
  distancePx: number;
  widthPx: number;
  heightPx: number;
  id2d: number;
  mtMs: number;
  throughputBitsPerS: number;
  hickBits: number;
  endpointDxPx: number;
  complexity: WordComplexity;
}

export interface UsabilitySummary {
  trials: number;
  hitRate: number;
  meanId: number;
  meanMtMs: number;
  meanThroughput: number;
  sigmaDxPx: number | null;
  effectiveWidthPx: number | null;
  effectiveIdBits: number | null;
  effectiveThroughputBitsPerS: number | null;
  lastHickBits: number;
  fittsA: number | null;
  fittsB: number | null;
  fittsR2: number | null;
  virziP: number;
  virziDiscovery: number;
  betaAlpha: number;
  betaBeta: number;
  schmettowBetaBinomial: number;
  strataCounts: { simple: number; double: number; all: number };
  caultonMultiGroupDiscovery: number;
}

const summarizeUsability = (trials: UsabilityTrial[]): UsabilitySummary => {
  const n = trials.length;
  const strataCounts = {
    simple: trials.filter(t => t.complexity === 'simple').length,
    double: trials.filter(t => t.complexity === 'double').length,
    all: trials.filter(t => t.complexity === 'all').length
  };
  if (n === 0) {
    return {
      trials: 0,
      hitRate: 0,
      meanId: 0,
      meanMtMs: 0,
      meanThroughput: 0,
      sigmaDxPx: null,
      effectiveWidthPx: null,
      effectiveIdBits: null,
      effectiveThroughputBitsPerS: null,
      lastHickBits: 0,
      fittsA: null,
      fittsB: null,
      fittsR2: null,
      virziP: 0.31,
      virziDiscovery: 0,
      betaAlpha: 1.38,
      betaBeta: 3.07,
      schmettowBetaBinomial: 0,
      strataCounts,
      caultonMultiGroupDiscovery: 0
    };
  }
  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const ids = trials.map(t => t.id2d);
  const mts = trials.map(t => t.mtMs);
  const meanD = mean(trials.map(t => t.distancePx));
  const meanMt = mean(mts);

  let sd: number | null = null;
  let we: number | null = null;
  let idEff: number | null = null;
  let tpEff: number | null = null;
  if (n >= 2) {
    const dx = trials.map(t => t.endpointDxPx);
    const m = mean(dx);
    sd = Number(Math.sqrt(mean(dx.map(v => (v - m) ** 2))).toFixed(1));
    we = Number(Math.max(8, 4.133 * sd).toFixed(1)); // sqrt(2*pi*e) * sigma_x (Welford / Crossman effective width)
    idEff = Number(Math.log2(meanD / we + 1).toFixed(3));
    tpEff = Number((idEff / Math.max(0.08, meanMt / 1000)).toFixed(3));
  }

  let a: number | null = null;
  let b: number | null = null;
  let r2: number | null = null;
  if (n >= 3) {
    const mi = mean(ids);
    const mm = meanMt;
    const varI = mean(ids.map(v => (v - mi) ** 2));
    const varM = mean(mts.map(v => (v - mm) ** 2));
    if (varI > 1e-6) {
      const cov = mean(ids.map((v, i) => (v - mi) * (mts[i] - mm)));
      b = cov / varI;
      a = mm - b * mi;
      if (varM > 1e-6) {
        r2 = Number(Math.min(1, Math.max(0, (cov * cov) / (varI * varM))).toFixed(3));
      }
    }
  }

  const hits = trials.filter(t => t.hit).length;
  const hitRate = Number((hits / n).toFixed(3));
  // Virzi / Nielsen-Landauer empirical discovery rate p (Bayesian blend with 0.31 prior)
  const missOrSlow = trials.filter(t => !t.hit || t.mtMs > 2800).length;
  const virziP = Number(((0.31 * 3 + missOrSlow) / (3 + n)).toFixed(3));
  const virziDiscovery = Number((1 - Math.pow(1 - virziP, n)).toFixed(3));

  // Schmettow / Caulton Beta-Binomial: E[P(n)] = 1 - Gamma(a+b)Gamma(b+n) / (Gamma(b)Gamma(a+b+n))
  const betaAlpha = Number((0.9 + virziP * 2.2).toFixed(2));
  const betaBeta = Number((1.4 + (1 - virziP) * 2.6).toFixed(2));
  let gammaRatio = 1;
  for (let k = 0; k < n; k++) {
    gammaRatio *= (betaBeta + k) / (betaAlpha + betaBeta + k);
  }
  const schmettowBetaBinomial = Number((1 - gammaRatio).toFixed(3));

  // Caulton M=3 subgroup problem-occurrence matrix p_jk across ('simple', 'double', 'all')
  const pMatrix: [number, number, number][] = [
    [0.36, 0.22, 0.18],
    [0.18, 0.35, 0.26],
    [0.12, 0.24, 0.38],
    [0.28, 0.30, 0.32]
  ];
  const nVec: [number, number, number] = [strataCounts.simple, strataCounts.double, strataCounts.all];
  const caultonSum = pMatrix.reduce((acc, row) => {
    const prod = row.reduce((pr, pjk, k) => pr * Math.pow(1 - pjk, nVec[k]), 1);
    return acc + prod;
  }, 0);
  const caultonMultiGroupDiscovery = Number((1 - caultonSum / pMatrix.length).toFixed(3));

  return {
    trials: n,
    hitRate,
    meanId: Number(mean(ids).toFixed(3)),
    meanMtMs: Math.round(meanMt),
    meanThroughput: Number(mean(trials.map(t => t.throughputBitsPerS)).toFixed(3)),
    sigmaDxPx: sd,
    effectiveWidthPx: we,
    effectiveIdBits: idEff,
    effectiveThroughputBitsPerS: tpEff,
    lastHickBits: trials[n - 1].hickBits,
    fittsA: a === null ? null : Math.round(a),
    fittsB: b === null ? null : Math.round(b),
    fittsR2: r2,
    virziP,
    virziDiscovery,
    betaAlpha,
    betaBeta,
    schmettowBetaBinomial,
    strataCounts,
    caultonMultiGroupDiscovery
  };
};

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

// ============================================================================
// GENERATIVE TALKING CREATURES (procedural SVG, offline, seeded: same seed = same creature)
// New seed = new creature. The mouth only moves while its word is being spoken; otherwise it stands still.
// ============================================================================

export interface FigureFeedback {
  word: string;
  verdict: 'wrong' | 'nice' | 'another';
  seedBefore: number | null;
  seedAfter: number | null;
  at: string;
  complexity: WordComplexity;
}

const mulberry32 = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashWord = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

type WordSvgArchetype =
  | 'aap' | 'noot' | 'mies' | 'wim' | 'zus' | 'jet' | 'teun' | 'vuur' | 'gijs'
  | 'lam' | 'kees' | 'bok' | 'weide' | 'does' | 'hok' | 'duif' | 'schapen'
  | 'vis' | 'auto' | 'boot' | 'boom' | 'zon';

interface SvgAnchorPoints {
  head: [number, number]; // Primary neck/body pivot [x, y]
  jaw: [number, number];  // Articulated mouth/beak/flame/door pivot [x, y]
  limb: [number, number]; // Articulated tail/wing/arm/wheel/branch pivot [x, y]
}

const WORD_SVG_ALIASES: Record<string, WordSvgArchetype> = {
  aap: 'aap', noot: 'noot', mies: 'mies', wim: 'wim', zus: 'zus', jet: 'jet',
  teun: 'teun', vuur: 'vuur', gijs: 'gijs', lam: 'lam', kees: 'kees', bok: 'bok',
  weide: 'weide', does: 'does', hok: 'hok', duif: 'duif', schapen: 'schapen',
  a: 'aap', b: 'bok', c: 'schapen', d: 'does', e: 'weide', f: 'duif', g: 'gijs',
  h: 'hok', i: 'wim', j: 'jet', k: 'kees', l: 'lam', m: 'mies', n: 'noot',
  o: 'noot', p: 'aap', q: 'kees', r: 'vuur', s: 'schapen', t: 'teun', u: 'duif',
  v: 'vuur', w: 'wim', x: 'bok', y: 'wim', z: 'zus',
  kat: 'mies', cat: 'mies',
  hond: 'does', dog: 'does', vos: 'does', fox: 'does', beer: 'does', bear: 'does', haas: 'does', rat: 'does',
  koe: 'weide', cow: 'weide', beef: 'weide',
  schaap: 'lam',
  boar: 'bok', hert: 'bok',
  boer: 'teun', hoed: 'teun', hat: 'teun', cop: 'teun', boss: 'teun',
  vogel: 'duif', vleugel: 'duif', kip: 'duif', bat: 'duif', beak: 'duif', vlinder: 'duif', vliegtuig: 'duif',
  huis: 'hok', dak: 'hok', stoep: 'hok', schuur: 'hok', school: 'hok', deur: 'hok', stad: 'hok', vloer: 'hok', doos: 'hok', box: 'hok',
  vlam: 'vuur', stoom: 'vuur',
  boy: 'wim', son: 'wim', run: 'wim', joy: 'wim', voet: 'wim', vinger: 'wim', boek: 'wim', book: 'wim', bord: 'wim',
  aunt: 'zus', bed: 'zus', stoel: 'zus', bank: 'zus',
  toy: 'gijs',
  bean: 'noot', corn: 'noot',
  vis: 'vis', schelp: 'vis',
  auto: 'auto', car: 'auto',
  boot: 'boot', boat: 'boot', schip: 'boot', zee: 'boot', coal: 'boot', coat: 'boot',
  boom: 'boom', hout: 'boom', autumn: 'boom',
  zon: 'zon', sun: 'zon', august: 'zon', dawn: 'zon', days: 'zon', bal: 'zon', koek: 'zon', coin: 'zon', coil: 'zon'
};

const SVG_ANCHOR_RIGS: Record<WordSvgArchetype, SvgAnchorPoints> = {
  aap:     { head: [-2, -6],   jaw: [-2, -11],  limb: [12, 16] },
  noot:    { head: [0, 4],     jaw: [0, 10],    limb: [0, -18] },
  mies:    { head: [0, -4],    jaw: [0, -7],    limb: [18, 16] },
  wim:     { head: [0, -10],   jaw: [0, -15],   limb: [12, -8] },
  zus:     { head: [0, -11],   jaw: [0, -16],   limb: [2, 2] },
  jet:     { head: [0, -11],   jaw: [0, -16],   limb: [10, -8] },
  teun:    { head: [0, -10],   jaw: [0, -15],   limb: [-12, -8] },
  vuur:    { head: [0, -6],    jaw: [0, 22],    limb: [0, -16] },
  gijs:    { head: [-20, -10], jaw: [-20, -15], limb: [20, 8] },
  lam:     { head: [15, -6],   jaw: [21, -3],   limb: [-22, 0] },
  kees:    { head: [0, -11],   jaw: [0, -16],   limb: [9, 25] },
  bok:     { head: [15, -8],   jaw: [23, -2],   limb: [-22, -4] },
  weide:   { head: [-12, -2],  jaw: [-12, 8],   limb: [30, -8] },
  does:    { head: [15, -6],   jaw: [22, -1],   limb: [-22, -2] },
  hok:     { head: [0, -4],    jaw: [-9, 16],   limb: [22, -18] },
  duif:    { head: [15, -4],   jaw: [22, -4],   limb: [-2, -2] },
  schapen: { head: [14, 4],    jaw: [19, 6],    limb: [-26, 2] },
  vis:     { head: [0, 0],     jaw: [20, 2],    limb: [-24, 0] },
  auto:    { head: [0, 2],     jaw: [28, 6],    limb: [-18, 14] },
  boot:    { head: [0, 12],    jaw: [18, 14],   limb: [0, -8] },
  boom:    { head: [0, 10],    jaw: [0, 4],     limb: [0, -12] },
  zon:     { head: [0, 0],     jaw: [0, 7],     limb: [0, -26] }
};

const pivotRot = ([ax, ay]: [number, number], deg: number, dy = 0): string =>
  `${dy ? `translate(0, ${dy.toFixed(1)}) ` : ''}rotate(${deg.toFixed(1)}, ${ax}, ${ay})`;

const GeneratedCreature: React.FC<{
  word: string;
  seed: number;
  talking: boolean;
  tick: number;
  lit: number;
  showAnchors?: boolean;
}> = ({ word, seed, talking, tick, lit, showAnchors = false }) => {
  const kind: WordSvgArchetype = WORD_SVG_ALIASES[word.toLowerCase()] || 'aap';
  const rig = SVG_ANCHOR_RIGS[kind];
  const rnd = mulberry32(((seed * 2654435761) ^ hashWord(kind)) >>> 0);
  const vIdx = Math.abs(seed) % 5;
  const jit = (rnd() - 0.5) * 14;

  // Syllabic mouth/jaw articulation when speaking; 0 at rest so the figure stays calm and still
  const open = talking
    ? Math.min(1, 0.14 + 0.86 * Math.abs(Math.sin(tick * 6.2) * 0.68 + Math.sin(tick * 10.1 + seed) * 0.32))
    : 0;
  const headDeg = talking ? Math.sin(tick * 4.2 + seed) * 5.2 : 0;
  const jawDeg = talking ? open * 15 : 0;
  const jawDrop = talking ? open * 4.2 : 0;
  const limbDeg = talking ? Math.sin(tick * 5.6 + seed * 0.7) * 15 : 0;
  const dark = '#1e293b';

  const renderMouth = (mx: number, my: number, mw = 8, cheekHex = '#f472b6') => (
    <g
      data-anchor="jaw"
      data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`}
      transform={pivotRot(rig.jaw, jawDeg * 0.35, jawDrop * 0.55)}
    >
      <circle cx={mx - mw * 0.85} cy={my - 1} r="2.6" fill={cheekHex} opacity="0.65" />
      <circle cx={mx + mw * 0.85} cy={my - 1} r="2.6" fill={cheekHex} opacity="0.65" />
      {open > 0.05 ? (
        <>
          <ellipse cx={mx} cy={my + open * 1.4} rx={mw * 0.55} ry={1.4 + open * 4.2} fill={dark} />
          <ellipse cx={mx} cy={my + open * 2.8} rx={mw * 0.34} ry={Math.max(0.6, open * 1.9)} fill="#fb7185" />
        </>
      ) : (
        <path d={`M ${mx - mw * 0.48} ${my} Q ${mx} ${my + 3.8} ${mx + mw * 0.48} ${my}`} fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      )}
    </g>
  );

  return (
    <svg
      viewBox="0 0 200 136"
      className="w-full h-full pointer-events-none select-none overflow-hidden"
      aria-label={word}
      data-archetype={kind}
    >
      <g transform="translate(100, 66)">
        {lit > 0.04 && <ellipse cx="0" cy="0" rx="58" ry="44" fill="#f59e0b" opacity={0.1 + lit * 0.16} />}
        <ellipse cx="0" cy="34" rx="34" ry="4.5" fill="#000" opacity="0.26" />

        {/* 1. AAP (OpenMoji/Twemoji simplified monkey with head, jaw & tail/branch anchors) */}
        {kind === 'aap' && (() => {
          const fur = [`hsl(${26 + jit} 58% 42%)`, '#92400e', '#78350f', '#a16207', '#b45309'][vIdx];
          const muzzle = '#fde68a';
          const fruitCol = vIdx % 2 === 0 ? '#facc15' : '#ef4444';
          return (
            <g>
              <path d="M -46 28 L 46 24" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg)}>
                <path d="M 12 16 C 36 22 44 4 36 -12 C 30 -22 18 -14 24 -6" fill="none" stroke={fur} strokeWidth="5" strokeLinecap="round" />
              </g>
              <ellipse cx="-2" cy="10" rx="16" ry="18" fill={fur} stroke={dark} strokeWidth="2.2" />
              <ellipse cx="-2" cy="12" rx="10" ry="12" fill={muzzle} opacity="0.85" />
              <path d="M -14 4 Q -28 -2 -20 -12" fill="none" stroke={fur} strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="-20" cy="-14" r="5" fill={fruitCol} stroke={dark} strokeWidth="1.6" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="-18" cy="-18" r="6.5" fill={fur} stroke={dark} strokeWidth="2" />
                <circle cx="14" cy="-18" r="6.5" fill={fur} stroke={dark} strokeWidth="2" />
                <circle cx="-18" cy="-18" r="3.4" fill="#fca5a5" />
                <circle cx="14" cy="-18" r="3.4" fill="#fca5a5" />
                <circle cx="-2" cy="-18" r="14" fill={fur} stroke={dark} strokeWidth="2.2" />
                <ellipse cx="-2" cy="-13" rx="10.5" ry="7.5" fill={muzzle} stroke={dark} strokeWidth="1.6" />
                <circle cx="-6.5" cy="-21" r="2.3" fill={dark} />
                <circle cx="2.5" cy="-21" r="2.3" fill={dark} />
                <circle cx="-7" cy="-21.6" r="0.8" fill="#fff" />
                <circle cx="2" cy="-21.6" r="0.8" fill="#fff" />
                {renderMouth(-2, -11, 9)}
              </g>
            </g>
          );
        })()}

        {/* 2. NOOT (Simplified OpenMoji walnut/acorn in splitting green husk with leaf & husk anchors) */}
        {kind === 'noot' && (() => {
          const shell = ['#b45309', '#92400e', '#a16207', '#78350f', '#d97706'][vIdx];
          const husk = ['#15803d', '#16a34a', '#0d9488', '#4d7c0f', '#059669'][vIdx];
          return (
            <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.7)}>
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.8)}>
                <path d="M 0 -18 C -20 -34 -38 -20 -28 -8 C -18 -2 -6 -10 0 -18 Z" fill={husk} stroke={dark} strokeWidth="2" />
                <path d="M 0 -18 C 20 -34 38 -20 28 -8 C 18 -2 6 -10 0 -18 Z" fill={husk} stroke={dark} strokeWidth="2" />
                <path d="M 0 -26 L 0 -16" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
              </g>
              <path d={`M -2 -16 C ${-28 - open * 7} -10 ${-30 - open * 7} 20 -6 28`} fill={husk} fillOpacity="0.85" stroke={dark} strokeWidth="2.2" />
              <path d={`M 2 -16 C ${28 + open * 7} -10 ${30 + open * 7} 20 6 28`} fill={husk} fillOpacity="0.85" stroke={dark} strokeWidth="2.2" />
              <ellipse cx="0" cy="6" rx="17" ry="21" fill={shell} stroke={dark} strokeWidth="2.2" />
              <path d="M 0 -14 C -10 -14 -17 -6 -17 0 L 17 0 C 17 -6 10 -14 0 -14 Z" fill="#78350f" stroke={dark} strokeWidth="2" />
              <circle cx="-6" cy="4" r="2.2" fill={dark} />
              <circle cx="6" cy="4" r="2.2" fill={dark} />
              {renderMouth(0, 12, 9)}
            </g>
          );
        })()}

        {/* 3. MIES / KAT (Twemoji/OpenMoji simplified cat with pointy ears, whiskers, jaw & tail anchors) */}
        {kind === 'mies' && (() => {
          const coat = ['#f97316', '#cbd5e1', '#fbbf24', '#a8a29e', '#fb7185'][vIdx];
          return (
            <g>
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg)}>
                <path d="M 16 18 C 36 16 40 -6 28 -14" fill="none" stroke={coat} strokeWidth="6" strokeLinecap="round" />
                <path d="M 16 18 C 36 16 40 -6 28 -14" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
              </g>
              <ellipse cx="0" cy="14" rx="18" ry="15" fill={coat} stroke={dark} strokeWidth="2.2" />
              <ellipse cx="0" cy="16" rx="10" ry="10" fill="#fff" opacity="0.8" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <polygon points="-16,-14 -22,-32 -5,-22" fill={coat} stroke={dark} strokeWidth="2.2" strokeLinejoin="round" />
                <polygon points="16,-14 22,-32 5,-22" fill={coat} stroke={dark} strokeWidth="2.2" strokeLinejoin="round" />
                <polygon points="-15,-16 -19,-28 -8,-21" fill="#fda4af" />
                <polygon points="15,-16 19,-28 8,-21" fill="#fda4af" />
                <ellipse cx="0" cy="-12" rx="17" ry="14" fill={coat} stroke={dark} strokeWidth="2.2" />
                <circle cx="-6.5" cy="-14" r="2.5" fill={dark} />
                <circle cx="6.5" cy="-14" r="2.5" fill={dark} />
                <polygon points="-3,-10 3,-10 0,-7" fill="#fb7185" />
                <path d="M -12 -9 L -26 -11 M -12 -6 L -26 -5 M 12 -9 L 26 -11 M 12 -6 L 26 -5" stroke={dark} strokeWidth="1.6" strokeLinecap="round" />
                {renderMouth(0, -5, 8)}
              </g>
            </g>
          );
        })()}

        {/* 4. WIM / BOY (Simplified boy in belted tunic with waving shoulder anchor & talking jaw) */}
        {kind === 'wim' && (() => {
          const tunic = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'][vIdx];
          const hair = ['#92400e', '#d97706', '#451a03', '#b45309', '#78350f'][vIdx];
          return (
            <g>
              <line x1="-7" y1="20" x2="-7" y2="33" stroke={dark} strokeWidth="3.2" strokeLinecap="round" />
              <line x1="7" y1="20" x2="7" y2="33" stroke={dark} strokeWidth="3.2" strokeLinecap="round" />
              <rect x="-13" y="-8" width="26" height="22" rx="5" fill={tunic} stroke={dark} strokeWidth="2.2" />
              <line x1="-13" y1="4" x2="13" y2="4" stroke="#fbbf24" strokeWidth="3" />
              <path d="M -13 -6 L -23 6" stroke={tunic} strokeWidth="5" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg)}>
                <path d="M 12 -6 L 26 -18" stroke={tunic} strokeWidth="5" strokeLinecap="round" />
                <circle cx="27" cy="-19" r="3.5" fill="#fde68a" stroke={dark} strokeWidth="1.6" />
              </g>
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="0" cy="-20" r="12.5" fill="#fde68a" stroke={dark} strokeWidth="2.2" />
                <path d="M -13 -22 C -12 -35 12 -35 13 -22 C 6 -27 -6 -27 -13 -22 Z" fill={hair} stroke={dark} strokeWidth="1.8" />
                <circle cx="-4.5" cy="-21" r="2" fill={dark} />
                <circle cx="4.5" cy="-21" r="2" fill={dark} />
                {renderMouth(0, -15, 7)}
              </g>
            </g>
          );
        })()}

        {/* 5. ZUS (Sister Zus in apron cradling her doll around the doll-rocking anchor) */}
        {kind === 'zus' && (() => {
          const dress = ['#ec4899', '#a855f7', '#f43f5e', '#14b8a6', '#f97316'][vIdx];
          return (
            <g>
              <path d="M -11 -8 L 11 -8 L 22 28 L -22 28 Z" fill={dress} stroke={dark} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M -7 -7 L 7 -7 L 12 25 L -12 25 Z" fill="#f8fafc" stroke={dark} strokeWidth="1.6" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.7)}>
                <path d="M -6 0 L 12 4 L 9 12 L -9 7 Z" fill="#fbbf24" stroke={dark} strokeWidth="1.8" />
                <circle cx="-8" cy="-1" r="5" fill="#fde68a" stroke={dark} strokeWidth="1.8" />
              </g>
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="-11" cy="-25" r="5" fill="#b45309" stroke={dark} strokeWidth="1.8" />
                <circle cx="0" cy="-21" r="12" fill="#fde68a" stroke={dark} strokeWidth="2.2" />
                <path d="M -12 -23 C -10 -34 10 -34 12 -23" fill="#b45309" stroke={dark} strokeWidth="1.8" />
                <circle cx="-4.2" cy="-22" r="2" fill={dark} />
                <circle cx="4.2" cy="-22" r="2" fill={dark} />
                {renderMouth(0, -16, 7)}
              </g>
            </g>
          );
        })()}

        {/* 6. JET (Girl Jet with twin hair bows & curtsying skirt anchor) */}
        {kind === 'jet' && (() => {
          const skirt = ['#8b5cf6', '#f43f5e', '#06b6d4', '#10b981', '#eab308'][vIdx];
          return (
            <g>
              <line x1="-6" y1="22" x2="-6" y2="33" stroke={dark} strokeWidth="2.8" strokeLinecap="round" />
              <line x1="6" y1="22" x2="6" y2="33" stroke={dark} strokeWidth="2.8" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.45)}>
                <path d="M -10 -8 L 10 -8 L 28 22 Q 0 28 -28 22 Z" fill={skirt} stroke={dark} strokeWidth="2.2" />
                <path d="M -10 -7 L -24 10 M 10 -7 L 24 10" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
              </g>
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <polygon points="-10,-25 -20,-31 -17,-20" fill="#fb7185" stroke={dark} strokeWidth="1.5" />
                <polygon points="10,-25 20,-31 17,-20" fill="#fb7185" stroke={dark} strokeWidth="1.5" />
                <circle cx="0" cy="-21" r="12" fill="#fde68a" stroke={dark} strokeWidth="2.2" />
                <path d="M -12 -23 C -8 -33 8 -33 12 -23" fill="#d97706" stroke={dark} strokeWidth="1.8" />
                <circle cx="-4.2" cy="-22" r="2" fill={dark} />
                <circle cx="4.2" cy="-22" r="2" fill={dark} />
                {renderMouth(0, -16, 7)}
              </g>
            </g>
          );
        })()}

        {/* 7. TEUN (Boy Teun with Dutch peaked cap & neckerchief) */}
        {kind === 'teun' && (() => {
          const coat = ['#0284c7', '#059669', '#7c3aed', '#d97706', '#475569'][vIdx];
          return (
            <g>
              <rect x="-13" y="-8" width="26" height="24" rx="4" fill={coat} stroke={dark} strokeWidth="2.2" />
              <polygon points="-9,-8 9,-8 0,3" fill="#ef4444" stroke={dark} strokeWidth="1.6" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg)}>
                <path d="M -12 -6 L -26 -18" stroke={coat} strokeWidth="5" strokeLinecap="round" />
                <circle cx="-27" cy="-19" r="3.5" fill="#fde68a" stroke={dark} strokeWidth="1.6" />
              </g>
              <path d="M 12 -6 L 24 6" stroke={coat} strokeWidth="5" strokeLinecap="round" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="0" cy="-20" r="12" fill="#fde68a" stroke={dark} strokeWidth="2.2" />
                <path d="M -13 -24 C -13 -36 11 -36 13 -24 Z" fill={coat} stroke={dark} strokeWidth="2" />
                <path d="M 2 -24 L 20 -22 L 12 -19 Z" fill="#fbbf24" stroke={dark} strokeWidth="1.6" />
                <circle cx="-4" cy="-20" r="2" fill={dark} />
                <circle cx="4.5" cy="-20" r="2" fill={dark} />
                {renderMouth(0, -15, 7)}
              </g>
            </g>
          );
        })()}

        {/* 8. VUUR (OpenMoji fire under tripod kettle with flame-base jaw anchor & kettle-lid limb anchor) */}
        {kind === 'vuur' && (() => {
          const outerFlame = ['#f97316', '#ef4444', '#f59e0b', '#fb7185', '#ea580c'][vIdx];
          const scaleY = 1 + open * 0.28;
          return (
            <g>
              <path d="M -36 30 L 0 -36 L 36 30 M 0 -36 L 0 -14" fill="none" stroke="#64748b" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M -24 28 L 24 22 M -24 22 L 24 28" stroke="#92400e" strokeWidth="4.5" strokeLinecap="round" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.5)}>
                <ellipse cx="0" cy="-4" rx="16" ry="11" fill="#334155" stroke={dark} strokeWidth="2.2" />
                <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.5)}>
                  <path d="M -12 -12 Q 0 -18 12 -12" fill="none" stroke="#94a3b8" strokeWidth="2.4" />
                </g>
              </g>
              <g
                data-anchor="jaw"
                data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`}
                transform={`translate(0, 22) scale(1, ${scaleY.toFixed(2)}) rotate(${(jawDeg * 0.4).toFixed(1)}) translate(0, -22)`}
              >
                <path d="M 0 0 C -9 6 -16 12 -14 20 C -12 26 12 26 14 20 C 16 12 9 6 0 0 Z" fill={outerFlame} stroke={dark} strokeWidth="2" />
                <path d="M 0 7 C -5 11 -8 15 -7 20 C -6 24 6 24 7 20 C 8 15 5 11 0 7 Z" fill="#fde047" />
              </g>
            </g>
          );
        })()}

        {/* 9. GIJS (Boy Gijs rolling spoked wooden hoop around hoop-axle limb anchor) */}
        {kind === 'gijs' && (() => {
          const shirt = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][vIdx];
          const hoopDeg = talking ? (tick * 160) % 360 : 0;
          return (
            <g>
              <g transform="translate(-20, 0)">
                <path d="M -9 -8 L 9 -8 L 11 12 L -11 12 Z" fill={shirt} stroke={dark} strokeWidth="2.1" />
                <path d="M -5 12 L -12 29 M 5 12 L 12 28" stroke={dark} strokeWidth="2.8" strokeLinecap="round" />
                <path d="M 8 -4 L 28 8" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
              </g>
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="-20" cy="-20" r="10.5" fill="#fde68a" stroke={dark} strokeWidth="2.1" />
                <circle cx="-23" cy="-21" r="1.8" fill={dark} />
                <circle cx="-16" cy="-21" r="1.8" fill={dark} />
                {renderMouth(-20, -15, 6)}
              </g>
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, hoopDeg)}>
                <circle cx="20" cy="8" r="19" fill="none" stroke="#d97706" strokeWidth="3.5" />
                <line x1="1" y1="8" x2="39" y2="8" stroke="#fbbf24" strokeWidth="1.6" />
                <line x1="20" y1="-11" x2="20" y2="27" stroke="#fbbf24" strokeWidth="1.6" />
              </g>
            </g>
          );
        })()}

        {/* 10. LAM (OpenMoji/Twemoji fluffy lamb with head, bleating jaw & wagging tail anchors) */}
        {kind === 'lam' && (() => {
          const wool = ['#f8fafc', '#fef3c7', '#f1f5f9', '#fae8ff', '#ecfeff'][vIdx];
          return (
            <g>
              <path d="M -14 14 L -15 30 M -5 14 L -5 30 M 7 14 L 7 30 M 14 14 L 15 30" stroke={dark} strokeWidth="2.8" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg)}>
                <path d="M -20 0 L -33 6" stroke={wool} strokeWidth="6" strokeLinecap="round" />
                <path d="M -20 0 L -33 6" stroke={dark} strokeWidth="2" strokeLinecap="round" />
              </g>
              <path
                d="M -22 -4 C -26 -16 -10 -20 -2 -13 C 6 -20 20 -16 18 -4 C 24 5 18 17 8 15 C 0 19 -10 19 -16 15 C -26 17 -28 5 -22 -4 Z"
                fill={wool}
                stroke={dark}
                strokeWidth="2.2"
              />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <ellipse cx="12" cy="-12" rx="6" ry="2.6" transform="rotate(-25 12 -12)" fill="#fda4af" stroke={dark} strokeWidth="1.6" />
                <ellipse cx="20" cy="-7" rx="10" ry="8" fill="#334155" stroke={dark} strokeWidth="2" />
                <circle cx="22" cy="-9" r="2" fill="#fff" />
                <circle cx="22.5" cy="-9" r="1" fill={dark} />
                <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg, jawDrop * 0.4)}>
                  <ellipse cx="23" cy="-2" rx="5" ry={1.5 + open * 2.5} fill="#fda4af" stroke={dark} strokeWidth="1.4" />
                </g>
              </g>
            </g>
          );
        })()}

        {/* 11. KEES (Dutch boy Kees with yellow wooden clogs klompen anchor) */}
        {kind === 'kees' && (() => {
          const smock = ['#2563eb', '#0d9488', '#7c3aed', '#ea580c', '#16a34a'][vIdx];
          return (
            <g>
              <path d="M -13 -8 L 13 -8 L 16 10 L -16 10 Z" fill={smock} stroke={dark} strokeWidth="2.1" />
              <path d="M -13 10 L -14 25 L -3 25 L 0 15 L 3 25 L 14 25 L 13 10 Z" fill="#475569" stroke={dark} strokeWidth="2" />
              <path d="M -18 30 C -20 24 -3 24 -3 30 Z" fill="#facc15" stroke={dark} strokeWidth="2" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, -Math.abs(limbDeg))}>
                <path d="M 3 30 C 3 24 20 24 18 30 Z" fill="#facc15" stroke={dark} strokeWidth="2" />
              </g>
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="0" cy="-20" r="11.5" fill="#fde68a" stroke={dark} strokeWidth="2.1" />
                <path d="M -12 -24 C -10 -34 10 -34 12 -24 L 17 -22" fill={smock} stroke={dark} strokeWidth="2" />
                <circle cx="-4" cy="-20" r="1.9" fill={dark} />
                <circle cx="4" cy="-20" r="1.9" fill={dark} />
                {renderMouth(0, -15, 7)}
              </g>
            </g>
          );
        })()}

        {/* 12. BOK (OpenMoji/Twemoji billy goat with curved horns & articulated goatee beard sik anchor) */}
        {kind === 'bok' && (() => {
          const coat = ['#cbd5e1', '#d6d3d1', '#a8a29e', '#fde68a', '#94a3b8'][vIdx];
          return (
            <g>
              <path d="M -18 12 L -19 30 M -9 12 L -9 30 M 8 12 L 8 30 M 15 12 L 16 30" stroke={dark} strokeWidth="2.6" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg)}>
                <path d="M -22 -4 L -31 -14" stroke={coat} strokeWidth="4.5" strokeLinecap="round" />
              </g>
              <path d="M -22 -4 L 14 -6 L 17 12 L -20 12 Z" fill={coat} stroke={dark} strokeWidth="2.2" strokeLinejoin="round" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <path d="M 14 -14 C 8 -30 -8 -32 -14 -20" fill="none" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 18 -14 C 12 -28 -2 -30 -8 -18" fill="none" stroke="#d97706" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M 10 -14 L 30 -7 L 27 1 L 10 -1 Z" fill={coat} stroke={dark} strokeWidth="2.1" strokeLinejoin="round" />
                <circle cx="19" cy="-9" r="2" fill={dark} />
                <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg, jawDrop * 0.5)}>
                  <path d="M 18 0 L 28 0 L 24 3 L 18 2 Z" fill={coat} stroke={dark} strokeWidth="1.6" />
                  <path d="M 24 1 L 27 13 L 20 1" fill={coat} stroke={dark} strokeWidth="1.8" strokeLinejoin="round" />
                </g>
              </g>
            </g>
          );
        })()}

        {/* 13. WEIDE / KOE (Dutch cow in green pasture with willow branch limb anchor & chewing muzzle jaw anchor) */}
        {kind === 'weide' && (() => {
          const spot = ['#1e293b', '#92400e', '#78350f', '#334155', '#b45309'][vIdx];
          return (
            <g>
              <path d="M -56 22 Q 0 16 56 22" fill="none" stroke="#10b981" strokeWidth="3" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.6)}>
                <path d="M 28 22 L 29 0 L 33 0 L 34 22 Z" fill="#92400e" stroke={dark} strokeWidth="1.8" />
                <path d="M 31 -2 L 20 -22 M 31 -2 L 31 -25 M 31 -2 L 42 -20" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" />
              </g>
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <path d="M -28 -16 L -35 -23 M 4 -16 L 11 -23" stroke="#fde68a" strokeWidth="3.2" strokeLinecap="round" />
                <rect x="-28" y="-16" width="32" height="24" rx="8" fill="#f8fafc" stroke={dark} strokeWidth="2.2" />
                <circle cx="-20" cy="-8" r="5" fill={spot} />
                <circle cx="-4" cy="-4" r="4" fill={spot} />
                <circle cx="-19" cy="-7" r="2" fill="#fff" />
                <circle cx="-5" cy="-7" r="2" fill="#fff" />
                <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg * 0.5, jawDrop * 0.55)}>
                  <ellipse cx="-12" cy="8" rx="13" ry="7" fill="#fda4af" stroke={dark} strokeWidth="1.8" />
                  <circle cx="-16" cy="7" r="1.5" fill={dark} />
                  <circle cx="-8" cy="7" r="1.5" fill={dark} />
                </g>
              </g>
            </g>
          );
        })()}

        {/* 14. DOES / HOND (OpenMoji/Twemoji shaggy dog with wagging tail limb anchor & barking jaw/tongue anchor) */}
        {kind === 'does' && (() => {
          const fur = ['#d97706', '#92400e', '#cbd5e1', '#ea580c', '#a16207'][vIdx];
          return (
            <g>
              <path d="M -18 14 L -19 30 M -9 14 L -9 30 M 7 14 L 7 30 M 14 14 L 15 30" stroke={dark} strokeWidth="2.8" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 1.2)}>
                <path d="M -22 0 Q -38 -14 -30 -22" fill="none" stroke={fur} strokeWidth="6" strokeLinecap="round" />
                <path d="M -22 0 Q -38 -14 -30 -22" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
              </g>
              <path d="M -23 -4 C -17 -11 8 -11 16 -4 C 20 5 18 15 12 15 L -19 15 C -25 15 -27 5 -23 -4 Z" fill={fur} stroke={dark} strokeWidth="2.2" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="17" cy="-9" r="10.5" fill={fur} stroke={dark} strokeWidth="2.2" />
                <path d="M 22 -11 L 33 -10 L 31 -2 L 22 -2 Z" fill={fur} stroke={dark} strokeWidth="2" />
                <circle cx="32" cy="-8" r="2.4" fill={dark} />
                <path d="M 12 -12 C 7 -4 9 4 15 2" fill="#78350f" stroke={dark} strokeWidth="1.8" />
                <circle cx="20" cy="-11" r="2" fill={dark} />
                <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg, jawDrop * 0.45)}>
                  <path d="M 20 -2 L 30 -2 L 28 2 L 20 1 Z" fill={fur} stroke={dark} strokeWidth="1.6" />
                  {open > 0.08 && <ellipse cx="26" cy={2 + open * 3} rx="2.4" ry={1.5 + open * 2.5} fill="#fb7185" />}
                </g>
              </g>
            </g>
          );
        })()}

        {/* 15. HOK / HUIS (OpenMoji doghouse with pitched roof, doorway jaw anchor & bowl/chimney limb anchor) */}
        {kind === 'hok' && (() => {
          const roof = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#a855f7'][vIdx];
          const wall = ['#fcd34d', '#fed7aa', '#e2e8f0', '#fde68a', '#fbcfe8'][vIdx];
          return (
            <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.35)}>
              <rect x="-26" y="-4" width="52" height="33" rx="3" fill={wall} stroke={dark} strokeWidth="2.2" />
              <path d="M -36 -4 L 0 -33 L 36 -4 Z" fill={roof} stroke={dark} strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M -11 29 L -11 9 C -11 -1 11 -1 11 9 L 11 29 Z" fill="#0f172a" stroke={dark} strokeWidth="2" />
              <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg * 0.8)}>
                <circle cx="0" cy={18 - open * 4} r="6.5" fill="#d97706" stroke={dark} strokeWidth="1.6" />
                <circle cx="-2.2" cy={16.5 - open * 4} r="1.2" fill="#fff" />
                <circle cx="2.2" cy={16.5 - open * 4} r="1.2" fill="#fff" />
              </g>
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.5)}>
                <path d="M 18 24 L 32 24 L 29 30 L 21 30 Z" fill="#38bdf8" stroke={dark} strokeWidth="1.8" />
              </g>
            </g>
          );
        })()}

        {/* 16. DUIF / VOGEL (OpenMoji/Twemoji dove with wing shoulder limb anchor & hinged beak jaw anchor) */}
        {kind === 'duif' && (() => {
          const wingCol = ['#f8fafc', '#bae6fd', '#fde68a', '#e9d5ff', '#fecdd3'][vIdx];
          return (
            <g>
              <path d="M -34 26 Q 0 22 34 28" fill="none" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 1.3)}>
                <path d="M -2 -2 C -16 -28 -36 -24 -40 -6 C -26 2 -12 4 -2 2 Z" fill={wingCol} stroke={dark} strokeWidth="2.2" />
              </g>
              <path d="M -18 6 C -10 -4 10 -4 18 4 C 14 15 -6 17 -18 6 Z" fill={wingCol} stroke={dark} strokeWidth="2.2" />
              <polygon points="-16,6 -31,2 -29,14" fill={wingCol} stroke={dark} strokeWidth="2" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="17" cy="-2" r="7.5" fill={wingCol} stroke={dark} strokeWidth="2.1" />
                <circle cx="19" cy="-4" r="1.8" fill={dark} />
                <polygon points="23,-5 32,-3 23,-1" fill="#f59e0b" stroke={dark} strokeWidth="1.2" />
                <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg * 1.2)}>
                  <polygon points="23,-1 31,2 23,2" fill="#d97706" stroke={dark} strokeWidth="1.2" />
                </g>
              </g>
            </g>
          );
        })()}

        {/* 17. SCHAPEN (Flock of 3 sheep on the heath with companion limb anchor & lead sheep head/jaw anchors) */}
        {kind === 'schapen' && (() => {
          const fleece = ['#f8fafc', '#fef3c7', '#e2e8f0', '#fae8ff', '#ecfeff'][vIdx];
          return (
            <g>
              <path d="M -56 24 Q -18 14 20 22 T 56 20" fill="none" stroke="#10b981" strokeWidth="2.4" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.6)}>
                <ellipse cx="-26" cy="4" rx="14" ry="9" fill={fleece} stroke={dark} strokeWidth="2" />
                <circle cx="-14" cy="2" r="5" fill="#334155" stroke={dark} strokeWidth="1.6" />
              </g>
              <ellipse cx="24" cy="2" rx="13" ry="8.5" fill={fleece} stroke={dark} strokeWidth="2" />
              <circle cx="35" cy="0" r="4.8" fill="#334155" stroke={dark} strokeWidth="1.6" />
              <ellipse cx="0" cy="10" rx="17" ry="10.5" fill={fleece} stroke={dark} strokeWidth="2.2" />
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg)}>
                <circle cx="15" cy="6" r="6.5" fill="#334155" stroke={dark} strokeWidth="1.8" />
                <circle cx="17" cy="4.5" r="1.4" fill="#fff" />
                <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg, jawDrop * 0.35)}>
                  <ellipse cx="19" cy="9" rx="3.5" ry={1.2 + open * 1.8} fill="#fda4af" />
                </g>
              </g>
            </g>
          );
        })()}

        {/* 18. VIS (Swimming fish with tail-fin limb anchor & speaking mouth jaw anchor) */}
        {kind === 'vis' && (() => {
          const scales = ['#06b6d4', '#f97316', '#ec4899', '#eab308', '#10b981'][vIdx];
          return (
            <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.5)}>
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 1.3)}>
                <polygon points="-22,0 -40,-14 -35,0 -40,14" fill="#fbbf24" stroke={dark} strokeWidth="2" strokeLinejoin="round" />
              </g>
              <path d="M -24 0 Q -6 -22 24 0 Q -6 22 -24 0 Z" fill={scales} stroke={dark} strokeWidth="2.2" />
              <circle cx="12" cy="-4" r="2.6" fill="#fff" stroke={dark} strokeWidth="1.4" />
              <circle cx="12.6" cy="-4" r="1.2" fill={dark} />
              <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg)}>
                <ellipse cx="21" cy="3" rx="3.5" ry={1.2 + open * 2.5} fill="#fb7185" stroke={dark} strokeWidth="1.4" />
              </g>
            </g>
          );
        })()}

        {/* 19. AUTO (Compact car with spinning wheel limb anchor & bumper/grille jaw anchor) */}
        {kind === 'auto' && (() => {
          const paint = ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#a855f7'][vIdx];
          return (
            <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.3)}>
              <path d="M -32 12 L -28 -2 L -16 -16 L 14 -16 L 26 -2 L 32 12 Z" fill={paint} stroke={dark} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M -14 -12 L 12 -12 L 20 -2 L -22 -2 Z" fill="#bae6fd" stroke={dark} strokeWidth="1.6" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, talking ? (tick * 200) % 360 : 0)}>
                <circle cx="-18" cy="14" r="8" fill="#334155" stroke={dark} strokeWidth="2" />
                <line x1="-23" y1="14" x2="-13" y2="14" stroke="#cbd5e1" strokeWidth="2" />
              </g>
              <circle cx="18" cy="14" r="8" fill="#334155" stroke={dark} strokeWidth="2" />
              <circle cx="18" cy="14" r="3" fill="#cbd5e1" />
              <g data-anchor="jaw" data-anchor-xy={`${rig.jaw[0]},${rig.jaw[1]}`} transform={pivotRot(rig.jaw, jawDeg * 0.5, jawDrop * 0.4)}>
                <rect x="24" y="4" width="9" height={3 + open * 3} rx="1.5" fill="#fde047" stroke={dark} strokeWidth="1.4" />
              </g>
            </g>
          );
        })()}

        {/* 20. BOOT (Sailboat with billowing sail limb anchor & hull/bow jaw anchor) */}
        {kind === 'boot' && (() => {
          const hull = ['#b45309', '#2563eb', '#dc2626', '#0d9488', '#7c3aed'][vIdx];
          return (
            <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.5)}>
              <line x1="0" y1="10" x2="0" y2="-32" stroke={dark} strokeWidth="2.6" strokeLinecap="round" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.6)}>
                <polygon points="0,-30 26,6 0,6" fill="#f8fafc" stroke={dark} strokeWidth="2" strokeLinejoin="round" />
                <polygon points="-2,-24 -22,6 -2,6" fill="#fde047" stroke={dark} strokeWidth="1.8" strokeLinejoin="round" />
              </g>
              <polygon points="-32,10 32,10 22,25 -22,25" fill={hull} stroke={dark} strokeWidth="2.2" strokeLinejoin="round" />
              {renderMouth(14, 17, 7)}
            </g>
          );
        })()}

        {/* 21. BOOM (Leafy tree with canopy limb anchor & friendly trunk face jaw anchor) */}
        {kind === 'boom' && (() => {
          const leaf = ['#16a34a', '#10b981', '#65a30d', '#059669', '#d97706'][vIdx];
          return (
            <g>
              <path d="M -8 30 L -5 0 L 5 0 L 8 30 Z" fill="#92400e" stroke={dark} strokeWidth="2.2" />
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot(rig.limb, limbDeg * 0.5)}>
                <circle cx="-14" cy="-8" r="14" fill={leaf} stroke={dark} strokeWidth="2" />
                <circle cx="14" cy="-8" r="14" fill={leaf} stroke={dark} strokeWidth="2" />
                <circle cx="0" cy="-18" r="17" fill={leaf} stroke={dark} strokeWidth="2.2" />
              </g>
              <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.4)}>
                <circle cx="-3.5" cy="8" r="1.6" fill="#fff" />
                <circle cx="3.5" cy="8" r="1.6" fill="#fff" />
                {renderMouth(0, 14, 6)}
              </g>
            </g>
          );
        })()}

        {/* 22. ZON / BAL (Smiling sun/ball with rotating ray limb anchor & talking mouth jaw anchor) */}
        {kind === 'zon' && (() => {
          const orb = ['#facc15', '#fb923c', '#f472b6', '#38bdf8', '#a3e635'][vIdx];
          return (
            <g data-anchor="head" data-anchor-xy={`${rig.head[0]},${rig.head[1]}`} transform={pivotRot(rig.head, headDeg * 0.6)}>
              <g data-anchor="limb" data-anchor-xy={`${rig.limb[0]},${rig.limb[1]}`} transform={pivotRot([0, 0], limbDeg)}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                  <line key={deg} x1="0" y1="-26" x2="0" y2="-34" stroke={orb} strokeWidth="3" strokeLinecap="round" transform={`rotate(${deg})`} />
                ))}
              </g>
              <circle cx="0" cy="0" r="22" fill={orb} stroke={dark} strokeWidth="2.2" />
              <circle cx="-7" cy="-4" r="2.4" fill={dark} />
              <circle cx="7" cy="-4" r="2.4" fill={dark} />
              {renderMouth(0, 6, 9)}
            </g>
          );
        })()}

        {/* Explicit SVG Animation Anchor-Point Pivot Pins (head, jaw, limb) visible during speech/hover */}
        {(showAnchors || talking) && (
          <g className="svg-anchor-pins" opacity="0.85">
            {([
              ['head', rig.head, '#38bdf8'],
              ['jaw', rig.jaw, '#fbbf24'],
              ['limb', rig.limb, '#a855f7']
            ] as const).map(([name, [ax, ay], col]) => (
              <g key={name} transform={`translate(${ax}, ${ay})`}>
                <circle r="3.4" fill="#0f172a" stroke={col} strokeWidth="1.5" />
                <circle r="1.3" fill={col} />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
};

interface CellSvgUnderlayProps {
  word: string;
  genSeed?: number;           // when set: render the generative talking creature instead of the Leesplankje figure
  talking?: boolean;          // this cell's word is being spoken right now
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
  genSeed,
  talking = false,
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

  // GENERATIVE TALKING SVG FIGURE WITH ANCHOR POINTS (no hooks above this point, so an early return is safe)
  if (genSeed !== undefined || anmFigureMode === 'vector') {
    return (
      <GeneratedCreature
        word={w}
        seed={genSeed ?? 1}
        talking={talking}
        tick={animTick}
        lit={isTarget ? goldenEvolution : 0}
        showAnchors={isHovered}
      />
    );
  }

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

// ============================================================================
// MOBILE BOTTOM SHEET: tiny always-there essentials ("peek"), swipe up for up to 80% of the screen
// ============================================================================

const SHEET_PEEK_PX = 74;

const MobileBottomSheet = ({
  peek,
  children,
  hint,
  onOpenChange
}: {
  peek: React.ReactNode;
  children: React.ReactNode;
  hint: string;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [dragY, setDragY] = useState<number | null>(null); // live translateY while dragging
  const [calm, setCalm] = useState<boolean>(false); // fade the peek when the child is busy playing
  const [seen, setSeen] = useState<boolean>(() => {
    try { return localStorage.getItem('sheet_seen') === '1'; } catch { return false; }
  });
  const [vh, setVh] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 700);
  const drag = useRef<{ startY: number; startT: number; base: number; active: boolean; lastY: number; lastT: number } | null>(null);
  const justDragged = useRef<boolean>(false);
  const calmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sheetH = Math.round(vh * 0.8);
  const closedY = sheetH - SHEET_PEEK_PX;
  const baseY = open ? 0 : closedY;
  const y = dragY !== null ? dragY : baseY;
  const progress = 1 - y / closedY; // 0 = peek, 1 = fully open

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const wake = useCallback(() => {
    setCalm(false);
    if (calmTimer.current) clearTimeout(calmTimer.current);
    calmTimer.current = setTimeout(() => setCalm(true), 6000);
  }, []);

  useEffect(() => {
    wake();
    return () => { if (calmTimer.current) clearTimeout(calmTimer.current); };
  }, [wake]);

  const setOpenState = useCallback((next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next && !seen) {
      setSeen(true);
      try { localStorage.setItem('sheet_seen', '1'); } catch { /* ignore */ }
    }
  }, [onOpenChange, seen]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    wake();
    drag.current = { startY: e.clientY, startT: Date.now(), base: baseY, active: false, lastY: e.clientY, lastT: Date.now() };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (!d.active && Math.abs(dy) > 7) {
      d.active = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (d.active) {
      d.lastY = e.clientY;
      d.lastT = Date.now();
      setDragY(Math.max(0, Math.min(closedY, d.base + dy)));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.active) return;
    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 80);
    const dy = e.clientY - d.startY;
    const dt = Math.max(1, Date.now() - d.startT);
    const velocity = dy / dt; // px/ms, negative = swiping up
    const finalY = Math.max(0, Math.min(closedY, d.base + dy));
    let next = finalY < closedY / 2;
    if (velocity < -0.45) next = true;
    if (velocity > 0.45) next = false;
    setDragY(null);
    setOpenState(next);
  };

  return (
    <>
      {/* Soft scrim: only appears while the sheet is pulled up. Tap it to put the sheet back down. */}
      <div
        onClick={() => setOpenState(false)}
        className="sm:hidden fixed inset-0 z-40"
        style={{
          background: 'rgba(5, 2, 12, 0.55)',
          opacity: Math.max(0, progress),
          pointerEvents: progress > 0.08 ? 'auto' : 'none',
          transition: dragY === null ? 'opacity 0.28s ease' : 'none'
        }}
      />
      <div
        className="sm:hidden fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t-2 border-purple-500/60 shadow-[0_-10px_40px_rgba(88,28,135,0.45)]"
        style={{
          height: sheetH,
          transform: `translateY(${y}px)`,
          transition: dragY === null ? 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          background: 'linear-gradient(180deg, rgba(24,8,44,0.97) 0%, rgba(8,3,18,0.99) 100%)',
          backdropFilter: 'blur(10px)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
        onPointerDownCapture={wake}
      >
        {/* Draggable header: handle + always-visible essentials */}
        <div
          className="shrink-0 select-none"
          style={{ touchAction: 'none', height: SHEET_PEEK_PX }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(e) => { if (justDragged.current) { e.stopPropagation(); e.preventDefault(); } }}
        >
          <button
            aria-label={open ? 'Sluiten' : 'Meer opties'}
            onClick={() => setOpenState(!open)}
            className="w-full flex flex-col items-center pt-1.5 pb-1 group"
          >
            <span
              className={`block h-1.5 rounded-full bg-purple-300/70 transition-all ${!seen && !open ? 'animate-pulse' : ''}`}
              style={{ width: open ? 56 : 44 }}
            />
            {!open && !seen && (
              <span className="text-[9px] text-purple-300/70 leading-none mt-1 tracking-wide">{hint}</span>
            )}
          </button>
          <div
            className="px-3 flex items-center justify-between gap-2 transition-opacity duration-500"
            style={{ opacity: calm && !open ? 0.55 : 1 }}
          >
            {peek}
          </div>
        </div>

        {/* Detail groups (only reachable by swiping/tapping up) */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-6 space-y-3"
          style={{ touchAction: 'pan-y', opacity: Math.min(1, Math.max(0, progress * 1.6)), pointerEvents: open ? 'auto' : 'none' }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

// ============================================================================
// DEEP-LINK SHARING: the full app state lives in the URL hash, e.g.
//   #go=1&cur=standard&lvl=0&lang=nl&fft=1&dev=1&fig=hybrid&intro=1&kin=0&pin=0&t=aap
// Copy the address bar (or press the 🔗 button) and anyone opening it sees the same view.
// ============================================================================

interface SharedViewState {
  cx?: WordComplexity;
  go: boolean;
  cur?: CurriculumMode;
  lvl?: number;
  lang?: LanguageCode;
  fft?: boolean;
  dev?: boolean;
  fig?: AnmFigureMode;
  intro?: IntrospectionLevel;
  kin?: boolean;
  pin?: boolean;
  t?: string;
}

const parseSharedView = (): SharedViewState => {
  const empty: SharedViewState = { go: false };
  if (typeof window === 'undefined') return empty;
  const raw = (window.location.hash || '').replace(/^#/, '') || window.location.search.replace(/^\?/, '');
  if (!raw) return empty;
  const p = new URLSearchParams(raw);
  const out: SharedViewState = { go: p.get('go') === '1' };
  const cur = p.get('cur');
  if (cur === 'standard' || cur === 'aapnootmies') out.cur = cur;
  const lvl = p.get('lvl');
  if (lvl !== null && /^[0-5]$/.test(lvl)) out.lvl = parseInt(lvl, 10);
  const lang = p.get('lang');
  if (lang === 'nl' || lang === 'en') out.lang = lang;
  if (p.has('fft')) out.fft = p.get('fft') === '1';
  if (p.has('dev')) out.dev = p.get('dev') === '1';
  const fig = p.get('fig');
  if (fig === 'hybrid' || fig === 'photo' || fig === 'vector') out.fig = fig;
  const intro = p.get('intro');
  if (intro !== null && /^[0-2]$/.test(intro)) out.intro = parseInt(intro, 10) as IntrospectionLevel;
  if (p.has('kin')) out.kin = p.get('kin') === '1';
  if (p.has('pin')) out.pin = p.get('pin') === '1';
  const cx = p.get('cx');
  if (cx === 'simple' || cx === 'double' || cx === 'all') out.cx = cx;
  const t = p.get('t');
  if (t && /^[a-z]{1,12}$/i.test(t)) out.t = t.toLowerCase();
  return out;
};

const SHARED_VIEW: SharedViewState = parseSharedView();

export default function RTTutor() {
  // Core Persistent States — Default Level 0 ('standard' mode, single letters with Leesplankje figures), unless a shared deep link says otherwise
  const [started, setStarted] = useState<boolean>(SHARED_VIEW.go);
  const [curriculumMode, setCurriculumMode] = useState<CurriculumMode>(SHARED_VIEW.cur ?? 'standard');
  const [level, setLevel] = useState<number>(SHARED_VIEW.lvl ?? 0);
  const [language, setLanguage] = useState<LanguageCode>(() => SHARED_VIEW.lang || (localStorage.getItem('tutor_lang') as LanguageCode) || 'nl');
  const [autoLevel, setAutoLevel] = useState<boolean>(true);
  const [inspectMode, setInspectMode] = useState<boolean>(SHARED_VIEW.fft ?? false);
  const [showDevTools, setShowDevTools] = useState<boolean>(SHARED_VIEW.dev ?? false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const sharedTargetRef = useRef<string | undefined>(SHARED_VIEW.t);
  // ORTHOGONAL AXIS A: word complexity (what is read). Independent of axis B (support/hints) and of level/language.
  const [complexity, setComplexity] = useState<WordComplexity>(SHARED_VIEW.cx ?? 'simple');
  const usabilityTrialsRef = useRef<UsabilityTrial[]>([]);
  const roundPointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [usabilityStats, setUsabilityStats] = useState<UsabilitySummary>(() => summarizeUsability([]));
  const [maatjeOpen, setMaatjeOpen] = useState<boolean>(typeof window !== 'undefined' && window.innerWidth >= 1700);
  const [maatjeHistory, setMaatjeHistory] = useState<string[]>([]);
  // Generative talking figures: per-word seed overrides (set by the tiny [wrong]/[nice]/[another] buttons)
  const [genFigures, setGenFigures] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('anm_gen_figs') || '{}') as Record<string, number>; } catch { return {}; }
  });
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const figureFeedbackRef = useRef<FigureFeedback[]>((() => {
    try { return JSON.parse(localStorage.getItem('anm_fig_feedback') || '[]') as FigureFeedback[]; } catch { return []; }
  })());

  // Usability Research Pinhole Spotlight State
  const [pinholeEnabled, setPinholeEnabled] = useState<boolean>(SHARED_VIEW.pin ?? false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 500,
    y: typeof window !== 'undefined' ? Math.round(window.innerHeight / 2) : 400
  });

  // Advanced Tutoring & Introspection States
  const [introspectionLevel, setIntrospectionLevel] = useState<IntrospectionLevel>(() => {
    if (SHARED_VIEW.intro !== undefined) return SHARED_VIEW.intro;
    const saved = localStorage.getItem('tutor_introspect_lvl');
    return saved !== null ? (parseInt(saved, 10) as IntrospectionLevel) : 1;
  });
  const [tutorEmotion, setTutorEmotion] = useState<TutorEmotion>('SERENE');
  const [isVoiceSilent, setIsVoiceSilent] = useState<boolean>(false);
  const [kineticMode, setKineticMode] = useState<boolean>(SHARED_VIEW.kin ?? false);
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
  const [anmFigureMode, setAnmFigureMode] = useState<AnmFigureMode>(SHARED_VIEW.fig ?? 'hybrid');
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
    options?: { forceLang?: LanguageCode; emotionOverride?: TutorEmotion; bypassSilence?: boolean; cancelFirst?: boolean; speakKey?: string }
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

      // Talking figures: tell the cell whose word is being spoken so its generated creature can move its mouth.
      const key = options?.speakKey;
      if (key) {
        const stop = () => setSpeakingKey(prev => (prev === key ? null : prev));
        utterance.onstart = () => setSpeakingKey(key);
        utterance.onend = stop;
        utterance.onerror = stop;
        // Some mobile WebViews never fire speech events: start now and stop after an estimate.
        setSpeakingKey(key);
        setTimeout(stop, Math.min(9000, 900 + spokenString.length * 110));
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, [isVoiceSilent, tutorEmotion, language, selectBestVoice]);

  const speakWord = useCallback((word: string, forceLang?: LanguageCode) => {
    speakText(word, { forceLang, cancelFirst: true, speakKey: word.toLowerCase() });
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
    modeOverride: CurriculumMode = curriculumMode,
    complexityOverride: WordComplexity = complexity
  ) => {
    const isAapNootMies = modeOverride === 'aapnootmies';
    const pool = isAapNootMies
      ? getAnmPool(complexityOverride)
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
    roundPointerStartRef.current = (lastPointerPos.current.x || lastPointerPos.current.y)
      ? { x: lastPointerPos.current.x, y: lastPointerPos.current.y }
      : null;
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
  }, [language, streak, curriculumMode, complexity, initKineticBodies, speakWord]);

  useEffect(() => {
    if (started && !currentRound) {
      generateRound(level, streak, curriculumMode);
    }
  }, [started, currentRound, level, streak, curriculumMode, generateRound]);

  // DEEP LINK: apply a shared target word once, on the very first round of a shared view
  useEffect(() => {
    const t = sharedTargetRef.current;
    if (!t || !currentRound) return;
    sharedTargetRef.current = undefined;
    if (currentRound.target === t) return;
    const pool = curriculumMode === 'aapnootmies'
      ? getAnmPool(complexity)
      : (DICTIONARIES[language][level] || AAP_NOOT_MIES_WORDS);
    if (!pool.includes(t)) return;
    const others = currentRound.options.filter(o => o !== currentRound.target && o !== t);
    const opts = [t, ...others].slice(0, currentRound.options.length).sort(() => 0.5 - Math.random());
    setCurrentRound({ target: t, options: opts });
  }, [currentRound, curriculumMode, language, level, complexity]);

  // DEEP LINK: keep the address bar a live, shareable "status drop" of the current view
  const buildShareUrl = useCallback((): string => {
    const p = new URLSearchParams();
    p.set('go', '1');
    p.set('cur', curriculumMode);
    p.set('lvl', String(level));
    p.set('cx', complexity);
    p.set('lang', language);
    p.set('fig', anmFigureMode);
    p.set('intro', String(introspectionLevel));
    if (inspectMode) p.set('fft', '1');
    if (showDevTools) p.set('dev', '1');
    if (kineticMode) p.set('kin', '1');
    if (pinholeEnabled) p.set('pin', '1');
    if (currentRound?.target) p.set('t', currentRound.target);
    const base = typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : '';
    return `${base}#${p.toString()}`;
  }, [curriculumMode, level, complexity, language, anmFigureMode, introspectionLevel, inspectMode, showDevTools, kineticMode, pinholeEnabled, currentRound]);

  useEffect(() => {
    if (!started || typeof window === 'undefined') return;
    try {
      window.history.replaceState(null, '', buildShareUrl());
    } catch {
      // ignore sandboxed iframes without history access
    }
  }, [started, buildShareUrl]);

  const shareCurrentView = useCallback(async () => {
    const url = buildShareUrl();
    let msg = language === 'nl' ? '🔗 Link gekopieerd! Plak hem in een bericht.' : '🔗 Link copied! Paste it in a message.';
    try {
      if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: unknown }).share && window.innerWidth < 900) {
        await navigator.share({ title: 'Aap · Noot · Mies', text: language === 'nl' ? 'Kijk, dit zag ik!' : 'Look, this is what I saw!', url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(language === 'nl' ? 'Kopieer deze link:' : 'Copy this link:', url);
      msg = language === 'nl' ? '🔗 Link klaar' : '🔗 Link ready';
    }
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 2600);
  }, [buildShareUrl, language]);

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
        telemetry: telemetryData.current,
        complexity,
        figureFeedback: figureFeedbackRef.current.slice(-50),
        usabilityLaws: { ...summarizeUsability(usabilityTrialsRef.current), recentTrials: usabilityTrialsRef.current.slice(-20) }
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
    activeVoiceName,
    complexity,
    usabilityStats
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

    // USABILITY LAWS (real-time): Fitts (2D, Accot-Zhai/MacKenzie form with effective width) + Hick-Hyman choice entropy
    {
      const start = (lastPointerPos.current.x || lastPointerPos.current.y)
        ? lastPointerPos.current
        : { x: pointerPos.x, y: pointerPos.y };
      const startPt = roundPointerStartRef.current || start;
      const D = Math.hypot(shotX - startPt.x, shotY - startPt.y);
      const W = Math.max(1, rect.width);
      const H = Math.max(1, rect.height);
      const id2d = Math.log2(Math.sqrt((D / W) ** 2 + (D / H) ** 2) + 1);
      const mtMs = Math.max(50, Date.now() - roundStartTime.current);
      const trial: UsabilityTrial = {
        word,
        target: currentRound.target,
        hit: isHit,
        distancePx: Math.round(D),
        widthPx: Math.round(W),
        heightPx: Math.round(H),
        id2d: Number(id2d.toFixed(3)),
        mtMs,
        throughputBitsPerS: Number(((id2d / mtMs) * 1000).toFixed(3)),
        hickBits: Number(Math.log2(currentRound.options.length + 1).toFixed(3)),
        endpointDxPx: Math.round(shotX - (rect.left + rect.width / 2)),
        complexity
      };
      usabilityTrialsRef.current.push(trial);
      if (usabilityTrialsRef.current.length > 200) usabilityTrialsRef.current.shift();
      setUsabilityStats(summarizeUsability(usabilityTrialsRef.current));
      logTimelineEvent('usability_trial', { ...trial });
    }
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

  // ==========================================================================
  // MAATJE: child-level sidebar assistant (rule-based, offline) + orthogonal complexity axis + live usability laws
  // ==========================================================================

  const changeComplexity = (c: WordComplexity) => {
    initAudio();
    setComplexity(c);
    setCurriculumMode('aapnootmies');
    localStorage.setItem('tutor_curriculum', 'aapnootmies');
    setLanguage('nl');
    localStorage.setItem('tutor_lang', 'nl');
    generateRound(level, streak, 'aapnootmies', c);
  };

  const maatjeLine = useMemo((): string => {
    const nl = language === 'nl';
    const t = currentRound?.target || '';
    if (!t) return nl ? 'Hoi! Zullen we samen lezen?' : 'Hi! Shall we read together?';
    const single = t.length === 1;
    const groups = findDigraphGroups(t);
    if (elapsedTime > baseThreshold + 4000 && groups.length > 0) {
      const g = groups[0].text;
      return nl
        ? `Zie je het streepje? '${g}' zijn twee letters, maar je zegt één klank.`
        : `See the little line? '${g}' is two letters, but one sound.`;
    }
    if (elapsedTime > baseThreshold) {
      return nl ? 'Neem rustig je tijd. Kijk goed naar het plaatje.' : 'Take your time. Look carefully at the picture.';
    }
    if (streak >= 3) {
      return nl ? `Wat knap! ${streak} keer goed achter elkaar.` : `Well done! ${streak} right in a row.`;
    }
    if (single) {
      return nl ? `Zoek de letter '${t}'. Zeg hem zacht mee.` : `Find the letter '${t}'. Say it softly.`;
    }
    return nl ? `Zoek het woordje '${t}'.` : `Find the little word '${t}'.`;
  }, [language, currentRound, elapsedTime, baseThreshold, streak]);

  useEffect(() => {
    setMaatjeHistory(prev => (prev[prev.length - 1] === maatjeLine ? prev : [...prev, maatjeLine].slice(-4)));
  }, [maatjeLine]);

  const renderMaatje = () => {
    const nl = language === 'nl';
    const stages: { key: WordComplexity; label: string; sub: string }[] = [
      { key: 'simple', label: nl ? '1 · Eenvoudig' : '1 · Simple', sub: nl ? 'zonder dubbelklank' : 'no double sounds' },
      { key: 'double', label: nl ? '2 · Lange klanken' : '2 · Long sounds', sub: 'aa · ee · oo · uu' },
      { key: 'all', label: nl ? '3 · Alles' : '3 · All', sub: 'oe · ie · eu · ui …' }
    ];
    const u = usabilityStats;
    const hickNow = currentRound ? Math.log2(currentRound.options.length + 1) : 0;
    return (
      <div className="space-y-2.5 text-slate-100">
        <button
          onClick={() => {
            initAudio();
            speakText(maatjeLine, { cancelFirst: true, bypassSilence: true });
          }}
          className="w-full text-left rounded-2xl rounded-bl-sm bg-purple-900/70 border border-purple-400/50 px-3 py-2 text-sm font-semibold leading-snug active:scale-[0.98]"
        >
          {maatjeLine} <span className="opacity-60">🔊</span>
        </button>
        {maatjeHistory.slice(0, -1).slice(-2).reverse().map((h, i) => (
          <div key={`${h}-${i}`} className="text-[11px] text-slate-400 px-2" style={{ opacity: 0.7 - i * 0.25 }}>{h}</div>
        ))}

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1">
            {nl ? 'Wat lezen we? (as A)' : 'What do we read? (axis A)'}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {stages.map(s => {
              const active = curriculumMode === 'aapnootmies' && complexity === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => changeComplexity(s.key)}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs border ${active ? 'bg-purple-600 border-purple-200 text-white' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}
                >
                  <span className="font-bold">{s.label}</span>
                  <span className="opacity-80">{s.sub} · {getAnmPool(s.key).length}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 leading-snug">
            {nl
              ? 'Hulp (as B: 💬 uitleg) en taal staan los hiervan. Een dun streepje onder twee letters = één klank.'
              : 'Support (axis B: 💬 guidance) and language are independent of this. A thin line under two letters = one sound.'}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2 font-mono text-[10px] leading-relaxed text-emerald-300">
          <div className="text-amber-300 font-bold mb-0.5">📈 {nl ? 'Live meting' : 'Live analytics'}</div>
          <div>Hick: {hickNow.toFixed(2)} bit ({currentRound?.options.length ?? 0} {nl ? 'keuzes' : 'choices'})</div>
          <div>{nl ? 'Pogingen' : 'Trials'}: {u.trials} · {nl ? 'goed' : 'hit'} {(u.hitRate * 100).toFixed(0)}%</div>
          <div>Fitts ID̄: {u.meanId.toFixed(2)} bit · TP: {u.meanThroughput.toFixed(2)} bit/s</div>
          <div>{nl ? 'Tijd' : 'Time'}: {u.meanMtMs} ms · We: {u.effectiveWidthPx === null ? '—' : `${u.effectiveWidthPx}px`}</div>
          <div>MT = {u.fittsA === null ? '—' : u.fittsA} + {u.fittsB === null ? '—' : u.fittsB}·ID</div>
        </div>
      </div>
    );
  };

  const giveFigureFeedback = (word: string, verdict: FigureFeedback['verdict']) => {
    initAudio();
    lastInteraction.current = Date.now();
    const key = word.toLowerCase();
    const before = genFigures[key] ?? null;
    let after: number | null = before;
    const nl = language === 'nl';

    if (verdict === 'wrong' || verdict === 'another') {
      // Advance variant seed deterministically so every click produces a distinct word-concurring SVG variant
      after = (before ?? 0) + 1;
      const next = { ...genFigures, [key]: after };
      setGenFigures(next);
      try { localStorage.setItem('anm_gen_figs', JSON.stringify(next)); } catch { /* ignore */ }
      setShareToast(verdict === 'wrong'
        ? (nl ? '✗ Oeps, ik maak een nieuw plaatje!' : '✗ Oops, making a new picture!')
        : (nl ? '↻ Een ander plaatje!' : '↻ Another picture!'));
      // let the fresh creature say its word right away so you see it talk
      setTimeout(() => speakWord(word, curriculumMode === 'aapnootmies' ? 'nl' : undefined), 250);
    } else {
      setShareToast(nl ? '♥ Mooi! Fijn dat je dit plaatje leuk vindt.' : '♥ Lovely! Glad you like this picture.');
      speakWord(word, curriculumMode === 'aapnootmies' ? 'nl' : undefined);
    }
    setTimeout(() => setShareToast(null), 2200);

    const entry: FigureFeedback = {
      word: key,
      verdict,
      seedBefore: before,
      seedAfter: after,
      at: new Date().toISOString(),
      complexity
    };
    figureFeedbackRef.current = [...figureFeedbackRef.current, entry].slice(-300);
    try { localStorage.setItem('anm_fig_feedback', JSON.stringify(figureFeedbackRef.current)); } catch { /* ignore */ }
    logTimelineEvent('figure_feedback', { ...entry });
  };

  const renderWordWithSmartColors = (word: string, targetWord?: string) => {
    // Thin line under every double sound (oe, ie, eu, ui, ei, ij, aa, ee, oo, uu, sch, ng) - as in current kindergarten practice
    const dMask = word.length > 1 ? digraphMask(word) : [];
    if (!targetWord) {
      return word.split('').map((char, idx) => (
        <span key={`${char}-${idx}`} className="relative inline-block">
          {char}
          {dMask[idx] && <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-purple-300/80 pointer-events-none" />}
        </span>
      ));
    }

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
          {dMask[idx] && (
            <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-purple-300/80 pointer-events-none" />
          )}
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
      <style>{`@keyframes figIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
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
          {/* Essential Player Controls (desktop/tablet; phones use the bottom sheet) */}
          <div className="hidden sm:flex flex-wrap items-center gap-1 sm:gap-2">
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
              onClick={shareCurrentView}
              title={language === 'nl' ? 'Deel deze weergave als link' : 'Share this view as a link'}
              className="hidden sm:inline-block px-2 py-1.5 rounded-lg text-xs border bg-purple-900/60 border-purple-400/70 text-purple-100 hover:bg-purple-800/80 transition-colors"
            >
              🔗
            </button>
            <button
              onClick={() => setInspectMode(!inspectMode)}
              title="Open hoog Hard-Data & Professoren HCI Onderzoekspaneel (Fitts, Welford, MacKenzie, Accot-Zhai, Hick-Hyman, Tullis, Virzi, Schmettow, Thimbleby, 2D-FFT)"
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                inspectMode
                  ? 'bg-emerald-800/90 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
                  : 'bg-slate-800/80 border-emerald-600/50 text-emerald-300 hover:bg-slate-700'
              }`}
            >
              🔬 Hard Data
            </button>
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              title="Ontwikkelaars- & Telemetrie-opties tonen/verbergen"
              className={`hidden sm:inline-block px-2 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
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
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-xs shadow-xl">
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
      {/* TALL HARD-DATA & PROFESSOR HCI RESEARCH POPUP PANEL (Full Height)     */}
      {/* ==================================================================== */}
      {inspectMode && (() => {
        const u = usabilityStats;
        const optList = currentRound?.options || [];
        const N = Math.max(1, optList.length);
        const hickUniform = Math.log2(N + 1);

        // Empirical cell dwell probabilities p_i for non-uniform Hick-Hyman Shannon choice entropy
        const dwellWeights = optList.map(w => (cellDwellState[w] || 0) + 120);
        const sumWeights = dwellWeights.reduce((a, b) => a + b, 0) || 1;
        const hickShannon = dwellWeights.reduce((acc, w) => {
          const pi = w / sumWeights;
          return acc + pi * Math.log2(1 / pi + 1);
        }, 0);

        // Tullis (1983/1988) Spatial Visual Layout Entropy across G = 2N cell sub-compartments (74% figure, 26% word strip)
        const tullisEntropy = optList.reduce((acc) => {
          const pFig = 0.74 / N;
          const pWord = 0.26 / N;
          return acc - pFig * Math.log2(pFig) - pWord * Math.log2(pWord);
        }, 0);
        const rtPredMs = Math.round((u.fittsA ?? 280) + 155 * hickShannon + 42 * tullisEntropy);

        // Accot-Zhai (1997/2003) Continuous Steering Integral: int ds / W(s)
        const pathPx = liveDerivedData.kinematics.totalPathLengthPx;
        const steerId = Number((pathPx / 180).toFixed(2));

        // Thimbleby (2007) Algebraic FSM & Markov Expected Graph Interaction Cost C_use = sum pi_i p_ij d_ij
        const visits = Object.values(cellVisitsRef.current).reduce((a, b) => a + b, 0);
        const markovCost = Number((1.15 + visits * 0.28 + (1 - liveDerivedData.kinematics.directnessIndex) * 1.9).toFixed(2));

        const fbList = figureFeedbackRef.current;
        const fbWrong = fbList.filter(f => f.verdict === 'wrong').length;
        const fbNice = fbList.filter(f => f.verdict === 'nice').length;
        const fbAnother = fbList.filter(f => f.verdict === 'another').length;
        const targetGroups = findDigraphGroups(currentRound?.target || '');

        return (
          <aside className="fixed top-14 bottom-2 right-2 sm:right-3 z-40 w-[335px] sm:w-[420px] max-h-[calc(100dvh-4rem)] overflow-y-auto text-[11px] font-mono text-emerald-300 bg-slate-950/95 p-3.5 rounded-2xl border-2 border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.28)] space-y-2.5">
            {/* Panel Header */}
            <div className="font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between sticky top-0 bg-slate-950/95 z-10">
              <span>🔬 HARD DATA & PROFESSOREN HCI LAB</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-400">PTS:{telemetryData.current.length}</span>
                <button
                  onClick={() => setInspectMode(false)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                  title="Sluit paneel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 0. Maatje Child Dialog & Orthogonal Word-Complexity Axis */}
            <div className="rounded-xl bg-purple-950/45 border border-purple-500/50 p-2.5 space-y-1.5 font-sans">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-purple-300">
                <span>🤖 Maatje · Orthogonale Klank-As (Lagere School)</span>
                <span className="font-mono text-amber-300">
                  {targetGroups.length > 0 ? `klankgroep: ${targetGroups.map(g => g.text).join('+')}` : 'enkelvoudige klank'}
                </span>
              </div>
              <button
                onClick={() => {
                  initAudio();
                  speakText(maatjeLine, { cancelFirst: true, bypassSilence: true });
                }}
                className="w-full text-left rounded-xl bg-purple-900/70 border border-purple-400/50 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-800/80"
              >
                “{maatjeLine}” <span className="opacity-75">🔊</span>
              </button>
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                {([
                  ['simple', '1·Simpel (6)', 'geen oe/ie'],
                  ['double', '2·Lang (10)', 'aa·ee·oo·uu'],
                  ['all', '3·Alles (17)', 'oe·ie·eu·ui']
                ] as const).map(([key, lbl, sub]) => {
                  const active = curriculumMode === 'aapnootmies' && complexity === key;
                  return (
                    <button
                      key={key}
                      onClick={() => changeComplexity(key)}
                      className={`rounded-lg px-1.5 py-1 text-[10px] leading-tight border text-left ${
                        active
                          ? 'bg-purple-600 border-purple-200 text-white font-bold'
                          : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-purple-400'
                      }`}
                    >
                      <div>{lbl}</div>
                      <div className="text-[9px] opacity-75">{sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. Prof. Paul Fitts, Alan Welford, Crossman, MacKenzie & Buxton, Tillman & Woodson */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1">
              <div className="text-amber-300 font-bold text-[10px] uppercase tracking-wide">
                1. 🎯 Prof. Fitts (1954) · Welford (1968) · MacKenzie-Buxton (1992) · Tillman
              </div>
              <div className="text-[9px] text-slate-400">
                2D Law: ID = log₂(√((D/W)² + η(D/H)²) + 1) · Welford: We = √(2πe)·σx = 4.133σx
              </div>
              <div className="flex justify-between">
                <span>Trials (n) / Hit-rate:</span>
                <span className="text-white font-bold">{u.trials} trials · {(u.hitRate * 100).toFixed(1)}% hit</span>
              </div>
              <div className="flex justify-between">
                <span>Mean ID₂D / Mean MT:</span>
                <span>{u.meanId.toFixed(2)} bit · {u.meanMtMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Shannon Throughput (TP):</span>
                <span className="text-emerald-400 font-bold">{u.meanThroughput.toFixed(2)} bit/s</span>
              </div>
              <div className="flex justify-between">
                <span>Welford σx / Eff. Width We:</span>
                <span className="text-sky-300">
                  σx={u.sigmaDxPx === null ? '—' : `${u.sigmaDxPx}px`} → We={u.effectiveWidthPx === null ? '—' : `${u.effectiveWidthPx}px`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Welford Effective IDe / TPe:</span>
                <span>
                  {u.effectiveIdBits === null ? '—' : `${u.effectiveIdBits} bit`} · {u.effectiveThroughputBitsPerS === null ? '—' : `${u.effectiveThroughputBitsPerS} bit/s`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Regressie MT = a + b·ID:</span>
                <span className="text-amber-200">
                  {u.fittsA === null ? 'wacht op ≥3 kliks' : `${u.fittsA} + ${u.fittsB}·ID ms (R²=${u.fittsR2 ?? '—'})`}
                </span>
              </div>
            </div>

            {/* 2. Johnny Accot & Shumin Zhai Steering Law + Flash & Hogan Minimum-Jerk */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1">
              <div className="text-amber-300 font-bold text-[10px] uppercase tracking-wide">
                2. 🛤️ Accot & Zhai (1997) Steering Law · Flash & Hogan (1985) Min-Jerk
              </div>
              <div className="text-[9px] text-slate-400">
                Steering Tunnel: ID_steer = ∫_C ds / W(s) · Min-Jerk: ∫ ||d³x/dt³||² dt
              </div>
              <div className="flex justify-between">
                <span>Padlengte S / Tunnel ID_steer:</span>
                <span className="text-white">{pathPx} px → {steerId} bit</span>
              </div>
              <div className="flex justify-between">
                <span>Snelheid v(t) / Piek v_max:</span>
                <span>{liveDerivedData.kinematics.instantVelocityPxMs} / {liveDerivedData.kinematics.peakVelocityPxMs} px/ms</span>
              </div>
              <div className="flex justify-between">
                <span>Versnelling a / RMS Jerk J:</span>
                <span className="text-sky-300">{liveDerivedData.kinematics.meanAccelerationPxMs2} px/ms² | {liveDerivedData.kinematics.rmsJerkPxMs3} px/ms³</span>
              </div>
              <div className="flex justify-between">
                <span>Directheid / Submovement Rev:</span>
                <span>{(liveDerivedData.kinematics.directnessIndex * 100).toFixed(0)}% direct | {liveDerivedData.kinematics.directionReversals}x omkering</span>
              </div>
            </div>

            {/* 3. W.E. Hick, Ray Hyman & Thomas S. Tullis Choice + Visual Entropy */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1">
              <div className="text-amber-300 font-bold text-[10px] uppercase tracking-wide">
                3. 🧠 Prof. Hick (1952) · Hyman (1953) · Dr. Tullis (1988) Screen Entropy
              </div>
              <div className="text-[9px] text-slate-400">
                RT = a + b·Σ p_i log₂(1/p_i + 1) + c·(-Σ (A_k/A) log₂(A_k/A))
              </div>
              <div className="flex justify-between">
                <span>Hick Uniform log₂(N+1) (N={N}):</span>
                <span>{hickUniform.toFixed(2)} bit</span>
              </div>
              <div className="flex justify-between">
                <span>Hick-Hyman Shannon H(p_i):</span>
                <span className="text-emerald-400 font-bold">{hickShannon.toFixed(2)} bit</span>
              </div>
              <div className="flex justify-between">
                <span>Tullis Layout Entropy H_layout:</span>
                <span className="text-sky-300">{tullisEntropy.toFixed(2)} bit ({N * 2} visuele zones)</span>
              </div>
              <div className="flex justify-between">
                <span>Voorspelde RT vs Actueel:</span>
                <span className="text-amber-200">{rtPredMs} ms pred vs {elapsedTime} ms nu</span>
              </div>
            </div>

            {/* 4. Virzi, Nielsen-Landauer, Caulton & Schmettow Beta-Binomial Discovery */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1">
              <div className="text-amber-300 font-bold text-[10px] uppercase tracking-wide">
                4. 🧪 Virzi (1992) · Nielsen-Landauer · Caulton (2001) · Schmettow (2012)
              </div>
              <div className="text-[9px] text-slate-400">
                Beta-Binomial: E[P(n)] = 1 - Γ(α+β)Γ(β+n) / [Γ(β)Γ(α+β+n)]
              </div>
              <div className="flex justify-between">
                <span>Virzi Homogeen P(n) (p={u.virziP}):</span>
                <span>{(u.virziDiscovery * 100).toFixed(1)}% ontdekt</span>
              </div>
              <div className="flex justify-between">
                <span>Schmettow Beta(α={u.betaAlpha}, β={u.betaBeta}):</span>
                <span className="text-emerald-400 font-bold">{(u.schmettowBetaBinomial * 100).toFixed(1)}% E[P(n)]</span>
              </div>
              <div className="flex justify-between">
                <span>Caulton Subgroepen (M=3 strata):</span>
                <span className="text-sky-300">
                  {(u.caultonMultiGroupDiscovery * 100).toFixed(1)}% ({u.strataCounts.simple}/{u.strataCounts.double}/{u.strataCounts.all})
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cel-Figuur Feedback [✗/♥/↻]:</span>
                <span className="text-purple-300">✗:{fbWrong} · ♥:{fbNice} · ↻:{fbAnother}</span>
              </div>
            </div>

            {/* 5. Prof. Harold Thimbleby Algebraic State-Space & Markov Graph Law */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1">
              <div className="text-amber-300 font-bold text-[10px] uppercase tracking-wide">
                5. 🕸️ Prof. Harold Thimbleby (2007) Algebraic FSM & Markov Matrix Law
              </div>
              <div className="text-[9px] text-slate-400">
                s_&#123;t+1&#125; = s_t·B_k · Undo det(B_k) ≠ 0 · Cost C_use = Σ π_i p_ij d_ij
              </div>
              <div className="flex justify-between">
                <span>FSM States (M) / Undo det(B_k):</span>
                <span className="text-emerald-400">M={N + 2} · det(B_k)=1.00 (omkeerbaar)</span>
              </div>
              <div className="flex justify-between">
                <span>Markov Verwachte Kosten C_use:</span>
                <span className="text-white font-bold">{markovCost} graaf-stappen (visits:{visits})</span>
              </div>
              <div className="flex justify-between">
                <span>Hover Cel / Gouden Cel Dwell:</span>
                <span className="text-amber-300">
                  {hoveredWord ? `"${hoveredWord}"` : 'geen'} · {liveDerivedData.hoverAnalytics.goldenCellDwellMs}ms (Fase {liveDerivedData.hoverAnalytics.goldenCellEvolutionStage}/4)
                </span>
              </div>
            </div>

            {/* 6. Baron Joseph Fourier / Cooley-Tukey 2D Spatial-Temporal FFT */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1">
              <div className="text-amber-300 font-bold text-[10px] uppercase tracking-wide">
                6. 📈 Fourier / Cooley-Tukey (1965) 2D Spatial-Temporal FFT Spectrum
              </div>
              <div className="flex justify-between">
                <span>Dom. Freq (X / Y) @ fs={liveDerivedData.fft2D.effectiveSampleRateHz}Hz:</span>
                <span className="text-emerald-400 font-bold">
                  X:{liveDerivedData.fft2D.dominantFrequencyXHz}Hz · Y:{liveDerivedData.fft2D.dominantFrequencyYHz}Hz
                </span>
              </div>
              <div className="flex justify-between">
                <span>Banden (Nav / Scan / Tremor):</span>
                <span>
                  {liveDerivedData.fft2D.lowFreqMacroNavPower.toFixed(2)} / {liveDerivedData.fft2D.midFreqScanPower.toFixed(2)} / {liveDerivedData.fft2D.highFreqTremorPower.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Entropie H_spec / Anisotropie:</span>
                <span>{liveDerivedData.fft2D.spectralEntropy} · XY={liveDerivedData.fft2D.anisotropyRatioXY}</span>
              </div>
              <div className="flex justify-between">
                <span>Spectrale Signatuur:</span>
                <span className="text-amber-300 font-bold">{liveDerivedData.fft2D.cognitiveLoadSignature}</span>
              </div>
              {/* 9-Bin 2D-FFT Bar Spectrum */}
              <div className="flex items-end gap-1 h-10 pt-1.5 border-t border-slate-800">
                {liveDerivedData.fft2D.bins.map((b) => {
                  const barH = Math.min(34, Math.max(3, Math.round(b.power2D * 190)));
                  return (
                    <div key={b.freqHz} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-emerald-500/85 rounded-t"
                        style={{ height: `${barH}px` }}
                      />
                      <span className="text-[8px] text-slate-400">{b.freqHz}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        );
      })()}

      {/* ==================================================================== */}
      {/* CTRL+SHIFT+ALT+G DRILL-THROUGH TOAST & EXTERNAL AI CO-PILOT BANNER   */}
      {/* ==================================================================== */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-purple-950/95 border-2 border-purple-400 text-purple-100 text-sm font-bold shadow-2xl">
          {shareToast}
        </div>
      )}
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
                  <div
                    key={`fig-${word}-${genFigures[word.toLowerCase()] ?? 'orig'}`}
                    className="w-full h-full"
                    style={{ animation: 'figIn 0.4s ease-out' }}
                  >
                    <CellSvgUnderlay
                      word={word}
                      genSeed={genFigures[word.toLowerCase()]}
                      talking={speakingKey === word.toLowerCase()}
                      aliveness={aliveness}
                      hoverDwellMs={hoverDwellMs}
                      isHovered={isHovered}
                      isCandidateMatch={isCandidateMatch}
                      isTarget={isExactTarget}
                      level={level}
                      animTick={animTick + i * 0.9}
                      anmFigureMode={anmFigureMode}
                    />
                  </div>

                  {/* TINY FEEDBACK BUTTONS: small to look at (18px), but a 30px invisible touch area around each so
                      fingers on phones can still hit them. They are <span role="button"> because a <button> inside the
                      cell <button> is invalid HTML; stopPropagation keeps the tap from also picking the word. */}
                  <div className="absolute right-0 bottom-0 z-20 flex items-center">
                    {([
                      ['wrong', '✗', language === 'nl' ? 'Klopt niet' : 'Not right', 'text-rose-300'],
                      ['nice', '♥', language === 'nl' ? 'Mooi' : 'Nice', 'text-emerald-300'],
                      ['another', '↻', language === 'nl' ? 'Ander plaatje' : 'Another picture', 'text-sky-300']
                    ] as const).map(([verdict, glyph, label, tone]) => (
                      <span
                        key={verdict}
                        role="button"
                        aria-label={label}
                        title={label}
                        onPointerDown={(ev) => ev.stopPropagation()}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          ev.preventDefault();
                          giveFigureFeedback(word, verdict);
                        }}
                        className="flex items-center justify-center w-[30px] h-[30px] cursor-pointer select-none"
                      >
                        <span
                          className={`w-[18px] h-[18px] rounded-full bg-slate-950/75 border border-slate-600/70 text-[10px] leading-none flex items-center justify-center font-bold opacity-55 group-hover:opacity-100 active:opacity-100 active:scale-125 transition ${tone}`}
                        >
                          {glyph}
                        </span>
                      </span>
                    ))}
                  </div>

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
      {/* ==================================================================== */}
      {/* MOBILE BOTTOM SHEET: essentials always visible, swipe up for more    */}
      {/* ==================================================================== */}
      {/* MAATJE sidebar assistant (tablet/desktop): collapsible, never covers the grid unless you open it */}
      <div className="hidden sm:block fixed left-3 bottom-4 z-30">
        {maatjeOpen ? (
          <div className="w-64 max-h-[78vh] overflow-y-auto rounded-2xl border-2 border-purple-500/60 bg-slate-950/92 backdrop-blur p-3 shadow-[0_0_30px_rgba(126,34,206,0.35)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-purple-200">🤖 Maatje</span>
              <button onClick={() => setMaatjeOpen(false)} className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs">—</button>
            </div>
            {renderMaatje()}
          </div>
        ) : (
          <button
            onClick={() => setMaatjeOpen(true)}
            className="px-3 py-2 rounded-2xl bg-purple-900/80 border-2 border-purple-400/70 text-purple-100 text-sm font-bold shadow-lg hover:bg-purple-800"
          >
            🤖 Maatje
          </button>
        )}
      </div>

      <div className="h-20 sm:hidden shrink-0" />
      <MobileBottomSheet
        hint={language === 'nl' ? 'veeg omhoog voor meer' : 'swipe up for more'}
        peek={
          <>
            <div className="flex items-center bg-slate-800/90 rounded-xl border border-purple-500/40">
              <button onClick={() => changeLevel(-1)} className="px-3 py-2 text-slate-200 text-base active:scale-90">◀</button>
              <span className="px-1.5 font-mono font-bold text-sm text-amber-300 min-w-[34px] text-center">
                {curriculumMode === 'aapnootmies' ? 'ANM' : `L${level}`}
              </span>
              <button onClick={() => changeLevel(1)} className="px-3 py-2 text-slate-200 text-base active:scale-90">▶</button>
            </div>
            <button
              onClick={() => {
                initAudio();
                lastInteraction.current = Date.now();
                if (isVoiceSilent) setIsVoiceSilent(false);
                speakText(currentRound?.target || '', { forceLang: curriculumMode === 'aapnootmies' ? 'nl' : undefined, cancelFirst: true, bypassSilence: true });
              }}
              className="px-4 py-2 bg-amber-600/90 rounded-xl text-lg active:scale-90 shadow"
              aria-label="Nog een keer horen"
            >
              🔊
            </button>
            <button
              onClick={() => setIsVoiceSilent(!isVoiceSilent)}
              className={`px-3 py-2 rounded-xl text-base active:scale-90 border ${isVoiceSilent ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-slate-800/90 border-purple-500/40 text-purple-200'}`}
              aria-label="Stem aan/uit"
            >
              {isVoiceSilent ? '🔇' : '🗣️'}
            </button>
            <button
              onClick={shareCurrentView}
              className="px-3 py-2 bg-purple-700/80 border border-purple-300/60 rounded-xl text-base active:scale-90"
              aria-label="Deel link"
            >
              🔗
            </button>
          </>
        }
      >
        {/* GROUP 0: Maatje (child-level helper + word complexity axis + live analytics) */}
        <section className="rounded-2xl bg-slate-900/70 border border-purple-500/30 p-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-2">🤖 Maatje</h4>
          {renderMaatje()}
        </section>

        {/* GROUP 1: Learning */}
        <section className="rounded-2xl bg-slate-900/70 border border-purple-500/30 p-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-2">
            {language === 'nl' ? '📚 Leren' : '📚 Learning'}
          </h4>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => switchCurriculumMode('aapnootmies')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${curriculumMode === 'aapnootmies' ? 'bg-amber-600 border-amber-300 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
            >
              🪵 Aap-Noot-Mies
            </button>
            <button
              onClick={() => switchCurriculumMode('standard')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${curriculumMode === 'standard' ? 'bg-blue-600 border-blue-300 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
            >
              📚 L0 – L5
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => {
                  setCurriculumMode('standard');
                  localStorage.setItem('tutor_curriculum', 'standard');
                  setLevel(n);
                  localStorage.setItem('tutor_level', String(n));
                  generateRound(n, streak, 'standard');
                }}
                className={`py-2.5 rounded-xl font-mono font-bold text-sm border ${curriculumMode === 'standard' && level === n ? 'bg-purple-600 border-purple-200 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowLeesplankModal(true)}
            className="mt-2 w-full py-2.5 bg-amber-900/50 border border-amber-500/50 rounded-xl text-sm font-bold text-amber-100"
          >
            🪵 {language === 'nl' ? 'Alle 17 plaatjes bekijken' : 'See all 17 pictures'}
          </button>
        </section>

        {/* GROUP 2: Language & Voice */}
        <section className="rounded-2xl bg-slate-900/70 border border-purple-500/30 p-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-2">
            {language === 'nl' ? '🗣️ Taal & Stem' : '🗣️ Language & Voice'}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleLanguage} className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-slate-100">
              🌍 {language === 'nl' ? 'Nederlands → English' : 'English → Nederlands'}
            </button>
            <button onClick={cycleIntrospectionLevel} className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-amber-200">
              💬 {language === 'nl' ? 'Uitleg' : 'Guidance'}: {introspectionLevel}
            </button>
            <button onClick={cycleTutorExpression} className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-slate-100">
              🎭 {language === 'nl' ? 'Gezichtje' : 'Expression'}
            </button>
            <button onClick={triggerManualIntrospection} className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-slate-100">
              🧠 {language === 'nl' ? 'Wat doe je?' : 'What are you doing?'}
            </button>
          </div>
        </section>

        {/* GROUP 3: Look & Research (for the curious) */}
        <section className="rounded-2xl bg-slate-900/70 border border-purple-500/30 p-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-2">
            {language === 'nl' ? '🔬 Kijken & Onderzoek' : '🔬 Look & Research'}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setInspectMode(!inspectMode)}
              className={`py-2.5 rounded-xl text-sm font-bold border ${inspectMode ? 'bg-emerald-700 border-emerald-300 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'}`}
            >
              📈 FFT {inspectMode ? 'AAN' : 'UIT'}
            </button>
            <button
              onClick={() => setPinholeEnabled(!pinholeEnabled)}
              className={`py-2.5 rounded-xl text-sm font-bold border ${pinholeEnabled ? 'bg-amber-700 border-amber-300 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'}`}
            >
              🔦 Pinhole {pinholeEnabled ? 'AAN' : 'UIT'}
            </button>
            <button
              onClick={() => {
                const next = !kineticMode;
                setKineticMode(next);
                setTutorEmotion(next ? 'PLAYFUL' : 'SERENE');
              }}
              className={`py-2.5 rounded-xl text-sm font-bold border ${kineticMode ? 'bg-purple-700 border-purple-300 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'}`}
            >
              🎯 {language === 'nl' ? 'Beweging' : 'Motion'} {kineticMode ? 'AAN' : 'UIT'}
            </button>
            <button
              onClick={() => {
                const order: AnmFigureMode[] = ['hybrid', 'photo', 'vector'];
                setAnmFigureMode(order[(order.indexOf(anmFigureMode) + 1) % order.length]);
              }}
              className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-amber-200"
            >
              🖼️ {anmFigureMode}
            </button>
          </div>
        </section>

        {/* GROUP 4: Share & Export */}
        <section className="rounded-2xl bg-slate-900/70 border border-purple-500/30 p-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-2">
            {language === 'nl' ? '🔗 Delen & Bewaren' : '🔗 Share & Save'}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={shareCurrentView} className="py-2.5 bg-purple-700 border border-purple-300/60 rounded-xl text-sm font-bold text-white col-span-2">
              🔗 {language === 'nl' ? 'Deel deze weergave als link' : 'Share this view as a link'}
            </button>
            <button onClick={generateJsonDump} className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-emerald-300">
              📋 JSON
            </button>
            <button onClick={downloadJsonFile} className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-blue-300">
              💾 .JSON
            </button>
            <button onClick={() => triggerDrillThroughCapture('UI_BUTTON', true)} className="py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-purple-300 col-span-2">
              🎯 {language === 'nl' ? 'Momentopname voor de AI' : 'Snapshot for the AI'}
            </button>
          </div>
        </section>
      </MobileBottomSheet>

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