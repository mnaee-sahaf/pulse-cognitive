import {
  INITIAL_COMBO,
  COMBO_TIERS,
  applyCombo,
  activeTier,
  comboMultiplier,
  consumeShield,
} from '../combo';

describe('initial state', () => {
  it('starts at zero with no peak and no shield', () => {
    expect(INITIAL_COMBO.count).toBe(0);
    expect(INITIAL_COMBO.peakCount).toBe(0);
    expect(INITIAL_COMBO.peakLabel).toBe('');
    expect(INITIAL_COMBO.shieldAvailable).toBe(false);
    expect(INITIAL_COMBO.justBroke).toBe(false);
    expect(INITIAL_COMBO.justEntered).toBeNull();
  });
});

describe('activeTier', () => {
  it('returns the base (empty) tier at count 0', () => {
    expect(activeTier(0).threshold).toBe(0);
    expect(activeTier(0).label).toBe('');
  });
  it('returns Combo at 2', () => {
    expect(activeTier(2).label).toBe('Combo');
  });
  it('returns On Fire at 3-4', () => {
    expect(activeTier(3).label).toBe('On Fire');
    expect(activeTier(4).label).toBe('On Fire');
  });
  it('returns Untouchable at 5-9', () => {
    expect(activeTier(5).label).toBe('Untouchable');
    expect(activeTier(9).label).toBe('Untouchable');
  });
  it('returns Master at 10+', () => {
    expect(activeTier(10).label).toBe('Master');
    expect(activeTier(20).label).toBe('Master');
  });
});

describe('applyCombo — climbing', () => {
  it('increments count on perfect rounds', () => {
    let s = INITIAL_COMBO;
    s = applyCombo(s, true);
    expect(s.count).toBe(1);
    s = applyCombo(s, true);
    expect(s.count).toBe(2);
  });

  it('reports tier entry exactly once (at threshold)', () => {
    let s = INITIAL_COMBO;
    s = applyCombo(s, true); // 1, no entry
    expect(s.justEntered).toBeNull();
    s = applyCombo(s, true); // 2, enters Combo
    expect(s.justEntered?.label).toBe('Combo');
    s = applyCombo(s, true); // 3, enters On Fire
    expect(s.justEntered?.label).toBe('On Fire');
    s = applyCombo(s, true); // 4, no new tier
    expect(s.justEntered).toBeNull();
  });

  it('updates peakLabel and peakCount as we climb', () => {
    let s = INITIAL_COMBO;
    for (let i = 0; i < 5; i++) s = applyCombo(s, true);
    expect(s.count).toBe(5);
    expect(s.peakCount).toBe(5);
    expect(s.peakLabel).toBe('Untouchable');
  });

  it('grants a one-shot shield when Untouchable is reached', () => {
    let s = INITIAL_COMBO;
    for (let i = 0; i < 5; i++) s = applyCombo(s, true);
    expect(s.shieldAvailable).toBe(true);
  });

  it('only grants the shield once per run', () => {
    let s = INITIAL_COMBO;
    for (let i = 0; i < 5; i++) s = applyCombo(s, true);
    const after = consumeShield(s).next;
    expect(after.shieldAvailable).toBe(false);
    // Now break, climb back to 5, shield should not regrant
    let next = applyCombo(after, false);
    for (let i = 0; i < 5; i++) next = applyCombo(next, true);
    expect(next.shieldAvailable).toBe(false);
  });
});

describe('applyCombo — breaking', () => {
  it('resets count to 0 on a miss', () => {
    let s = INITIAL_COMBO;
    s = applyCombo(s, true);
    s = applyCombo(s, true);
    expect(s.count).toBe(2);
    s = applyCombo(s, false);
    expect(s.count).toBe(0);
  });

  it('flags justBroke for one update only on real breaks (count > 0)', () => {
    let s = INITIAL_COMBO;
    s = applyCombo(s, true);
    s = applyCombo(s, true);
    s = applyCombo(s, false);
    expect(s.justBroke).toBe(true);
    s = applyCombo(s, true);
    expect(s.justBroke).toBe(false);
  });

  it('does not flag justBroke when count was already 0', () => {
    let s = INITIAL_COMBO;
    s = applyCombo(s, false);
    expect(s.justBroke).toBe(false);
  });

  it('preserves peakLabel and peakCount after a break', () => {
    let s = INITIAL_COMBO;
    for (let i = 0; i < 6; i++) s = applyCombo(s, true);
    s = applyCombo(s, false);
    expect(s.count).toBe(0);
    expect(s.peakLabel).toBe('Untouchable');
    expect(s.peakCount).toBe(6);
  });

  it('shield survives a combo break', () => {
    let s = INITIAL_COMBO;
    for (let i = 0; i < 5; i++) s = applyCombo(s, true);
    expect(s.shieldAvailable).toBe(true);
    s = applyCombo(s, false);
    expect(s.shieldAvailable).toBe(true);
  });
});

describe('comboMultiplier', () => {
  it('is 1.0 below Combo tier', () => {
    expect(comboMultiplier({ ...INITIAL_COMBO, count: 1 })).toBe(1.0);
    expect(comboMultiplier({ ...INITIAL_COMBO, count: 2 })).toBe(1.0);
  });
  it('is 1.5 at On Fire', () => {
    expect(comboMultiplier({ ...INITIAL_COMBO, count: 3 })).toBe(1.5);
  });
  it('is 2.0 at Untouchable', () => {
    expect(comboMultiplier({ ...INITIAL_COMBO, count: 5 })).toBe(2.0);
  });
  it('is 3.0 at Master', () => {
    expect(comboMultiplier({ ...INITIAL_COMBO, count: 10 })).toBe(3.0);
  });
});

describe('consumeShield', () => {
  it('returns consumed=false if no shield', () => {
    const { consumed, next } = consumeShield(INITIAL_COMBO);
    expect(consumed).toBe(false);
    expect(next.shieldAvailable).toBe(false);
  });
  it('consumes the shield and reports true', () => {
    const armed = { ...INITIAL_COMBO, shieldAvailable: true };
    const { consumed, next } = consumeShield(armed);
    expect(consumed).toBe(true);
    expect(next.shieldAvailable).toBe(false);
  });
});

describe('COMBO_TIERS sanity', () => {
  it('thresholds are monotonically increasing', () => {
    let last = -1;
    for (const t of COMBO_TIERS) {
      expect(t.threshold).toBeGreaterThan(last);
      last = t.threshold;
    }
  });
  it('multipliers are monotonically increasing', () => {
    let last = 0;
    for (const t of COMBO_TIERS) {
      expect(t.multiplier).toBeGreaterThanOrEqual(last);
      last = t.multiplier;
    }
  });
});
