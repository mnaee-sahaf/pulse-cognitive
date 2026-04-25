import { getDb } from './database';
import type { SessionSummary, GameMode } from '../engine/gameStateMachine';
import type { LeverSettings } from '../engine/adaptiveEngine';

export interface StoredSession {
  id: number;
  sessionId: string;
  timestamp: string;
  gameMode: GameMode;
  roundsCompleted: number;
  maxSequenceLength: number;
  totalScore: number;
  reactionTimes: number[];
  avgRt: number;
  bestRt: number;
  accuracy: number;
  mutationsFaced: string[];
  mutationsSurvived: number;
  engineLeverLog: LeverSettings[];
  engineIntensity: number;
  wmScore: number;
  rtScore: number;
  flexScore: number;
  decisionScore: number;
  impulseScore: number;
}

export async function saveSession(
  summary: SessionSummary,
  leverLog: LeverSettings[],
  gameMode: GameMode = 'arc'
): Promise<void> {
  const db = await getDb();
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await db.runAsync(
    `INSERT INTO sessions (
      session_id, timestamp, game_mode, rounds_completed, max_sequence_length, total_score,
      reaction_times, avg_rt, best_rt, accuracy,
      mutations_faced, mutations_survived,
      engine_lever_log, engine_intensity,
      wm_score, rt_score, flex_score, decision_score, impulse_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      new Date().toISOString(),
      gameMode,
      summary.roundsCompleted,
      summary.maxSequenceLength,
      summary.totalScore,
      JSON.stringify(summary.allRts.map((rt) => Math.round(rt))),
      Math.round(summary.avgRt),
      Math.round(summary.bestRt),
      summary.accuracy,
      JSON.stringify(summary.mutationsFaced),
      summary.mutationsSurvived,
      JSON.stringify(leverLog),
      summary.engineIntensity,
      summary.cognitiveScores.wmScore,
      summary.cognitiveScores.rtScore,
      summary.cognitiveScores.flexScore,
      summary.cognitiveScores.decisionScore,
      summary.cognitiveScores.impulseScore,
    ]
  );
}

export async function getRecentSessions(limit = 10): Promise<StoredSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sessions ORDER BY timestamp DESC LIMIT ?`,
    [limit]
  );
  return rows.map(deserializeSession);
}

export async function getLifetimeStats(): Promise<{
  sessionCount: number;
  bestScore: number;
  bestRt: number;
  avgScore: number;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT
      COUNT(*) as session_count,
      MAX(total_score) as best_score,
      MIN(best_rt) as best_rt,
      AVG(total_score) as avg_score
    FROM sessions`
  );
  return {
    sessionCount: row?.session_count ?? 0,
    bestScore: row?.best_score ?? 0,
    bestRt: Math.round(row?.best_rt ?? 0),
    avgScore: Math.round(row?.avg_score ?? 0),
  };
}

/**
 * Returns the last N sessions' data needed to build a player profile.
 */
export async function getProfileSeedData(n = 10): Promise<{
  avgRts: number[];
  maxSequenceLengths: number[];
  accuracies: number[];
  flexRatings: number[];
}> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT avg_rt, rounds_completed, max_sequence_length, accuracy, mutations_faced, mutations_survived
     FROM sessions ORDER BY timestamp DESC LIMIT ?`,
    [n]
  );

  return {
    avgRts: rows.map((r: any) => r.avg_rt),
    maxSequenceLengths: rows.map((r: any) => r.max_sequence_length || r.rounds_completed + 2),
    accuracies: rows.map((r: any) => r.accuracy),
    flexRatings: rows.map((r: any) => {
      const faced = JSON.parse(r.mutations_faced).length;
      return faced === 0 ? 0.5 : r.mutations_survived / faced;
    }),
  };
}

/**
 * Returns rolling average cognitive scores from recent sessions.
 */
export async function getCognitiveProfile(n = 10): Promise<{
  rtScore: number;
  wmScore: number;
  flexScore: number;
  decisionScore: number;
  impulseScore: number;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT
      AVG(rt_score) as rt, AVG(wm_score) as wm,
      AVG(flex_score) as flex, AVG(decision_score) as decision,
      AVG(impulse_score) as impulse
     FROM (SELECT rt_score, wm_score, flex_score, decision_score, impulse_score
           FROM sessions ORDER BY timestamp DESC LIMIT ?)`,
    [n]
  );
  return {
    rtScore: Math.round(row?.rt ?? 0),
    wmScore: Math.round(row?.wm ?? 0),
    flexScore: Math.round(row?.flex ?? 0),
    decisionScore: Math.round(row?.decision ?? 0),
    impulseScore: Math.round(row?.impulse ?? 50),
  };
}

function deserializeSession(row: any): StoredSession {
  return {
    id: row.id,
    sessionId: row.session_id,
    timestamp: row.timestamp,
    gameMode: (row.game_mode ?? 'arc') as GameMode,
    roundsCompleted: row.rounds_completed,
    maxSequenceLength: row.max_sequence_length ?? 0,
    totalScore: row.total_score,
    reactionTimes: JSON.parse(row.reaction_times),
    avgRt: row.avg_rt,
    bestRt: row.best_rt,
    accuracy: row.accuracy,
    mutationsFaced: JSON.parse(row.mutations_faced),
    mutationsSurvived: row.mutations_survived,
    engineLeverLog: JSON.parse(row.engine_lever_log),
    engineIntensity: row.engine_intensity,
    wmScore: row.wm_score,
    rtScore: row.rt_score,
    flexScore: row.flex_score,
    decisionScore: row.decision_score,
    impulseScore: row.impulse_score ?? 50,
  };
}
