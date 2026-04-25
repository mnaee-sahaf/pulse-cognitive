import {
  getTrainingPhase,
  getBoosterType,
  getFrequencyRecommendation,
  getBoosterDifficultyScale,
} from '../boosterEngine';

// ── getTrainingPhase ──

describe('getTrainingPhase', () => {
  it('returns "foundation" for sessions 0–14', () => {
    expect(getTrainingPhase(0)).toBe('foundation');
    expect(getTrainingPhase(14)).toBe('foundation');
  });

  it('returns "sharpen" for sessions 15–39', () => {
    expect(getTrainingPhase(15)).toBe('sharpen');
    expect(getTrainingPhase(39)).toBe('sharpen');
  });

  it('returns "maintain" for sessions 40+', () => {
    expect(getTrainingPhase(40)).toBe('maintain');
    expect(getTrainingPhase(200)).toBe('maintain');
  });
});

// ── getBoosterType ──

describe('getBoosterType', () => {
  it('returns "none" during foundation phase', () => {
    expect(getBoosterType(5, 1, 2)).toBe('none');
  });

  it('returns "reactivation" after 3+ day gap regardless of phase', () => {
    expect(getBoosterType(20, 3, 0)).toBe('reactivation');
    expect(getBoosterType(50, 5, 0)).toBe('reactivation');
  });

  it('returns "challenge" every 10th session in maintain', () => {
    expect(getBoosterType(50, 1, 1)).toBe('challenge');
    expect(getBoosterType(60, 1, 1)).toBe('challenge');
  });

  it('returns "maintenance" for regular maintain sessions', () => {
    expect(getBoosterType(41, 1, 1)).toBe('maintenance');
    expect(getBoosterType(43, 1, 2)).toBe('maintenance');
  });

  it('returns "none" in sharpen phase without gap', () => {
    expect(getBoosterType(20, 1, 2)).toBe('none');
  });

  it('prioritizes reactivation over challenge', () => {
    // Session 50 (challenge-eligible) but 4-day gap → reactivation wins
    expect(getBoosterType(50, 4, 0)).toBe('reactivation');
  });
});

// ── getFrequencyRecommendation ──

describe('getFrequencyRecommendation', () => {
  it('always allows training in foundation', () => {
    const result = getFrequencyRecommendation(5, 5);
    expect(result.canTrain).toBe(true);
  });

  it('shows remaining sessions message when close to end of foundation', () => {
    const result = getFrequencyRecommendation(13, 2);
    expect(result.message).toContain('2 sessions left');
  });

  it('no message in early foundation', () => {
    const result = getFrequencyRecommendation(3, 1);
    expect(result.message).toBeNull();
  });

  it('warns when at 3+ sessions/week in sharpen phase', () => {
    const result = getFrequencyRecommendation(20, 3);
    expect(result.canTrain).toBe(true);
    expect(result.message).toContain('3 sessions/week is optimal');
  });

  it('no message when under weekly cap', () => {
    const result = getFrequencyRecommendation(20, 2);
    expect(result.message).toBeNull();
  });
});

// ── getBoosterDifficultyScale ──

describe('getBoosterDifficultyScale', () => {
  it('returns 0.70 for reactivation', () => {
    expect(getBoosterDifficultyScale('reactivation')).toBe(0.70);
  });

  it('returns 1.10 for challenge', () => {
    expect(getBoosterDifficultyScale('challenge')).toBe(1.10);
  });

  it('returns 0.90 for maintenance', () => {
    expect(getBoosterDifficultyScale('maintenance')).toBe(0.90);
  });

  it('returns 1.00 for none', () => {
    expect(getBoosterDifficultyScale('none')).toBe(1.00);
  });
});
