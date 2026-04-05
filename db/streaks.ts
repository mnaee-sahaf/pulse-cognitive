import { getDb } from './database';

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastSessionDate: string | null; // YYYY-MM-DD
  frozen: boolean; // true = missed 1 day (grace), next miss resets
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export async function loadStreakState(): Promise<StreakState> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM streak_state WHERE id = 1`
  );
  if (!row) {
    return { currentStreak: 0, bestStreak: 0, lastSessionDate: null, frozen: false };
  }
  return {
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    lastSessionDate: row.last_session_date,
    frozen: row.frozen === 1,
  };
}

/**
 * Record a session for streak tracking. Call after every completed session.
 *
 * Rules:
 * - Same day as last session: no change (already counted today)
 * - Next day (consecutive): streak increments, frozen resets
 * - Skipped 1 day: streak freezes (forgiveness) — next miss resets
 * - Skipped 2+ days: streak resets to 1
 * - If frozen and skipped another day: streak resets to 1
 */
export async function recordSessionForStreak(): Promise<StreakState> {
  const db = await getDb();
  const state = await loadStreakState();
  const today = todayStr();

  let { currentStreak, bestStreak, frozen } = state;

  if (!state.lastSessionDate) {
    // First ever session
    currentStreak = 1;
    frozen = false;
  } else if (state.lastSessionDate === today) {
    // Already played today — no streak change
    return state;
  } else {
    const gap = daysBetween(state.lastSessionDate, today);

    if (gap === 1) {
      // Consecutive day
      currentStreak += 1;
      frozen = false;
    } else if (gap === 2 && !frozen) {
      // Skipped 1 day — freeze (forgiveness)
      currentStreak += 1; // still count today
      frozen = true;
    } else {
      // Skipped 2+ days, or was already frozen and missed again
      currentStreak = 1;
      frozen = false;
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  const newState: StreakState = {
    currentStreak,
    bestStreak,
    lastSessionDate: today,
    frozen,
  };

  await db.runAsync(
    `INSERT INTO streak_state (id, current_streak, best_streak, last_session_date, frozen)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       current_streak = ?,
       best_streak = ?,
       last_session_date = ?,
       frozen = ?`,
    [
      currentStreak, bestStreak, today, frozen ? 1 : 0,
      currentStreak, bestStreak, today, frozen ? 1 : 0,
    ]
  );

  return newState;
}

/** Milestone thresholds that trigger special UI. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 100, 365] as const;

export function getStreakMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((m) => streak === m) ?? null;
}

export function getStreakLabel(streak: number): string | null {
  if (streak >= 365) return 'Apex Mind';
  if (streak >= 100) return 'Centurion';
  if (streak >= 30) return 'Dedicated';
  if (streak >= 14) return 'Committed';
  if (streak >= 7) return 'On Fire';
  if (streak >= 3) return 'Consistent';
  return null;
}
