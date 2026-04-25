import type { EngineState } from './adaptiveEngine';

/**
 * Player-facing description of the most recent engine decision.
 * Returns null if the branch doesn't carry a meaningful message
 * (e.g. very short sessions where no real adaptation happened).
 */
export function describeEngineDecision(state: EngineState): string | null {
  if (state.isCalibration) {
    return "First session — we're watching how you play to set the right pace next time.";
  }
  switch (state.lastBranch) {
    case 'accel-all':
      return 'You were fast and accurate — we sped up flashes, grew sequences, and added complexity.';
    case 'push-tempo':
      return 'Accuracy was high; we sped up flashes to push your reaction time.';
    case 'steady-push':
      return 'Solid round — turning up the heat with longer sequences and faster pacing.';
    case 'warmup-calibrate-fast':
      return 'Quick start! The engine ramped up tempo and added variation.';
    case 'warmup-calibrate-ok':
      return 'Good warm-up — sequences will grow as you settle in.';
    case 'warmup-calibrate-slow':
      return 'Easing you in — gentle ramp so accuracy stays high.';
    case 'warmup':
      return 'Warming up — the engine is observing your pace.';
    case 'zpd-hold':
      return "You're in the zone (80–90% accuracy). Holding difficulty steady.";
    case 'zpd-plateau-break':
      return "You've mastered this difficulty — nudging up the complexity.";
    case 'zpd-recovery-ramp':
      return 'Recovered well from a tough round — pushing forward again.';
    case 'overwhelm':
      return 'Last few rounds were heavy — easing back to rebuild rhythm.';
    case 'overwhelm-recovery':
      return 'Strong comeback round — climbing back to your level.';
    case 'init':
    case 'none':
    default:
      return null;
  }
}

/**
 * One-line preview of what next session will look like, based on the engine
 * state at end of this session. Surfaces the levers the player will encounter.
 */
export function describeNextSessionPreview(state: EngineState): string {
  if (state.isCalibration) {
    return 'Next session unlocks adaptive difficulty tuned to your baseline.';
  }
  const { levers, currentFlashDuration } = state;
  const parts: string[] = [];
  parts.push(`flashes ~${Math.round(currentFlashDuration)}ms`);
  if (levers.gridSize > 3) parts.push(`${levers.gridSize}×${levers.gridSize} grid`);
  if (levers.mutationRate >= 0.1) {
    parts.push(`mutations ~${Math.round(levers.mutationRate * 100)}%`);
  } else {
    parts.push('no mutations yet');
  }
  return parts.join(' · ');
}
