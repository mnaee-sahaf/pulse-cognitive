import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

let db: SQLite.SQLiteDatabase | null = null;

const DB_PATH     = `${FileSystem.documentDirectory}SQLite/pulse.db`;
const BACKUP_PATH = `${FileSystem.documentDirectory}SQLite/pulse_backup.db`;

// ── Dev-only helpers ────────────────────────────────────────────────────────

// TODO: backup/restore via file copy is not working reliably with expo-sqlite v16.
// Needs proper research — likely requires using SQLite's VACUUM INTO, a different
// file path strategy, or serialising/deserialising all table data as JSON instead
// of copying the raw .db file. Leaving stubs so the UI stays wired up.
export async function backupDatabase(): Promise<void> {
  const database = await getDb();
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  await FileSystem.deleteAsync(BACKUP_PATH, { idempotent: true });
  await FileSystem.copyAsync({ from: DB_PATH, to: BACKUP_PATH });
}

export async function restoreDatabase(): Promise<void> {
  const info = await FileSystem.getInfoAsync(BACKUP_PATH);
  if (!info.exists) throw new Error('No backup found');
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await FileSystem.deleteAsync(DB_PATH + '-wal', { idempotent: true });
  await FileSystem.deleteAsync(DB_PATH + '-shm', { idempotent: true });
  await FileSystem.deleteAsync(DB_PATH, { idempotent: true });
  await FileSystem.copyAsync({ from: BACKUP_PATH, to: DB_PATH });
  await getDb();
}

export async function hasBackup(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(BACKUP_PATH);
  return info.exists;
}

/** Dev-only: wipe every table so the app behaves like a fresh install. */
export async function resetAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM companion;
    DELETE FROM companion_levels;
    DELETE FROM sessions;
    DELETE FROM player_profile;
    DELETE FROM engine_config;
    DELETE FROM app_settings;
  `);
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('pulse.db');
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  // Add columns introduced after initial schema — safe to run on every startup
  // Additive column migrations — catch silences "duplicate column" on new installs
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN max_sequence_length INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await db.execAsync(`ALTER TABLE app_settings ADD COLUMN background_intensity REAL NOT NULL DEFAULT 1.0`).catch(() => {});
  await db.execAsync(`ALTER TABLE app_settings ADD COLUMN lives INTEGER NOT NULL DEFAULT 3`).catch(() => {});
  await db.execAsync(`ALTER TABLE app_settings ADD COLUMN green_tile_feedback INTEGER NOT NULL DEFAULT 1`).catch(() => {});
  await db.execAsync(`ALTER TABLE app_settings ADD COLUMN haptic_feedback INTEGER NOT NULL DEFAULT 1`).catch(() => {});

  // Migrate existing single-companion row into companion_levels (idempotent)
  const oldCompanion = await db.getFirstAsync<{ companion_id: string; level: number; xp: number }>(
    `SELECT companion_id, level, xp FROM companion WHERE id = 1`
  ).catch(() => null);
  if (oldCompanion) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS companion_levels (
      companion_id TEXT PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 5,
      xp INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0
    )`).catch(() => {});
    // Only seed if companion_levels is empty
    const existingCount = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM companion_levels`).catch(() => null);
    if (!existingCount || existingCount.c === 0) {
      const companionIds = ['arc', 'tide', 'ember'];
      for (const id of companionIds) {
        const isActive = id === oldCompanion.companion_id ? 1 : 0;
        const level = id === oldCompanion.companion_id ? oldCompanion.level : 5;
        const xp = id === oldCompanion.companion_id ? oldCompanion.xp : 0;
        await db.runAsync(
          `INSERT OR IGNORE INTO companion_levels (companion_id, level, xp, is_active) VALUES (?, ?, ?, ?)`,
          [id, level, xp, isActive]
        );
      }
    }
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS companion (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      companion_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 5,
      xp INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS companion_levels (
      companion_id TEXT PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 5,
      xp INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      timestamp TEXT NOT NULL,
      rounds_completed INTEGER NOT NULL,
      max_sequence_length INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL,
      reaction_times TEXT NOT NULL,
      avg_rt REAL NOT NULL,
      best_rt INTEGER NOT NULL,
      accuracy REAL NOT NULL,
      mutations_faced TEXT NOT NULL,
      mutations_survived INTEGER NOT NULL,
      engine_lever_log TEXT NOT NULL,
      engine_intensity REAL NOT NULL,
      wm_score REAL NOT NULL,
      rt_score REAL NOT NULL,
      flex_score REAL NOT NULL,
      decision_score REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      baseline_rt REAL NOT NULL DEFAULT 450,
      wm_capacity REAL NOT NULL DEFAULT 4,
      flex_rating REAL NOT NULL DEFAULT 0.5,
      speed_accuracy_threshold REAL NOT NULL DEFAULT 350,
      session_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS engine_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      animated_background INTEGER NOT NULL DEFAULT 0,
      background_intensity REAL NOT NULL DEFAULT 1.0,
      lives INTEGER NOT NULL DEFAULT 3,
      green_tile_feedback INTEGER NOT NULL DEFAULT 1,
      haptic_feedback INTEGER NOT NULL DEFAULT 1
    );
  `);
}
