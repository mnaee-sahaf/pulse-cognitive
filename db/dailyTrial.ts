/**
 * Daily Trial — DB persistence layer.
 * Pure logic (assignment, streak math, ISO week) lives in engine/dailyTrial.ts.
 */

import { getDb } from './database';
import {
  assignTrial,
  applyDailyCompletion,
  type DailyStreakState,
  type DailyTrialAssignment,
  type GameMode,
} from '../engine/dailyTrial';

export type { DailyStreakState, DailyTrialAssignment, GameMode } from '../engine/dailyTrial';

export interface DailyTrialRecord extends DailyTrialAssignment {
  attemptedAt: string | null;
  completedAt: string | null;
  waveReached: number | null;
  totalScore: number | null;
}

/**
 * Get or create today's trial. Idempotent — call as often as you like.
 */
export async function getTrialForDate(date: string): Promise<DailyTrialRecord> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{
    date: string;
    mode: string;
    seed: number;
    attempted_at: string | null;
    completed_at: string | null;
    wave_reached: number | null;
    total_score: number | null;
  }>(`SELECT * FROM daily_trials WHERE date = ?`, [date]);

  if (existing) {
    return {
      date: existing.date,
      mode: existing.mode as GameMode,
      seed: existing.seed,
      attemptedAt: existing.attempted_at,
      completedAt: existing.completed_at,
      waveReached: existing.wave_reached,
      totalScore: existing.total_score,
    };
  }

  const assignment = assignTrial(date);
  await db.runAsync(
    `INSERT INTO daily_trials (date, mode, seed) VALUES (?, ?, ?)`,
    [assignment.date, assignment.mode, assignment.seed]
  );
  return {
    ...assignment,
    attemptedAt: null,
    completedAt: null,
    waveReached: null,
    totalScore: null,
  };
}

/** Mark today's trial as attempted (locks one-shot rule). */
export async function markAttempted(date: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE daily_trials SET attempted_at = ? WHERE date = ?`,
    [now, date]
  );
}

/** Record a completion result. Updates streak state. */
export async function recordCompletion(
  date: string,
  waveReached: number,
  totalScore: number
): Promise<DailyStreakState> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE daily_trials SET completed_at = ?, wave_reached = ?, total_score = ? WHERE date = ?`,
    [now, waveReached, totalScore, date]
  );

  const current = await loadDailyStreakState();
  const next = applyDailyCompletion(current, date);
  await saveDailyStreakState(next);
  return next;
}

export async function loadDailyStreakState(): Promise<DailyStreakState> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    current_streak: number;
    best_streak: number;
    last_completed_date: string | null;
    shield_consumed_for_week: string | null;
  }>(`SELECT * FROM daily_trial_streak WHERE id = 1`);
  if (!row) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      shieldConsumedForWeek: null,
    };
  }
  return {
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    lastCompletedDate: row.last_completed_date,
    shieldConsumedForWeek: row.shield_consumed_for_week,
  };
}

async function saveDailyStreakState(s: DailyStreakState): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO daily_trial_streak
       (id, current_streak, best_streak, last_completed_date, shield_consumed_for_week)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       current_streak = ?,
       best_streak = ?,
       last_completed_date = ?,
       shield_consumed_for_week = ?`,
    [
      s.currentStreak, s.bestStreak, s.lastCompletedDate, s.shieldConsumedForWeek,
      s.currentStreak, s.bestStreak, s.lastCompletedDate, s.shieldConsumedForWeek,
    ]
  );
}
