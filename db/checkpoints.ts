/**
 * RCI baselines and monthly checkpoints, persisted per cognitive dimension.
 *
 * Reliable Change Index requires a locked-baseline (mean + sd of first
 * `MIN_BASELINE_SESSIONS` sessions per dimension). After that, monthly
 * snapshots let us show pre-vs-post trajectories that don't get smoothed
 * away.
 */

import { getDb } from './database';
import type { DimensionId } from '../engine/dimensions';
import type { BaselineSnapshot } from '../engine/improvement';

export type CheckpointType = 'baseline' | 'monthly';

export interface Checkpoint extends BaselineSnapshot {
  dimensionId: DimensionId;
  type: CheckpointType;
  lockedAt: string;
}

/**
 * Save a checkpoint. Idempotent on (dimension, type, locked_at).
 */
export async function saveCheckpoint(c: Checkpoint): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO checkpoints
       (dimension_id, checkpoint_type, locked_at, mean, sd, n)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [c.dimensionId, c.type, c.lockedAt, c.mean, c.sd, c.n]
  );
}

/**
 * Load the locked baseline for a dimension, if any.
 * Returns the most-recent baseline if multiple exist (shouldn't normally).
 */
export async function loadBaseline(
  dimensionId: DimensionId
): Promise<BaselineSnapshot | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ mean: number; sd: number; n: number }>(
    `SELECT mean, sd, n FROM checkpoints
     WHERE dimension_id = ? AND checkpoint_type = 'baseline'
     ORDER BY locked_at DESC LIMIT 1`,
    [dimensionId]
  );
  if (!row) return null;
  return { mean: row.mean, sd: row.sd, n: row.n };
}

/**
 * Load all monthly checkpoints for a dimension, oldest first.
 * Used to render the trajectory chart.
 */
export async function loadMonthlyCheckpoints(
  dimensionId: DimensionId
): Promise<Checkpoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    dimension_id: string;
    checkpoint_type: string;
    locked_at: string;
    mean: number;
    sd: number;
    n: number;
  }>(
    `SELECT * FROM checkpoints
     WHERE dimension_id = ? AND checkpoint_type = 'monthly'
     ORDER BY locked_at ASC`,
    [dimensionId]
  );
  return rows.map((r) => ({
    dimensionId: r.dimension_id as DimensionId,
    type: r.checkpoint_type as CheckpointType,
    lockedAt: r.locked_at,
    mean: r.mean,
    sd: r.sd,
    n: r.n,
  }));
}
