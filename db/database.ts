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
    DELETE FROM purchase_state;
    DELETE FROM streak_state;
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

  // Phase 1 redesign migrations
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN game_mode TEXT NOT NULL DEFAULT 'arc'`).catch(() => {});
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN impulse_score REAL NOT NULL DEFAULT 50`).catch(() => {});

  // Sprint 2: first-session calibration flag
  await db.execAsync(`ALTER TABLE player_profile ADD COLUMN calibrated INTEGER NOT NULL DEFAULT 0`).catch(() => {});

  // v2: demographic profile (age band + sex) for percentile vs population norms
  await db.execAsync(`ALTER TABLE player_profile ADD COLUMN age_band TEXT`).catch(() => {});
  await db.execAsync(`ALTER TABLE player_profile ADD COLUMN sex TEXT`).catch(() => {});

  // v2: per-dimension theta reached (raw staircase output) on each session
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN theta_wm REAL`).catch(() => {});
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN theta_speed REAL`).catch(() => {});
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN theta_inhibition REAL`).catch(() => {});
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN theta_flex REAL`).catch(() => {});
  await db.execAsync(`ALTER TABLE sessions ADD COLUMN theta_attention REAL`).catch(() => {});

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
      const companionIds = ['arc', 'tide', 'ember', 'halt'];
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
      game_mode TEXT NOT NULL DEFAULT 'arc',
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
      decision_score REAL NOT NULL,
      impulse_score REAL NOT NULL DEFAULT 50,
      theta_wm REAL,
      theta_speed REAL,
      theta_inhibition REAL,
      theta_flex REAL,
      theta_attention REAL
    );

    CREATE TABLE IF NOT EXISTS player_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      baseline_rt REAL NOT NULL DEFAULT 450,
      wm_capacity REAL NOT NULL DEFAULT 4,
      flex_rating REAL NOT NULL DEFAULT 0.5,
      speed_accuracy_threshold REAL NOT NULL DEFAULT 350,
      session_count INTEGER NOT NULL DEFAULT 0,
      calibrated INTEGER NOT NULL DEFAULT 0,
      age_band TEXT,
      sex TEXT,
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

    CREATE TABLE IF NOT EXISTS purchase_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      free_companion_id TEXT NOT NULL DEFAULT 'arc',
      full_unlock INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS streak_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      last_session_date TEXT,
      frozen INTEGER NOT NULL DEFAULT 0
    );

    -- v2: per-dimension RCI baselines and monthly checkpoints.
    -- One row per (dimension, type) snapshot. baseline is locked once,
    -- monthly snapshots accumulate.
    CREATE TABLE IF NOT EXISTS checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dimension_id TEXT NOT NULL,
      checkpoint_type TEXT NOT NULL,    -- 'baseline' | 'monthly'
      locked_at TEXT NOT NULL,          -- ISO timestamp
      mean REAL NOT NULL,
      sd REAL NOT NULL,
      n INTEGER NOT NULL,
      UNIQUE(dimension_id, checkpoint_type, locked_at)
    );

    -- v2: daily trial — Wordle-style return mechanic.
    -- One row per calendar date (YYYY-MM-DD).
    CREATE TABLE IF NOT EXISTS daily_trials (
      date TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      seed INTEGER NOT NULL,
      attempted_at TEXT,
      completed_at TEXT,
      wave_reached INTEGER,
      total_score INTEGER
    );

    -- v2: daily trial streak with weekly shield.
    CREATE TABLE IF NOT EXISTS daily_trial_streak (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      last_completed_date TEXT,
      shield_consumed_for_week TEXT
    );
  `);
}
