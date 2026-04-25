import {
  WAVES,
  currentWave,
  isWaveEntry,
  isBossRound,
  computeRoundScore,
  highestWaveReached,
} from '../wave';

describe('wave schedule', () => {
  it('has 6 waves in ascending index order', () => {
    expect(WAVES).toHaveLength(6);
    for (let i = 0; i < WAVES.length; i++) {
      expect(WAVES[i].index).toBe(i + 1);
    }
  });

  it('waves cover the round line continuously without gaps', () => {
    for (let i = 0; i < WAVES.length - 1; i++) {
      expect(WAVES[i].endRound + 1).toBe(WAVES[i + 1].startRound);
    }
  });

  it('the final wave is endless', () => {
    expect(WAVES[WAVES.length - 1].endRound).toBe(Number.POSITIVE_INFINITY);
  });

  it('Warmup and Building have mutations disabled', () => {
    expect(WAVES.find((w) => w.name === 'Warmup')!.mutationsEnabled).toBe(false);
    expect(WAVES.find((w) => w.name === 'Building')!.mutationsEnabled).toBe(false);
  });

  it('Storm and beyond have mutations enabled', () => {
    expect(WAVES.find((w) => w.name === 'Storm')!.mutationsEnabled).toBe(true);
    expect(WAVES.find((w) => w.name === 'Surge')!.mutationsEnabled).toBe(true);
    expect(WAVES.find((w) => w.name === 'Boss')!.mutationsEnabled).toBe(true);
  });

  it('score multiplier monotonically increases across waves', () => {
    let last = 0;
    for (const w of WAVES) {
      expect(w.scoreMultiplier).toBeGreaterThanOrEqual(last);
      last = w.scoreMultiplier;
    }
  });
});

describe('currentWave', () => {
  it('returns Warmup for round 1-5', () => {
    expect(currentWave(1).name).toBe('Warmup');
    expect(currentWave(5).name).toBe('Warmup');
  });
  it('returns Building for round 6-10', () => {
    expect(currentWave(6).name).toBe('Building');
    expect(currentWave(10).name).toBe('Building');
  });
  it('returns Peak for round 11-15', () => {
    expect(currentWave(11).name).toBe('Peak');
    expect(currentWave(15).name).toBe('Peak');
  });
  it('returns Storm for round 16-25', () => {
    expect(currentWave(16).name).toBe('Storm');
    expect(currentWave(25).name).toBe('Storm');
  });
  it('returns Surge for round 26-35', () => {
    expect(currentWave(26).name).toBe('Surge');
    expect(currentWave(35).name).toBe('Surge');
  });
  it('returns Boss for round 36 and beyond', () => {
    expect(currentWave(36).name).toBe('Boss');
    expect(currentWave(100).name).toBe('Boss');
    expect(currentWave(1000).name).toBe('Boss');
  });
  it('returns Warmup for round 0 (pre-game)', () => {
    expect(currentWave(0).name).toBe('Warmup');
  });
});

describe('isWaveEntry', () => {
  it('returns true for first round of each wave', () => {
    expect(isWaveEntry(1)).toBe(true);
    expect(isWaveEntry(6)).toBe(true);
    expect(isWaveEntry(11)).toBe(true);
    expect(isWaveEntry(16)).toBe(true);
    expect(isWaveEntry(26)).toBe(true);
    expect(isWaveEntry(36)).toBe(true);
  });
  it('returns false mid-wave', () => {
    expect(isWaveEntry(2)).toBe(false);
    expect(isWaveEntry(7)).toBe(false);
    expect(isWaveEntry(20)).toBe(false);
  });
  it('returns false for round 0', () => {
    expect(isWaveEntry(0)).toBe(false);
  });
});

describe('isBossRound', () => {
  it('returns false outside Boss wave', () => {
    expect(isBossRound(5)).toBe(false);
    expect(isBossRound(20)).toBe(false);
    expect(isBossRound(35)).toBe(false);
  });
  it('returns true at every 5th round inside Boss wave', () => {
    // Boss starts at 36; offsets 5, 10, 15... → rounds 41, 46, 51
    expect(isBossRound(36)).toBe(false);
    expect(isBossRound(40)).toBe(false); // offset 4
    expect(isBossRound(41)).toBe(true);  // offset 5
    expect(isBossRound(46)).toBe(true);  // offset 10
    expect(isBossRound(51)).toBe(true);
  });
});

describe('computeRoundScore', () => {
  it('multiplies by wave multiplier (Warmup x1.0)', () => {
    expect(computeRoundScore(100, 1, 1)).toBe(100);
  });
  it('multiplies by wave multiplier (Storm x2.0)', () => {
    expect(computeRoundScore(100, 16, 1)).toBe(200);
  });
  it('multiplies by combo multiplier', () => {
    // Peak x1.5, combo x2 → 100 * 1.5 * 2 = 300
    expect(computeRoundScore(100, 11, 2)).toBe(300);
  });
  it('boss round adds 2x bonus on top of wave + combo', () => {
    // Round 41 = Boss x5.0 * boss bonus 2.0 * combo 1 → 100 * 5 * 2 * 1 = 1000
    expect(computeRoundScore(100, 41, 1)).toBe(1000);
  });
});

describe('highestWaveReached', () => {
  it('reports Warmup if user only completed early rounds', () => {
    expect(highestWaveReached(3).name).toBe('Warmup');
  });
  it('reports the wave of the highest round completed', () => {
    expect(highestWaveReached(20).name).toBe('Storm');
    expect(highestWaveReached(50).name).toBe('Boss');
  });
});
