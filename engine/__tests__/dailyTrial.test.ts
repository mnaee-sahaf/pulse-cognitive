import {
  hashString,
  assignTrial,
  formatDate,
  isoWeek,
  daysBetween,
  applyDailyCompletion,
  EMPTY_STREAK,
  type DailyStreakState,
} from '../dailyTrial';

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
  });
  it('returns different values for different strings', () => {
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
  it('always returns a non-negative integer', () => {
    for (const s of ['', 'x', '2026-04-25', 'a longer string']) {
      const h = hashString(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(h)).toBe(true);
    }
  });
});

describe('assignTrial', () => {
  it('returns the same assignment for the same date', () => {
    const a = assignTrial('2026-04-25');
    const b = assignTrial('2026-04-25');
    expect(a).toEqual(b);
  });
  it('returns different modes for different dates (eventually)', () => {
    const modes = new Set<string>();
    for (let i = 1; i <= 30; i++) {
      const date = `2026-04-${String(i).padStart(2, '0')}`;
      modes.add(assignTrial(date).mode);
    }
    expect(modes.size).toBeGreaterThan(1);
  });
  it('mode is one of the four allowed', () => {
    expect(['arc', 'tide', 'ember', 'halt']).toContain(assignTrial('2026-04-25').mode);
  });
  it('different salts produce different assignments', () => {
    const a = assignTrial('2026-04-25', 'salt1');
    const b = assignTrial('2026-04-25', 'salt2');
    expect(a).not.toEqual(b);
  });
});

describe('formatDate', () => {
  it('formats with leading zeros', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('isoWeek', () => {
  it('returns YYYY-Www format', () => {
    const w = isoWeek(new Date('2026-04-25T12:00:00Z'));
    expect(w).toMatch(/^\d{4}-W\d{2}$/);
  });
  it('Mon and Sun of same ISO week return same week id', () => {
    const monday = isoWeek(new Date('2026-04-20T12:00:00Z'));
    const sunday = isoWeek(new Date('2026-04-26T12:00:00Z'));
    expect(monday).toBe(sunday);
  });
});

describe('daysBetween', () => {
  it('returns 1 for consecutive days', () => {
    expect(daysBetween('2026-04-24', '2026-04-25')).toBe(1);
  });
  it('returns 0 for same day', () => {
    expect(daysBetween('2026-04-25', '2026-04-25')).toBe(0);
  });
  it('returns negative for backwards', () => {
    expect(daysBetween('2026-04-25', '2026-04-24')).toBe(-1);
  });
  it('handles month boundaries', () => {
    expect(daysBetween('2026-03-31', '2026-04-02')).toBe(2);
  });
});

describe('applyDailyCompletion', () => {
  it('first completion sets streak=1', () => {
    const next = applyDailyCompletion(EMPTY_STREAK, '2026-04-25');
    expect(next.currentStreak).toBe(1);
    expect(next.bestStreak).toBe(1);
    expect(next.lastCompletedDate).toBe('2026-04-25');
  });

  it('same-day re-record is a no-op', () => {
    const after = applyDailyCompletion(EMPTY_STREAK, '2026-04-25');
    const again = applyDailyCompletion(after, '2026-04-25');
    expect(again).toEqual(after);
  });

  it('consecutive days increment streak', () => {
    let s: DailyStreakState = applyDailyCompletion(EMPTY_STREAK, '2026-04-25');
    s = applyDailyCompletion(s, '2026-04-26');
    s = applyDailyCompletion(s, '2026-04-27');
    expect(s.currentStreak).toBe(3);
    expect(s.bestStreak).toBe(3);
  });

  it('missed one day uses the weekly shield (streak continues)', () => {
    let s = applyDailyCompletion(EMPTY_STREAK, '2026-04-20'); // Mon
    s = applyDailyCompletion(s, '2026-04-21');                // Tue
    s = applyDailyCompletion(s, '2026-04-23');                // Thu
    expect(s.currentStreak).toBe(3);
    expect(s.shieldConsumedForWeek).toBeTruthy();
  });

  it('shield only saves once per ISO week', () => {
    let s = applyDailyCompletion(EMPTY_STREAK, '2026-04-20');
    s = applyDailyCompletion(s, '2026-04-22'); // shield used
    expect(s.currentStreak).toBe(2);
    s = applyDailyCompletion(s, '2026-04-24'); // shield gone → break
    expect(s.currentStreak).toBe(1);
  });

  it('missed >1 day always breaks streak', () => {
    let s = applyDailyCompletion(EMPTY_STREAK, '2026-04-20');
    s = applyDailyCompletion(s, '2026-04-23'); // 3-day gap
    expect(s.currentStreak).toBe(1);
  });

  it('best streak is preserved across breaks', () => {
    let s = applyDailyCompletion(EMPTY_STREAK, '2026-04-01');
    for (let i = 2; i <= 4; i++) {
      s = applyDailyCompletion(s, `2026-04-0${i}`);
    }
    expect(s.bestStreak).toBe(4);
    s = applyDailyCompletion(s, '2026-04-10'); // big gap
    expect(s.currentStreak).toBe(1);
    expect(s.bestStreak).toBe(4);
  });
});
