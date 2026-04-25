/**
 * Reliable Change Index — honest pre/post improvement signal.
 *
 * Jacobson & Truax 1991. Clinical significance: a statistical approach to
 * defining meaningful change in psychotherapy research. J. Consult. Clin.
 * Psychol. 59(1), 12-19.
 *
 * The RCI compares an individual's pre/post scores to the standard error
 * of measurement. If |RCI| ≥ 1.96, the change is reliable at p < 0.05 —
 * i.e. the difference is large enough that random measurement error is
 * unlikely to explain it.
 *
 * For Pulse:
 * - Per dimension, we lock a baseline after 5 sessions of data.
 * - We then compute RCI vs the rolling average of recent sessions.
 * - The user sees: "reliably improved", "trending right", or "no change yet".
 *
 * This module is pure: takes session data in, returns RCI verdicts out.
 */

export interface SessionScore {
  /** ISO timestamp of the session, used to order chronologically. */
  timestamp: string;
  /** The dimension's score for this session (e.g. RT in ms, span count). */
  value: number;
}

export interface BaselineSnapshot {
  /** Mean of the baseline window. */
  mean: number;
  /** SD of the baseline window. */
  sd: number;
  /** Number of sessions in the baseline window. */
  n: number;
}

export type Verdict = 'reliable-improvement' | 'reliable-decline' | 'trending-improvement' | 'trending-decline' | 'no-change' | 'insufficient-data';

export interface ImprovementResult {
  verdict: Verdict;
  /** Reliable Change Index value. NaN if insufficient data. */
  rci: number;
  /** Mean of the recent window. */
  recentMean: number;
  /** Mean of the baseline window. */
  baselineMean: number;
  /** Difference (recent - baseline) in dimension units. */
  delta: number;
  /** Standard error of measurement = baseline_sd * sqrt(2). */
  sem: number;
}

/** Number of sessions required to lock a baseline. */
export const MIN_BASELINE_SESSIONS = 5;
/** Number of sessions in the "recent" window for comparison. */
export const RECENT_WINDOW = 5;
/** |RCI| threshold for "reliable" change at p < 0.05 (two-sided). */
export const RCI_THRESHOLD = 1.96;
/** |RCI| threshold for "trending" — directional but not yet reliable. */
export const TRENDING_THRESHOLD = 1.0;

/**
 * Lock a baseline from the first N session scores.
 * Pulse calls this once `scores.length >= MIN_BASELINE_SESSIONS`.
 *
 * Returns null if there isn't enough data yet.
 */
export function lockBaseline(scores: SessionScore[]): BaselineSnapshot | null {
  if (scores.length < MIN_BASELINE_SESSIONS) return null;
  const window = scores.slice(0, MIN_BASELINE_SESSIONS).map((s) => s.value);
  return {
    mean: mean(window),
    sd: sampleSd(window),
    n: window.length,
  };
}

/**
 * Compute RCI between baseline and the most recent N sessions.
 *
 * `lowerIsBetter` flips the verdict polarity:
 * - For RT (lower is better), a negative delta means improvement.
 * - For WM span (higher is better), a positive delta means improvement.
 */
export function computeRci(
  baseline: BaselineSnapshot | null,
  scores: SessionScore[],
  lowerIsBetter: boolean
): ImprovementResult {
  if (!baseline || scores.length < MIN_BASELINE_SESSIONS + 1) {
    return {
      verdict: 'insufficient-data',
      rci: NaN,
      recentMean: NaN,
      baselineMean: baseline?.mean ?? NaN,
      delta: NaN,
      sem: NaN,
    };
  }

  const recent = scores
    .slice(-RECENT_WINDOW)
    .map((s) => s.value);
  const recentMean = mean(recent);
  const delta = recentMean - baseline.mean;
  // Standard error of measurement; Jacobson & Truax §p.14.
  const sem = baseline.sd * Math.SQRT2;
  const rci = sem > 0 ? delta / sem : 0;

  // For "lower is better" metrics, improvement means delta < 0 → rci < 0.
  // We flip sign so a positive RCI always means improvement, regardless of polarity.
  const improvementRci = lowerIsBetter ? -rci : rci;
  const verdict = classify(improvementRci);

  return {
    verdict,
    rci: improvementRci,
    recentMean,
    baselineMean: baseline.mean,
    delta,
    sem,
  };
}

function classify(improvementRci: number): Verdict {
  if (improvementRci >= RCI_THRESHOLD) return 'reliable-improvement';
  if (improvementRci <= -RCI_THRESHOLD) return 'reliable-decline';
  if (improvementRci >= TRENDING_THRESHOLD) return 'trending-improvement';
  if (improvementRci <= -TRENDING_THRESHOLD) return 'trending-decline';
  return 'no-change';
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sampleSd(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance =
    arr.reduce((s, v) => s + (v - m) * (v - m), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Format a player-facing summary string from an ImprovementResult.
 * Always honest. Never claims more than the data supports.
 */
export function describeImprovement(
  result: ImprovementResult,
  unit: string,
  dimensionLabel: string
): string {
  if (result.verdict === 'insufficient-data') {
    return `${dimensionLabel}: not enough data yet — keep training.`;
  }
  const absDelta = Math.round(Math.abs(result.delta));
  switch (result.verdict) {
    case 'reliable-improvement':
      return `${dimensionLabel} reliably improved by ${absDelta}${unit} (RCI ${result.rci.toFixed(2)}).`;
    case 'reliable-decline':
      return `${dimensionLabel} has slipped by ${absDelta}${unit} vs baseline (RCI ${result.rci.toFixed(2)}). Worth a rest day.`;
    case 'trending-improvement':
      return `${dimensionLabel} is trending up — ${absDelta}${unit} better than baseline. Need more data to confirm.`;
    case 'trending-decline':
      return `${dimensionLabel} is trending down — ${absDelta}${unit} below baseline.`;
    case 'no-change':
      return `${dimensionLabel}: holding steady at baseline.`;
  }
}
