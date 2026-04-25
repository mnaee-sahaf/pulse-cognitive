import { getDb } from './database';
import type { PlayerProfile } from '../engine/adaptiveEngine';

export async function loadPlayerProfile(): Promise<PlayerProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    baseline_rt: number;
    wm_capacity: number;
    flex_rating: number;
    speed_accuracy_threshold: number;
    calibrated?: number;
  }>(
    `SELECT * FROM player_profile WHERE id = 1`
  );
  if (!row) return null;
  return {
    baselineRt: row.baseline_rt,
    wmCapacity: row.wm_capacity,
    flexRating: row.flex_rating,
    speedAccuracyThreshold: row.speed_accuracy_threshold,
    calibrated: row.calibrated === 1,
  };
}

/**
 * Recomputes the player profile from recent session data and persists it.
 * Called after every session completes. Always marks `calibrated = true` —
 * after the first completed session, we treat the player as calibrated.
 */
export async function updatePlayerProfile(
  recentAvgRts: number[],
  recentMaxSequences: number[],
  recentFlexRatings: number[],
  recentAccuracies: number[]
): Promise<PlayerProfile> {
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  const baselineRt = avg(recentAvgRts) || 450;
  const wmCapacity = avg(recentMaxSequences) || 4;
  const flexRating = avg(recentFlexRatings) || 0.5;

  // Use avg RT from sessions where accuracy dropped below 80% as the threshold.
  // These sessions represent where speed started to hurt recall — the crossover point.
  // Fall back to 75% of baseline RT if no low-accuracy sessions exist yet.
  const lowAccuracyRts = recentAvgRts.filter((_, i) => recentAccuracies[i] < 0.8);
  const speedAccuracyThreshold =
    lowAccuracyRts.length > 0 ? avg(lowAccuracyRts) : baselineRt * 0.75;

  const profile: PlayerProfile = {
    baselineRt,
    wmCapacity,
    flexRating,
    speedAccuracyThreshold,
    calibrated: true,
  };

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO player_profile (id, baseline_rt, wm_capacity, flex_rating, speed_accuracy_threshold, session_count, calibrated, updated_at)
     VALUES (1, ?, ?, ?, ?, 1, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
       baseline_rt = ?,
       wm_capacity = ?,
       flex_rating = ?,
       speed_accuracy_threshold = ?,
       session_count = session_count + 1,
       calibrated = 1,
       updated_at = ?`,
    [
      baselineRt, wmCapacity, flexRating, speedAccuracyThreshold, new Date().toISOString(),
      baselineRt, wmCapacity, flexRating, speedAccuracyThreshold, new Date().toISOString(),
    ]
  );

  return profile;
}
