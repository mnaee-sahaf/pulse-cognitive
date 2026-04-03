import { getDb } from './database';
import type { PlayerProfile } from '../engine/adaptiveEngine';

export async function loadPlayerProfile(): Promise<PlayerProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM player_profile WHERE id = 1`
  );
  if (!row) return null;
  return {
    baselineRt: row.baseline_rt,
    wmCapacity: row.wm_capacity,
    flexRating: row.flex_rating,
    speedAccuracyThreshold: row.speed_accuracy_threshold,
  };
}

/**
 * Recomputes the player profile from recent session data and persists it.
 * Called after every session completes.
 */
export async function updatePlayerProfile(
  recentAvgRts: number[],
  recentMaxSequences: number[],
  recentFlexRatings: number[]
): Promise<PlayerProfile> {
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  const baselineRt = avg(recentAvgRts) || 450;
  const wmCapacity = avg(recentMaxSequences) || 4;
  const flexRating = avg(recentFlexRatings) || 0.5;
  const speedAccuracyThreshold = baselineRt * 0.75; // rough estimate

  const profile: PlayerProfile = {
    baselineRt,
    wmCapacity,
    flexRating,
    speedAccuracyThreshold,
  };

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO player_profile (id, baseline_rt, wm_capacity, flex_rating, speed_accuracy_threshold, session_count, updated_at)
     VALUES (1, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
       baseline_rt = ?,
       wm_capacity = ?,
       flex_rating = ?,
       speed_accuracy_threshold = ?,
       session_count = session_count + 1,
       updated_at = ?`,
    [
      baselineRt, wmCapacity, flexRating, speedAccuracyThreshold, new Date().toISOString(),
      baselineRt, wmCapacity, flexRating, speedAccuracyThreshold, new Date().toISOString(),
    ]
  );

  return profile;
}
