import { getDb } from './database';

export type CompanionId = 'ember' | 'tide' | 'arc';

export interface CompanionDefinition {
  id: CompanionId;
  name: string;
  description: string;
  // Color identity for each evolution stage
  stages: {
    level: number;       // unlocks at this level
    label: string;       // evolution name
    primaryColor: string;
    secondaryColor: string;
    shape: 'circle' | 'triangle' | 'diamond'; // abstract shape
  }[];
}

export interface CompanionState {
  companionId: CompanionId;
  level: number;   // 5–100
  xp: number;      // current XP within level
  xpToNext: number;
}

export const COMPANIONS: Record<CompanionId, CompanionDefinition> = {
  ember: {
    id: 'ember',
    name: 'Ember',
    description: 'Reactive and intense. Thrives under pressure.',
    stages: [
      { level: 1,  label: 'Spark',   primaryColor: '#FF6B35', secondaryColor: '#FFE0D0', shape: 'circle' },
      { level: 20, label: 'Flare',   primaryColor: '#FF4500', secondaryColor: '#FFD0B0', shape: 'triangle' },
      { level: 50, label: 'Blaze',   primaryColor: '#CC2200', secondaryColor: '#FF6B35', shape: 'diamond' },
      { level: 80, label: 'Inferno', primaryColor: '#8B0000', secondaryColor: '#CC2200', shape: 'diamond' },
    ],
  },
  tide: {
    id: 'tide',
    name: 'Tide',
    description: 'Patient and adaptive. Grows stronger over time.',
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
    stages: [
      { level: 1,  label: 'Pulse',   primaryColor: '#7C3AED', secondaryColor: '#EDE9FE', shape: 'triangle' },
      { level: 20, label: 'Charge',  primaryColor: '#5B21B6', secondaryColor: '#DDD6FE', shape: 'triangle' },
      { level: 50, label: 'Bolt',    primaryColor: '#3B0764', secondaryColor: '#5B21B6', shape: 'diamond' },
      { level: 80, label: 'Apex',    primaryColor: '#1E0038', secondaryColor: '#3B0764', shape: 'diamond' },
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
  // Find the highest stage the player has unlocked
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

export async function migrateCompanionTable(db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS companion (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      companion_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 5,
      xp INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export async function loadCompanion(): Promise<CompanionState | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM companion WHERE id = 1`
  );
  if (!row) return null;

  const level = row.level as number;
  return {
    companionId: row.companion_id as CompanionId,
    level,
    xp: row.xp,
    xpToNext: xpForLevel(level),
  };
}

export async function saveCompanionChoice(companionId: CompanionId): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO companion (id, companion_id, level, xp) VALUES (1, ?, 5, 0)
     ON CONFLICT(id) DO NOTHING`,
    [companionId]
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
  const row = await db.getFirstAsync<any>(`SELECT * FROM companion WHERE id = 1`);
  if (!row) throw new Error('No companion found');

  let level = row.level as number;
  let xp = row.xp + scoreToXp(sessionScore);
  let leveledUp = false;
  let evolved = false;
  const companion = COMPANIONS[row.companion_id as CompanionId];
  const oldStage = getCurrentStage(companion, level);

  // Level up loop
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

  // Check evolution
  const newStage = getCurrentStage(companion, level);
  if (newStage.label !== oldStage.label) evolved = true;

  await db.runAsync(
    `UPDATE companion SET level = ?, xp = ? WHERE id = 1`,
    [level, xp]
  );

  return {
    state: { companionId: row.companion_id, level, xp, xpToNext: xpForLevel(level) },
    leveledUp,
    evolved,
    newLevel: level,
  };
}
