import { getDb } from './database';

export interface AppSettings {
  animatedBackground: boolean;
  backgroundIntensity: number; // speed multiplier: 1 = default, 2 = 2× faster, 3 = 3× faster
}

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  animatedBackground: false,
  backgroundIntensity: 1,
};

export async function loadAppSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    animated_background: number;
    background_intensity: number;
  }>(`SELECT animated_background, background_intensity FROM app_settings WHERE id = 1`);
  if (!row) return { ...APP_SETTINGS_DEFAULTS };
  return {
    animatedBackground: row.animated_background === 1,
    backgroundIntensity: row.background_intensity ?? 1,
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (id, animated_background, background_intensity)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       animated_background = excluded.animated_background,
       background_intensity = excluded.background_intensity`,
    [settings.animatedBackground ? 1 : 0, settings.backgroundIntensity]
  );
}
