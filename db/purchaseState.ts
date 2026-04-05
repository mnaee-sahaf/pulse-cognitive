import { getDb } from './database';
import type { CompanionId } from './companion';

export interface PurchaseState {
  /** The one free companion the player chose on first launch. */
  freeCompanionId: CompanionId;
  /** Whether the player has purchased the full unlock ($7.99). */
  fullUnlock: boolean;
}

const DEFAULT_STATE: PurchaseState = {
  freeCompanionId: 'arc',
  fullUnlock: false,
};

/**
 * Load the current purchase state.
 * Returns null if no record exists (pre-choice state).
 */
export async function loadPurchaseState(): Promise<PurchaseState | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM purchase_state WHERE id = 1`
  );
  if (!row) return null;
  return {
    freeCompanionId: row.free_companion_id as CompanionId,
    fullUnlock: row.full_unlock === 1,
  };
}

/**
 * Save the initial free companion choice. Called once during first-run
 * companion selection.
 */
export async function saveFreeCompanionChoice(companionId: CompanionId): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO purchase_state (id, free_companion_id, full_unlock)
     VALUES (1, ?, 0)
     ON CONFLICT(id) DO UPDATE SET free_companion_id = ?`,
    [companionId, companionId]
  );
}

/**
 * Mark the full unlock as purchased. Called after IAP confirmation.
 */
export async function unlockFullAccess(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE purchase_state SET full_unlock = 1 WHERE id = 1`
  );
}

/**
 * Check whether a specific companion is accessible to the player.
 */
export function isCompanionUnlocked(
  companionId: CompanionId,
  purchaseState: PurchaseState | null
): boolean {
  if (!purchaseState) return false;
  if (purchaseState.fullUnlock) return true;
  return companionId === purchaseState.freeCompanionId;
}
