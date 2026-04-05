/**
 * Booster session architecture.
 *
 * The ACTIVE trial's most critical finding: speed training WITH boosters
 * reduced dementia risk by 25%, while training WITHOUT boosters did not
 * reach significance (Coe et al., 2026).
 *
 * Training phases:
 * - Foundation (sessions 1–15): Daily sessions, build baseline
 * - Sharpen (sessions 16–40): 3x/week max, targeted improvement
 * - Maintain (sessions 41+): Booster-driven, long-term retention
 *
 * Frequency cap: 3 sessions/week is optimal per Lampit et al. (2014).
 * More than 3 sessions/week actually NEUTRALIZED efficacy.
 */

export type TrainingPhase = 'foundation' | 'sharpen' | 'maintain';
export type BoosterType = 'maintenance' | 'reactivation' | 'challenge' | 'none';

const FOUNDATION_SESSIONS = 15;
const SHARPEN_SESSIONS = 40;
const MAX_SESSIONS_PER_WEEK = 3;
const REACTIVATION_GAP_DAYS = 3;

/**
 * Determines the user's current training phase based on total session count.
 */
export function getTrainingPhase(totalSessions: number): TrainingPhase {
  if (totalSessions < FOUNDATION_SESSIONS) return 'foundation';
  if (totalSessions < SHARPEN_SESSIONS) return 'sharpen';
  return 'maintain';
}

/**
 * Determines what type of booster session to offer.
 */
export function getBoosterType(
  totalSessions: number,
  daysSinceLastSession: number,
  sessionsThisWeek: number
): BoosterType {
  const phase = getTrainingPhase(totalSessions);

  // During foundation, every session is a regular training session
  if (phase === 'foundation') return 'none';

  // Reactivation booster after inactivity gap
  if (daysSinceLastSession >= REACTIVATION_GAP_DAYS) return 'reactivation';

  // Challenge booster: every 10th session in maintain phase
  if (phase === 'maintain' && totalSessions % 10 === 0) return 'challenge';

  // Regular maintenance booster in maintain phase
  if (phase === 'maintain') return 'maintenance';

  return 'none';
}

/**
 * Returns a frequency recommendation for the user.
 * Based on Lampit et al. (2014): 3 sessions/week is optimal.
 */
export function getFrequencyRecommendation(
  totalSessions: number,
  sessionsThisWeek: number
): { canTrain: boolean; message: string | null } {
  const phase = getTrainingPhase(totalSessions);

  // Foundation phase: daily training encouraged
  if (phase === 'foundation') {
    const remaining = FOUNDATION_SESSIONS - totalSessions;
    return {
      canTrain: true,
      message: remaining <= 3
        ? `${remaining} sessions left in your Foundation block`
        : null,
    };
  }

  // Sharpen/maintain: cap at 3 per week
  if (sessionsThisWeek >= MAX_SESSIONS_PER_WEEK) {
    return {
      canTrain: true, // don't block, just advise
      message: 'Research shows 3 sessions/week is optimal. Rest days help consolidation.',
    };
  }

  return { canTrain: true, message: null };
}

/**
 * Returns the difficulty scaling factor for booster sessions.
 * - Reactivation: start at 70% of normal difficulty
 * - Challenge: start at 110% of normal difficulty
 * - Maintenance: start at 90% of normal difficulty
 */
export function getBoosterDifficultyScale(boosterType: BoosterType): number {
  switch (boosterType) {
    case 'reactivation': return 0.70;
    case 'challenge': return 1.10;
    case 'maintenance': return 0.90;
    default: return 1.00;
  }
}
