import { getDb } from './database';

export interface WeeklyReport {
  weekStarting: string;           // YYYY-MM-DD (Monday)
  sessionsThisWeek: number;
  sessionsLastWeek: number;
  avgRtThisWeek: number;
  avgRtLastWeek: number;
  avgScoreThisWeek: number;
  avgScoreLastWeek: number;
  rtScoreThisWeek: number;
  rtScoreLastWeek: number;
  wmScoreThisWeek: number;
  wmScoreLastWeek: number;
  flexScoreThisWeek: number;
  flexScoreLastWeek: number;
  decisionScoreThisWeek: number;
  decisionScoreLastWeek: number;
  bestRoundThisWeek: number;
}

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

function prevMonday(monday: string): string {
  const d = new Date(monday);
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function trendArrow(current: number, previous: number): string {
  if (previous === 0) return '';
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (Math.abs(pct) < 2) return '\u2192'; // →
  return pct > 0 ? `\u2191${pct}%` : `\u2193${Math.abs(pct)}%`; // ↑ or ↓
}

/**
 * Lower RT is better, so invert the trend for display
 */
export function rtTrendArrow(current: number, previous: number): string {
  if (previous === 0) return '';
  const diff = previous - current; // inverted: lower is better
  const pct = Math.round((diff / previous) * 100);
  if (Math.abs(pct) < 2) return '\u2192';
  return pct > 0 ? `\u2191${pct}%` : `\u2193${Math.abs(pct)}%`;
}

async function weekStats(weekStart: string): Promise<{
  sessions: number;
  avgRt: number;
  avgScore: number;
  rtScore: number;
  wmScore: number;
  flexScore: number;
  decisionScore: number;
  bestRound: number;
}> {
  const db = await getDb();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const endStr = weekEnd.toISOString().slice(0, 10);

  const row = await db.getFirstAsync<any>(
    `SELECT
      COUNT(*) as cnt,
      COALESCE(AVG(avg_rt), 0) as avg_rt,
      COALESCE(AVG(total_score), 0) as avg_score,
      COALESCE(AVG(rt_score), 0) as rt_score,
      COALESCE(AVG(wm_score), 0) as wm_score,
      COALESCE(AVG(flex_score), 0) as flex_score,
      COALESCE(AVG(decision_score), 0) as decision_score,
      COALESCE(MAX(rounds_completed), 0) as best_round
     FROM sessions
     WHERE timestamp >= ? AND timestamp < ?`,
    [weekStart, endStr]
  );

  return {
    sessions: row?.cnt ?? 0,
    avgRt: Math.round(row?.avg_rt ?? 0),
    avgScore: Math.round(row?.avg_score ?? 0),
    rtScore: Math.round(row?.rt_score ?? 0),
    wmScore: Math.round(row?.wm_score ?? 0),
    flexScore: Math.round(row?.flex_score ?? 0),
    decisionScore: Math.round(row?.decision_score ?? 0),
    bestRound: row?.best_round ?? 0,
  };
}

export async function generateWeeklyReport(): Promise<WeeklyReport | null> {
  const thisMonday = getMonday(new Date());
  const lastMonday = prevMonday(thisMonday);

  const thisWeek = await weekStats(thisMonday);
  const lastWeek = await weekStats(lastMonday);

  // Only generate if there are sessions this week or last week
  if (thisWeek.sessions === 0 && lastWeek.sessions === 0) return null;

  return {
    weekStarting: thisMonday,
    sessionsThisWeek: thisWeek.sessions,
    sessionsLastWeek: lastWeek.sessions,
    avgRtThisWeek: thisWeek.avgRt,
    avgRtLastWeek: lastWeek.avgRt,
    avgScoreThisWeek: thisWeek.avgScore,
    avgScoreLastWeek: lastWeek.avgScore,
    rtScoreThisWeek: thisWeek.rtScore,
    rtScoreLastWeek: lastWeek.rtScore,
    wmScoreThisWeek: thisWeek.wmScore,
    wmScoreLastWeek: lastWeek.wmScore,
    flexScoreThisWeek: thisWeek.flexScore,
    flexScoreLastWeek: lastWeek.flexScore,
    decisionScoreThisWeek: thisWeek.decisionScore,
    decisionScoreLastWeek: lastWeek.decisionScore,
    bestRoundThisWeek: thisWeek.bestRound,
  };
}
