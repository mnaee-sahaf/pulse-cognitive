import { getDb } from './database';

export interface AppSettings {
  animatedBackground: boolean;
}

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  animatedBackground: false,
};

export async function loadAppSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ animated_background: number }>(
    `SELECT animated_background FROM app_settings WHERE id = 1`
  );
  if (!row) return { ...APP_SETTINGS_DEFAULTS };
  return { animatedBackground: row.animated_background === 1 };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (id, animated_background)
     VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET animated_background = excluded.animated_background`,
    [settings.animatedBackground ? 1 : 0]
  );
}
