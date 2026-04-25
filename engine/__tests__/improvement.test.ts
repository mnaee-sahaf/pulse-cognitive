import {
  lockBaseline,
  computeRci,
  describeImprovement,
  MIN_BASELINE_SESSIONS,
  RECENT_WINDOW,
  RCI_THRESHOLD,
  type SessionScore,
} from '../improvement';

function score(i: number, value: number): SessionScore {
  return { timestamp: `2026-01-${String(i + 1).padStart(2, '0')}`, value };
}

describe('lockBaseline', () => {
  it('returns null with fewer than MIN_BASELINE_SESSIONS sessions', () => {
    const scores = Array.from({ length: 4 }, (_, i) => score(i, 300));
    expect(lockBaseline(scores)).toBeNull();
  });

  it('locks mean and sd from the first 5 sessions only', () => {
    const scores = [
      ...[300, 310, 295, 305, 300].map((v, i) => score(i, v)),
      score(5, 999), // ignored
      score(6, 999),
    ];
    const baseline = lockBaseline(scores);
    expect(baseline).not.toBeNull();
    expect(baseline!.n).toBe(5);
    expect(baseline!.mean).toBe(302);
    // sd of [300,310,295,305,300] ≈ 5.7 (sample sd)
    expect(baseline!.sd).toBeGreaterThan(5);
    expect(baseline!.sd).toBeLessThan(7);
  });
});

describe('computeRci', () => {
  it('returns insufficient-data without a baseline', () => {
    const scores = Array.from({ length: 10 }, (_, i) => score(i, 300));
    const result = computeRci(null, scores, true);
    expect(result.verdict).toBe('insufficient-data');
    expect(Number.isNaN(result.rci)).toBe(true);
  });

  it('returns insufficient-data with too few recent sessions', () => {
    const baseline = { mean: 300, sd: 10, n: 5 };
    const scores = Array.from({ length: 5 }, (_, i) => score(i, 280));
    const result = computeRci(baseline, scores, true);
    expect(result.verdict).toBe('insufficient-data');
  });

  it('flags reliable improvement for RT when recent mean drops well below baseline', () => {
    const baseline = { mean: 300, sd: 10, n: 5 };
    // Recent window 5 scores all ~270 → delta=-30, sem=10*sqrt(2)≈14.14, rci ≈ -2.12
    // For lower-is-better, improvementRci = -rci ≈ +2.12 → reliable improvement.
    const scores: SessionScore[] = [
      ...[300, 305, 295, 300, 300].map((v, i) => score(i, v)),
      ...[270, 268, 272, 271, 269].map((v, i) => score(i + 5, v)),
    ];
    const result = computeRci(baseline, scores, true);
    expect(result.verdict).toBe('reliable-improvement');
    expect(result.rci).toBeGreaterThan(RCI_THRESHOLD);
  });

  it('flags reliable decline when recent mean drifts far above baseline (lower is better)', () => {
    const baseline = { mean: 300, sd: 10, n: 5 };
    const scores: SessionScore[] = [
      ...[300, 305, 295, 300, 300].map((v, i) => score(i, v)),
      ...[345, 348, 342, 350, 346].map((v, i) => score(i + 5, v)),
    ];
    const result = computeRci(baseline, scores, true);
    expect(result.verdict).toBe('reliable-decline');
  });

  it('handles higher-is-better polarity (WM span)', () => {
    const baseline = { mean: 5, sd: 0.5, n: 5 };
    // Recent window all 6.5 → delta=+1.5, sem=0.707, rci=2.12 → improvement
    const scores: SessionScore[] = [
      ...[5, 5, 5, 5, 5].map((v, i) => score(i, v)),
      ...[6.5, 6.5, 6.5, 6.5, 6.5].map((v, i) => score(i + 5, v)),
    ];
    const result = computeRci(baseline, scores, false);
    expect(result.verdict).toBe('reliable-improvement');
    expect(result.rci).toBeGreaterThan(RCI_THRESHOLD);
  });

  it('flags trending (not yet reliable) for moderate drift', () => {
    const baseline = { mean: 300, sd: 10, n: 5 };
    // Recent ~285 → delta=-15, sem≈14.14, improvementRci ≈ +1.06 → trending
    const scores: SessionScore[] = [
      ...[300, 305, 295, 300, 300].map((v, i) => score(i, v)),
      ...[286, 285, 284, 286, 285].map((v, i) => score(i + 5, v)),
    ];
    const result = computeRci(baseline, scores, true);
    expect(result.verdict).toBe('trending-improvement');
  });

  it('flags no-change for small noise', () => {
    const baseline = { mean: 300, sd: 10, n: 5 };
    const scores: SessionScore[] = [
      ...[300, 305, 295, 300, 300].map((v, i) => score(i, v)),
      ...[298, 302, 301, 299, 300].map((v, i) => score(i + 5, v)),
    ];
    const result = computeRci(baseline, scores, true);
    expect(result.verdict).toBe('no-change');
  });

  it('uses only the last RECENT_WINDOW sessions', () => {
    const baseline = { mean: 300, sd: 10, n: 5 };
    // Old wave of bad scores; only the last 5 should count for "recent".
    const scores: SessionScore[] = [
      ...[300, 305, 295, 300, 300].map((v, i) => score(i, v)),
      ...[400, 400, 400, 400, 400].map((v, i) => score(i + 5, v)), // older — ignored
      ...[270, 268, 272, 271, 269].map((v, i) => score(i + 10, v)),
    ];
    const result = computeRci(baseline, scores, true);
    expect(result.verdict).toBe('reliable-improvement');
  });
});

describe('describeImprovement', () => {
  it('produces user-facing copy for each verdict', () => {
    const baseline = { mean: 300, sd: 10, n: 5 };
    const improving: SessionScore[] = [
      ...[300, 305, 295, 300, 300].map((v, i) => score(i, v)),
      ...[270, 268, 272, 271, 269].map((v, i) => score(i + 5, v)),
    ];
    const r = computeRci(baseline, improving, true);
    const copy = describeImprovement(r, 'ms', 'Reaction Time');
    expect(copy).toMatch(/reliably improved/i);
    expect(copy).toMatch(/Reaction Time/);
    expect(copy).toMatch(/RCI/);
  });
});
