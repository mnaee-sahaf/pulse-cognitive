import * as SQLite from 'expo-sqlite';
import { getDb } from './database';

export type CompanionId = 'ember' | 'tide' | 'arc';

export interface CompanionDefinition {
  id: CompanionId;
  name: string;
  description: string;
  modeLabel: string;
  trainingFocus: string;   // short cognitive skill descriptor
  // Color identity for each evolution stage
  stages: {
    level: number;       // unlocks at this level
    label: string;       // evolution name
    primaryColor: string;
    secondaryColor: string;
    shape: 'circle' | 'triangle' | 'diamond' | 'hexagon'; // abstract shape
  }[];
}

export interface CompanionState {
  companionId: CompanionId;
  level: number;   // 5–100
  xp: number;      // current XP within level
  xpToNext: number;
  isActive?: boolean;
}

export const COMPANIONS: Record<CompanionId, CompanionDefinition> = {
  ember: {
    id: 'ember',
    name: 'Ember',
    description: 'Reactive and intense. Thrives under pressure.',
    modeLabel: 'INTERCEPT',
    trainingFocus: 'Reaction Speed',
    stages: [
      { level: 1,  label: 'Spark',   primaryColor: '#FF6B35', secondaryColor: '#FFE0D0', shape: 'triangle' },
      { level: 20, label: 'Flare',   primaryColor: '#FF4500', secondaryColor: '#FFD0B0', shape: 'triangle' },
      { level: 50, label: 'Blaze',   primaryColor: '#CC2200', secondaryColor: '#FF6B35', shape: 'diamond' },
      { level: 80, label: 'Inferno', primaryColor: '#8B0000', secondaryColor: '#CC2200', shape: 'diamond' },
    ],
  },
  tide: {
    id: 'tide',
    name: 'Tide',
    description: 'Patient and adaptive. Grows stronger over time.',
    modeLabel: 'REVERSE',
    trainingFocus: 'Cognitive Flexibility',
    stages: [
      { level: 1,  label: 'Drop',    primaryColor: '#2D9CDB', secondaryColor: '#D0EEFF', shape: 'circle' },
      { level: 20, label: 'Current', primaryColor: '#1A7FBB', secondaryColor: '#B0DCFF', shape: 'circle' },
      { level: 50, label: 'Wave',    primaryColor: '#0E5A8A', secondaryColor: '#2D9CDB', shape: 'triangle' },
      { level: 80, label: 'Surge',   primaryColor: '#053A5F', secondaryColor: '#0E5A8A', shape: 'diamond' },
    ],
  },
  arc: {
    id: 'arc',
    name: 'Arc',
    description: 'Precise and calculated. Masters patterns instinctively.',
    modeLabel: 'MEMORY',
    trainingFocus: 'Working Memory',
    stages: [
      { level: 1,  label: 'Pulse',   primaryColor: '#7C3AED', secondaryColor: '#EDE9FE', shape: 'hexagon' },
      { level: 20, label: 'Charge',  primaryColor: '#5B21B6', secondaryColor: '#DDD6FE', shape: 'hexagon' },
      { level: 50, label: 'Bolt',    primaryColor: '#3B0764', secondaryColor: '#5B21B6', shape: 'hexagon' },
      { level: 80, label: 'Apex',    primaryColor: '#1E0038', secondaryColor: '#3B0764', shape: 'hexagon' },
    ],
  },
};

/** XP required to reach the next level. Increases with level. */
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 0.85));
}

/** How much XP a session score awards. */
export function scoreToXp(totalScore: number): number {
  return Math.floor(totalScore / 10);
}

export function getCurrentStage(companion: CompanionDefinition, level: number) {
  return [...companion.stages]
    .reverse()
    .find((s) => level >= s.level) ?? companion.stages[0];
}

export function getNextEvolution(
  companion: CompanionDefinition,
  level: number
): { level: number; label: string } | null {
  const next = companion.stages.find((s) => s.level > level);
  return next ? { level: next.level, label: next.label } : null;
}

// ── Database ──────────────────────────────────────────────────────────────────

