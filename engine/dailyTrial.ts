/**
 * Daily Trial pure logic — date assignment, streak math, ISO week helpers.
 *
 * Per CLAUDE.md Rule 1, all domain logic lives in engine/ as pure
 * functions. The matching `db/dailyTrial.ts` wraps these for persistence.
 *
 * Wordle-style return mechanic: each calendar date deterministically maps
 * to a single mode + RNG seed, so every player gets the same drill on the
 * same day. Missing a day breaks the streak (with one weekly shield).
 */

export type GameMode = 'arc' | 'tide' | 'ember' | 'halt';

export interface DailyTrialAssignment {
  /** Date in 'YYYY-MM-DD' format (local). */
  date: string;
  mode: GameMode;
  /** Numeric seed used by the game RNG to make the trial reproducible. */
  seed: number;
}

export interface DailyStreakState {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  /** ISO week identifier ('YYYY-Www') for which a shield has been used. */
  shieldConsumedForWeek: string | null;
}

export const EMPTY_STREAK: DailyStreakState = {
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  shieldConsumedForWeek: null,
};

const MODES: GameMode[] = ['arc', 'tide', 'ember', 'halt'];

/**
 * Stable 32-bit string hash (FNV-1a 32-bit).
 * Wikipedia: Fowler-Noll-Vo hash function. Pure, fast, deterministic.
 */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 0x7fffffff;
}

/**
 * Deterministic mapping from date → daily trial assignment.
 * Same date in, same assignment out. Salt lets us rotate seasons.
 */
export function assignTrial(date: string, salt = 'pulse-v2'): DailyTrialAssignment {
  const h = hashString(`${date}:${salt}`);
  return {
    date,
    mode: MODES[h % MODES.length],
    seed: h,
  };
}

/** Format a Date as 'YYYY-MM-DD' in local time. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * ISO 8601 week string ('YYYY-Www') for a given date.
 * Used to track whether the user has consumed their weekly shield.
 */
export function isoWeek(d: Date): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7; // Mon=0
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Days difference between two YYYY-MM-DD strings (b - a). Pure. */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86400000);
}

/**
 * Apply a completed daily trial to the streak. Pure logic.
 *
 * Rules:
 * - Same-day re-record is a no-op (one attempt per day).
 * - Continuous (gap=1): streak += 1.
 * - Missed exactly one day (gap=2): if no shield consumed this ISO week,
 *   consume it and treat as continuous; otherwise streak breaks to 1.
 * - Missed >1 day: streak breaks to 1.
 * - First-ever completion: streak = 1.
 */
export function applyDailyCompletion(
  prev: DailyStreakState,
  completedDate: string
): DailyStreakState {
  if (prev.lastCompletedDate === completedDate) {
    return prev;
  }

  if (prev.lastCompletedDate === null) {
    return {
      currentStreak: 1,
      bestStreak: Math.max(1, prev.bestStreak),
      lastCompletedDate: completedDate,
      shieldConsumedForWeek: prev.shieldConsumedForWeek,
    };
  }

  const gap = daysBetween(prev.lastCompletedDate, completedDate);

  if (gap === 1) {
    const next = prev.currentStreak + 1;
    return {
      currentStreak: next,
      bestStreak: Math.max(next, prev.bestStreak),
      lastCompletedDate: completedDate,
      shieldConsumedForWeek: prev.shieldConsumedForWeek,
    };
  }

  if (gap === 2) {
    const week = isoWeek(new Date(completedDate + 'T00:00:00'));
    if (prev.shieldConsumedForWeek !== week) {
      const next = prev.currentStreak + 1;
      return {
        currentStreak: next,
        bestStreak: Math.max(next, prev.bestStreak),
        lastCompletedDate: completedDate,
        shieldConsumedForWeek: week,
      };
    }
  }

  return {
    currentStreak: 1,
    bestStreak: prev.bestStreak,
    lastCompletedDate: completedDate,
    shieldConsumedForWeek: prev.shieldConsumedForWeek,
  };
}
