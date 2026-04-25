/**
 * Population norm tables for cognitive metrics, by age band and sex.
 *
 * IMPORTANT: These are research-derived approximations, not clinical norms.
 * They give us a reasonable reference distribution to position the user's
 * scores against — useful, real, but not a medical assessment. The app
 * surfaces a disclaimer wherever percentiles appear.
 *
 * Sources (encoded inline):
 * - Deary, Der & Ford 2001. Reaction times and intelligence differences:
 *   A population-based cohort study. Intelligence 29(5).
 * - Hultsch, MacDonald & Dixon 2002. Variability in reaction time
 *   performance of younger and older adults. J. Gerontol. 57B(2).
 * - Salthouse 1996. The processing-speed theory of adult age differences
 *   in cognition. Psychol. Rev. 103(3).
 * - Park, Lautenschlager, Hedden, Davidson, Smith & Smith 2002. Models of
 *   visuospatial and verbal memory across the adult life span. Psychol.
 *   Aging 17(2).
 * - Logan, Schachar & Tannock 1997. Impulsivity and inhibitory control.
 *   Psychol. Sci. 8(1). (SSRT norms)
 * - Verbruggen et al. 2019. A consensus guide to capturing the ability
 *   to inhibit actions and impulsive behaviors in the stop-signal task.
 *   eLife 8:e46323.
 *
 * Sex differences in these metrics are typically small (5–15ms for RT;
 * marginal for WM span). We encode them where cited but flag any row
 * where the difference is within measurement noise.
 *
 * This module is pure: no I/O, no side effects.
 */

export type AgeBand = '18-25' | '25-35' | '35-45' | '45-55' | '55-65' | '65+';
export type Sex = 'male' | 'female' | 'unspecified';

export interface NormStat {
  /** Population mean. */
  mean: number;
  /** Population standard deviation. */
  sd: number;
}

export type NormTable = Record<AgeBand, Record<Sex, NormStat>>;

/**
 * Helper: identical stats across sex (used when sex difference is within
 * measurement noise for the metric, per cited research).
 */
function symmetric(mean: number, sd: number): Record<Sex, NormStat> {
  return {
    male: { mean, sd },
    female: { mean, sd },
    unspecified: { mean, sd },
  };
}

/**
 * Choice reaction time (ms). Lower is better.
 *
 * Anchored on Deary 2001 + Hultsch 2002. Salthouse 1996 informs the
 * age slope (≈1ms/year past 20). Sex differences in CRT are real but
 * small (~10–15ms on average); included where the cited literature
 * supports it. SD widens with age per Hultsch's intra-individual
 * variability work.
 */
export const RT_NORMS: NormTable = {
  '18-25': { male: { mean: 290, sd: 50 }, female: { mean: 305, sd: 52 }, unspecified: { mean: 297, sd: 51 } },
  '25-35': { male: { mean: 305, sd: 52 }, female: { mean: 318, sd: 55 }, unspecified: { mean: 311, sd: 54 } },
  '35-45': { male: { mean: 325, sd: 56 }, female: { mean: 338, sd: 58 }, unspecified: { mean: 331, sd: 57 } },
  '45-55': { male: { mean: 350, sd: 62 }, female: { mean: 362, sd: 64 }, unspecified: { mean: 356, sd: 63 } },
  '55-65': { male: { mean: 385, sd: 72 }, female: { mean: 398, sd: 74 }, unspecified: { mean: 391, sd: 73 } },
  '65+':   { male: { mean: 425, sd: 88 }, female: { mean: 440, sd: 92 }, unspecified: { mean: 432, sd: 90 } },
};

/**
 * Working-memory span (count of items recalled in correct order).
 * Higher is better. Park 2002 spatial-WM data. Sex differences in
 * spatial-span span are within ±0.2 items; treated as symmetric.
 */
export const WM_SPAN_NORMS: NormTable = {
  '18-25': symmetric(6.5, 1.2),
  '25-35': symmetric(6.3, 1.2),
  '35-45': symmetric(6.0, 1.3),
  '45-55': symmetric(5.5, 1.4),
  '55-65': symmetric(5.0, 1.5),
  '65+':   symmetric(4.5, 1.6),
};

/**
 * Stop-signal reaction time (SSRT, ms). Lower is better.
 * Logan 1997 + Verbruggen 2019 review. Sex differences in SSRT are not
 * consistently observed in healthy adults; treated as symmetric.
 */
export const SSRT_NORMS: NormTable = {
  '18-25': symmetric(195, 35),
  '25-35': symmetric(200, 40),
  '35-45': symmetric(210, 42),
  '45-55': symmetric(225, 45),
  '55-65': symmetric(245, 50),
  '65+':   symmetric(270, 60),
};

/**
 * Processing speed: median per-tap time on simple recall (ms).
 * Lower is better. Salthouse 1996 + Hultsch 2002 inform the age slope.
 * Distinct from CRT (RT_NORMS): processing speed integrates across
 * stimulus encoding + response selection + motor execution, so means
 * are slightly higher than pure CRT.
 */
export const PROCESSING_SPEED_NORMS: NormTable = {
  '18-25': symmetric(340, 60),
  '25-35': symmetric(360, 65),
  '35-45': symmetric(385, 70),
  '45-55': symmetric(415, 80),
  '55-65': symmetric(455, 92),
  '65+':   symmetric(510, 110),
};

/**
 * Standard normal CDF approximation.
 * Abramowitz & Stegun 1964 §26.2.17. Max error 7.5e-8.
 */
export function standardNormalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * absZ);
  const y =
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absZ * absZ);
  return 0.5 * (1 + sign * y);
}

/**
 * Compute the percentile (0–100) of `value` against the norm table.
 * `lowerIsBetter` flips the sign so a lower value (e.g. faster RT) yields
 * a higher percentile.
 *
 * Returns an integer in [1, 99] — we cap at the extremes to avoid
 * "100th percentile" claims that overstate certainty.
 */
export function percentile(
  value: number,
  norm: NormStat,
  lowerIsBetter: boolean
): number {
  if (norm.sd <= 0) return 50;
  const z = (value - norm.mean) / norm.sd;
  const cdf = standardNormalCdf(z);
  const raw = lowerIsBetter ? 1 - cdf : cdf;
  const pct = Math.round(raw * 100);
  return Math.max(1, Math.min(99, pct));
}

/**
 * Lookup a norm cell. Falls back to 'unspecified' if the (band, sex)
 * combination isn't in the table.
 */
export function lookupNorm(
  table: NormTable,
  ageBand: AgeBand,
  sex: Sex
): NormStat {
  const row = table[ageBand];
  return row[sex] ?? row.unspecified;
}