/** Ensures companion_levels is seeded with all 3 companions. */
async function ensureCompanionLevelsSeeded(db: SQLite.SQLiteDatabase) {
  const count = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM companion_levels`);
  if (count && count.c >= 3) return;

  // Check if there's a legacy row to migrate from
  const legacy = await db.getFirstAsync<{ companion_id: string; level: number; xp: number }>(
    `SELECT companion_id, level, xp FROM companion WHERE id = 1`
  ).catch(() => null);

  const activeId = legacy?.companion_id ?? 'arc';
  const ids: CompanionId[] = ['arc', 'tide', 'ember'];
  for (const id of ids) {
    const isActive = id === activeId ? 1 : 0;
    const level = id === activeId && legacy ? legacy.level : 5;
    const xp = id === activeId && legacy ? legacy.xp : 0;
    await db.runAsync(
      `INSERT OR IGNORE INTO companion_levels (companion_id, level, xp, is_active) VALUES (?, ?, ?, ?)`,
      [id, level, xp, isActive]
    );
  }
}

export async function loadCompanion(): Promise<CompanionState | null> {
  const db = await getDb();
  await ensureCompanionLevelsSeeded(db);

  const row = await db.getFirstAsync<any>(
    `SELECT * FROM companion_levels WHERE is_active = 1`
  );
  if (!row) return null;

  const level = row.level as number;
  return {
    companionId: row.companion_id as CompanionId,
    level,
    xp: row.xp,
    xpToNext: xpForLevel(level),
    isActive: true,
  };
}

export async function getAllCompanions(): Promise<CompanionState[]> {
  const db = await getDb();
  await ensureCompanionLevelsSeeded(db);

  const rows = await db.getAllAsync<any>(`SELECT * FROM companion_levels`);
  return rows.map((row) => ({
    companionId: row.companion_id as CompanionId,
    level: row.level as number,
    xp: row.xp as number,
    xpToNext: xpForLevel(row.level as number),
    isActive: row.is_active === 1,
  }));
}

export async function switchCompanion(companionId: CompanionId): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE companion_levels SET is_active = 0`);
  await db.runAsync(`UPDATE companion_levels SET is_active = 1 WHERE companion_id = ?`, [companionId]);
}

export async function saveCompanionChoice(companionId: CompanionId): Promise<void> {
  const db = await getDb();
  await ensureCompanionLevelsSeeded(db);
  await switchCompanion(companionId);
  // Keep legacy table in sync for backwards compatibility
  await db.runAsync(
    `INSERT INTO companion (id, companion_id, level, xp) VALUES (1, ?, 5, 0)
     ON CONFLICT(id) DO UPDATE SET companion_id = ?`,
    [companionId, companionId]
  );
}

/**
 * Awards XP after a session. Handles level-ups and returns the new state
 * plus whether an evolution occurred.
 */
export async function awardXp(
  sessionScore: number
): Promise<{ state: CompanionState; leveledUp: boolean; evolved: boolean; newLevel: number }> {
  const db = await getDb();
  await ensureCompanionLevelsSeeded(db);

  const row = await db.getFirstAsync<any>(`SELECT * FROM companion_levels WHERE is_active = 1`);
  if (!row) throw new Error('No active companion found');

  let level = row.level as number;
  let xp = row.xp + scoreToXp(sessionScore);
  let leveledUp = false;
  let evolved = false;
  const companion = COMPANIONS[row.companion_id as CompanionId];
  const oldStage = getCurrentStage(companion, level);

  while (level < 100) {
    const needed = xpForLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level = Math.min(100, level + 1);
      leveledUp = true;
    } else {
      break;
    }
  }

  const newStage = getCurrentStage(companion, level);
  if (newStage.label !== oldStage.label) evolved = true;

  await db.runAsync(
    `UPDATE companion_levels SET level = ?, xp = ? WHERE companion_id = ?`,
    [level, xp, row.companion_id]
  );

  return {
    state: { companionId: row.companion_id, level, xp, xpToNext: xpForLevel(level), isActive: true },
    leveledUp,
    evolved,
    newLevel: level,
  };
}
