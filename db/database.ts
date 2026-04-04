import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('pulse.db');
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  // Add columns introduced after initial schema — safe to run on every startup
  await db.execAsync(
    `ALTER TABLE app_settings ADD COLUMN background_intensity REAL NOT NULL DEFAULT 1.0`
  ).catch(() => {}); // column already exists on new installs — ignore

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS companion (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      companion_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 5,
      xp INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      timestamp TEXT NOT NULL,
      rounds_completed INTEGER NOT NULL,
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
      background_intensity REAL NOT NULL DEFAULT 1.0
    );
  `);
}
