import {
  standardNormalCdf,
  percentile,
  lookupNorm,
  RT_NORMS,
  WM_SPAN_NORMS,
  SSRT_NORMS,
  PROCESSING_SPEED_NORMS,
} from '../norms';

describe('standardNormalCdf', () => {
  it('returns 0.5 at z=0', () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 4);
  });
  it('returns ~0.8413 at z=1', () => {
    expect(standardNormalCdf(1)).toBeCloseTo(0.8413, 3);
  });
  it('returns ~0.9772 at z=2', () => {
    expect(standardNormalCdf(2)).toBeCloseTo(0.9772, 3);
  });
  it('returns ~0.0228 at z=-2 (symmetry)', () => {
    expect(standardNormalCdf(-2)).toBeCloseTo(0.0228, 3);
  });
  it('returns ~0.9987 at z=3', () => {
    expect(standardNormalCdf(3)).toBeCloseTo(0.9987, 3);
  });
});

describe('percentile', () => {
  it('returns 50 at the mean (lowerIsBetter true)', () => {
    expect(percentile(300, { mean: 300, sd: 50 }, true)).toBe(50);
  });
  it('returns 50 at the mean (lowerIsBetter false)', () => {
    expect(percentile(300, { mean: 300, sd: 50 }, false)).toBe(50);
  });
  it('returns ~84 for a value 1 SD below mean (lower is better)', () => {
    // RT 250 vs mean 300 sd 50 → z=-1, lowerIsBetter=true → 1 - 0.1587 = 84.13%
    const p = percentile(250, { mean: 300, sd: 50 }, true);
    expect(p).toBeGreaterThanOrEqual(83);
    expect(p).toBeLessThanOrEqual(85);
  });
  it('returns ~16 for a value 1 SD above mean (lower is better)', () => {
    // RT 350 vs mean 300 sd 50 → z=+1, lowerIsBetter=true → 1 - 0.8413 = 15.87%
    const p = percentile(350, { mean: 300, sd: 50 }, true);
    expect(p).toBeGreaterThanOrEqual(15);
    expect(p).toBeLessThanOrEqual(17);
  });
  it('returns ~84 for a value 1 SD above mean (higher is better)', () => {
    // WM span 7 vs mean 6 sd 1 → z=+1, higherIsBetter → 84%
    const p = percentile(7, { mean: 6, sd: 1 }, false);
    expect(p).toBeGreaterThanOrEqual(83);
    expect(p).toBeLessThanOrEqual(85);
  });
  it('clamps to [1, 99]', () => {
    expect(percentile(0, { mean: 300, sd: 50 }, true)).toBeLessThanOrEqual(99);
    expect(percentile(0, { mean: 300, sd: 50 }, true)).toBeGreaterThanOrEqual(1);
    expect(percentile(900, { mean: 300, sd: 50 }, true)).toBeGreaterThanOrEqual(1);
    expect(percentile(900, { mean: 300, sd: 50 }, true)).toBeLessThanOrEqual(99);
  });
  it('returns 50 if sd is 0', () => {
    expect(percentile(100, { mean: 100, sd: 0 }, true)).toBe(50);
  });
});

describe('lookupNorm', () => {
  it('returns the right cell for known age × sex', () => {
    const cell = lookupNorm(RT_NORMS, '25-35', 'male');
    expect(cell.mean).toBe(305);
    expect(cell.sd).toBe(52);
  });
  it('falls back to unspecified', () => {
    const cell = lookupNorm(RT_NORMS, '45-55', 'unspecified');
    expect(cell.mean).toBe(356);
  });
});

describe('norm tables — sanity checks', () => {
  it('RT increases monotonically with age (Salthouse age slope)', () => {
    const bands: Array<keyof typeof RT_NORMS> = ['18-25', '25-35', '35-45', '45-55', '55-65', '65+'];
    let last = 0;
    for (const band of bands) {
      const m = RT_NORMS[band].unspecified.mean;
      expect(m).toBeGreaterThan(last);
      last = m;
    }
  });

  it('WM span decreases monotonically with age (Park 2002)', () => {
    const bands: Array<keyof typeof WM_SPAN_NORMS> = ['18-25', '25-35', '35-45', '45-55', '55-65', '65+'];
    let last = Infinity;
    for (const band of bands) {
      const m = WM_SPAN_NORMS[band].unspecified.mean;
      expect(m).toBeLessThan(last);
      last = m;
    }
  });

  it('SSRT and processing speed increase with age', () => {
    expect(SSRT_NORMS['65+'].unspecified.mean).toBeGreaterThan(SSRT_NORMS['18-25'].unspecified.mean);
    expect(PROCESSING_SPEED_NORMS['65+'].unspecified.mean).toBeGreaterThan(PROCESSING_SPEED_NORMS['18-25'].unspecified.mean);
  });

  it('all SD values are positive across all tables', () => {
    const tables = [RT_NORMS, WM_SPAN_NORMS, SSRT_NORMS, PROCESSING_SPEED_NORMS];
    for (const t of tables) {
      for (const band of Object.keys(t) as Array<keyof typeof t>) {
        for (const sex of ['male', 'female', 'unspecified'] as const) {
          expect(t[band][sex].sd).toBeGreaterThan(0);
        }
      }
    }
  });
});
