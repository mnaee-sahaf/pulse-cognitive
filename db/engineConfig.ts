import { getDb } from './database';
import { ENGINE_CONFIG_DEFAULTS, type EngineConfig } from '../engine/engineConfig';

export async function loadEngineConfig(): Promise<EngineConfig> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ config_json: string }>(
    `SELECT config_json FROM engine_config WHERE id = 1`
  );
  if (!row) return { ...ENGINE_CONFIG_DEFAULTS };
  try {
    const parsed = JSON.parse(row.config_json);
    // Merge with defaults so any newly added keys get their default value
    return { ...ENGINE_CONFIG_DEFAULTS, ...parsed };
  } catch {
    return { ...ENGINE_CONFIG_DEFAULTS };
  }
}

export async function saveEngineConfig(config: EngineConfig): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO engine_config (id, config_json)
     VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json`,
    [JSON.stringify(config)]
  );
}
