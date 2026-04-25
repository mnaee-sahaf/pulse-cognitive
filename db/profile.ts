/**
 * Demographic profile (age band + sex) used to position the player against
 * the right population norm bucket. Stored locally only — never leaves the
 * device unless the user opts into analytics later.
 *
 * Privacy disclosure (surfaced in onboarding UI): "We use this to compare
 * your scores to research data for similar adults. It stays on this device."
 */

import { getDb } from './database';
import type { AgeBand, Sex } from '../engine/norms';

export interface Demographics {
  ageBand: AgeBand;
  sex: Sex;
  /** ISO timestamp when the user provided this. */
  providedAt: string;
}

/**
 * Load demographic profile if the user has completed onboarding.
 * Returns null if not provided yet.
 */
export async function loadDemographics(): Promise<Demographics | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    age_band: string | null;
    sex: string | null;
    updated_at: string;
  }>(`SELECT age_band, sex, updated_at FROM player_profile WHERE id = 1`);
  if (!row || !row.age_band || !row.sex) return null;
  return {
    ageBand: row.age_band as AgeBand,
    sex: row.sex as Sex,
    providedAt: row.updated_at,
  };
}

/**
 * Save demographic profile. Upserts into player_profile.
 * Validates inputs against allowed enum values.
 */
export async function saveDemographics(
  ageBand: AgeBand,
  sex: Sex
): Promise<void> {
  if (!ALLOWED_AGE_BANDS.includes(ageBand)) {
    throw new Error(`Invalid age band: ${ageBand}`);
  }
  if (!ALLOWED_SEX.includes(sex)) {
    throw new Error(`Invalid sex: ${sex}`);
  }
  const db = await getDb();
  const now = new Date().toISOString();
  // Upsert: if a row already exists, just update the demographic columns.
  await db.runAsync(
    `INSERT INTO player_profile (id, age_band, sex, updated_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       age_band = ?,
       sex = ?,
       updated_at = ?`,
    [ageBand, sex, now, ageBand, sex, now]
  );
}

/**
 * Clear demographics (privacy "delete my data" flow).
 */
export async function clearDemographics(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE player_profile SET age_band = NULL, sex = NULL, updated_at = ? WHERE id = 1`,
    [new Date().toISOString()]
  );
}

const ALLOWED_AGE_BANDS: AgeBand[] = [
  '18-25',
  '25-35',
  '35-45',
  '45-55',
  '55-65',
  '65+',
];

const ALLOWED_SEX: Sex[] = ['male', 'female', 'unspecified'];
