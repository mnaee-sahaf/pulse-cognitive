export interface EngineConfig {
  // Warm-up phase — engine ignores accuracy, applies fixed gentle escalation
  warmupRounds: number;         // rounds before adaptive logic kicks in (default: 3)
  warmupTempoRamp: number;      // ms delta per warm-up round, negative = faster (default: -5)

  // Flash timing bounds
  initialFlashDuration: number; // starting flash ms (default: 600)
  flashFloor: number;           // minimum flash ms (default: 300)
  flashCeiling: number;         // maximum flash ms — hard cap when easing back (default: 800)

  // Accuracy decision thresholds
  overwhelmThreshold: number;   // accuracy below this → ease back (default: 0.80)
  zpdUpper: number;             // accuracy above this → push harder (default: 0.90)
  rtFastThreshold: number;      // RT below this = player is fast (default: 350ms)
  rtSlowThreshold: number;      // RT above this = player is slow (default: 450ms)

  // Branch: accelerate all axes (accuracy > zpdUpper AND RT < rtFastThreshold)
  accelTempoRamp: number;       // ms delta when fully pushing (default: -30)
  accelGrowth: number;          // sequence cells added per round (default: 2)

  // Branch: push tempo only (accuracy > zpdUpper AND RT > rtSlowThreshold)
  pushTempoRamp: number;        // ms delta for tempo-only push (default: -20)

  // Branch: steady push (accuracy > zpdUpper AND RT between fast/slow thresholds)
  steadyPushTempoRamp: number;  // moderate tempo push (default: -15)

  // Branch: ease back (accuracy < overwhelmThreshold)
  easeTempoRamp: number;        // positive = slows down (default: 40)

  // Cold start — used when player has no session history
  defaultTempoRamp: number;     // starting ramp for new players (default: -10)

  // Grid expansion — requires 3 consecutive rounds above gridExpandAccuracy
  gridExpand3to4Round: number;  // earliest round to expand 3x3 → 4x4 (default: 6)
  gridExpand4to5Round: number;  // earliest round to expand 4x4 → 5x5 (default: 12)
  gridExpandAccuracy: number;   // min accuracy per round for all 3 (default: 0.88)
}

export const ENGINE_CONFIG_DEFAULTS: EngineConfig = {
  warmupRounds: 3,
  warmupTempoRamp: -5,
  initialFlashDuration: 600,
  flashFloor: 300,
  flashCeiling: 800,
  overwhelmThreshold: 0.8,
  zpdUpper: 0.9,
  rtFastThreshold: 350,
  rtSlowThreshold: 450,
  accelTempoRamp: -30,
  accelGrowth: 2,
  pushTempoRamp: -20,
  steadyPushTempoRamp: -15,
  easeTempoRamp: 40,
  defaultTempoRamp: -10,
  gridExpand3to4Round: 6,
  gridExpand4to5Round: 12,
  gridExpandAccuracy: 0.88,
};
