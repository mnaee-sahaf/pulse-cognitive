import { getDb } from './database';

export interface AppSettings {
  animatedBackground: boolean;
  backgroundIntensity: number;
  lives: number;
  greenTileFeedback: boolean;
  hapticFeedback: boolean;
}

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  animatedBackground: false,
  backgroundIntensity: 1,
  lives: 3,
  greenTileFeedback: true,
  hapticFeedback: true,
};

export async function loadAppSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    animated_background: number;
    background_intensity: number;
    lives: number;
    green_tile_feedback: number;
    haptic_feedback: number;
  }>(`SELECT animated_background, background_intensity, lives, green_tile_feedback, haptic_feedback
      FROM app_settings WHERE id = 1`);
  if (!row) return { ...APP_SETTINGS_DEFAULTS };
  return {
    animatedBackground: row.animated_background === 1,
    backgroundIntensity: row.background_intensity ?? 1,
    lives: row.lives ?? 3,
    greenTileFeedback: row.green_tile_feedback !== 0,
    hapticFeedback: row.haptic_feedback !== 0,
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (id, animated_background, background_intensity, lives, green_tile_feedback, haptic_feedback)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       animated_background    = excluded.animated_background,
       background_intensity   = excluded.background_intensity,
       lives                  = excluded.lives,
       green_tile_feedback    = excluded.green_tile_feedback,
       haptic_feedback        = excluded.haptic_feedback`,
    [
      settings.animatedBackground ? 1 : 0,
      settings.backgroundIntensity,
      settings.lives,
      settings.greenTileFeedback ? 1 : 0,
      settings.hapticFeedback ? 1 : 0,
    ]
  );
}
