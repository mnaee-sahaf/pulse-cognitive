# Pulse v2 — Redesign Brief

> Working draft. Status: proposed. Author: Muneeb + Claude. Date: 2026-04-25.

---

## Why we're redesigning

Tested v1 on device. The verdict: *weak*. Five concrete problems:

1. **No felt difficulty** — sessions feel constant; no visible escalation.
2. **The adaptive engine isn't alive** — the math runs, but the player never *sees* the engine react.
3. **Dopamine loop is missing** — no micro-rewards, no satisfying ratchet, no level-up moment.
4. **Metrics feel pointless and made up** — "Pulse Index 68" is abstract; players can't verify what it means.
5. **No return pressure** — nothing demands tomorrow.

The v1 audit identified the math was correct but psychologically invisible. v1 tried to fix this with calibration + a transparency card on results. That helped marginally. It is not enough. The core loop itself needs to change.

---

## The v2 idea, in one paragraph

**Each session is an endless cognitive run that escalates in visible waves until you fail.** You can see exactly how hard it's getting, the engine speaks aloud as it adapts, every perfect round builds a combo, and the only way to win is to push your personal high score. A daily trial gates one shot per day at a special leaderboard-eligible run. Your companion levels up from XP earned across runs. Metrics are concrete, verifiable records: highest wave, trials won, boss rounds survived, daily streak.

This is *Vampire Survivors meets Wordle meets Lumosity*. Endless escalation in the moment, daily scarcity for return, real records that climb.

---

## The five mechanics

### 1. Visible Waves (fixes "no felt difficulty")

A run is divided into named waves. Each wave entry is a hard cut with a banner, sound, and haptic.

| Wave | Name        | What changes                                          |
|------|-------------|-------------------------------------------------------|
| 1    | Warmup      | 3-cell sequences, 600ms flash, no mutations           |
| 2    | Building    | Sequences grow, flash speeds                          |
| 3    | Peak        | Sequences at WM ceiling, flash near floor             |
| 4    | Storm       | Mutations unlocked (mirror/reverse/poison)            |
| 5    | Surge       | Combined: max sequence + max speed + frequent muts    |
| 6+   | Boss        | All-on; gauntlet; only ~5% reach                      |

Wave entry is a *moment*. "WAVE 4 — STORM" appears full-screen for 800ms. Players know exactly how far they got and what's next.

### 2. The Engine Speaks (fixes "engine doesn't feel alive")

The engine becomes a visible character, not a silent algorithm. After each round, a quick on-screen line:

- *"Reading your speed…"* (calibration)
- *"Tempo +10%"* (push)
- *"You're rolling — surge incoming."* (about to escalate)
- *"Heavy round. Easing back."* (overwhelm)
- *"Mutation locked in."* (mutation queued for next round)

These are **derived from the actual `lastBranch`** in `engineInsight.ts`. The work from v1 isn't wasted — we just promote it from results-screen footnote to *in-session voice*.

### 3. Combos (fixes "dopamine loop")

Perfect rounds in a row build a combo. Combo counter visible top-right.

| Combo | Effect                                                  |
|-------|---------------------------------------------------------|
| x2    | "Combo x2!" badge                                       |
| x3    | "On Fire" — score multiplier 1.5x, screen edges glow    |
| x5    | "Untouchable" — score multiplier 2x, mutation shield    |
| x10   | "Master" — score multiplier 3x, halo on companion       |

Resets on a wrong tap or timeout. **Loud feedback when broken.** The dopamine asymmetry is the point — small reward to climb, sharp loss to fall — keeps the loop alive.

### 4. Daily Trial (fixes "no return pressure")

One mode rotates as the **Trial of the Day**. Same seed for everyone (deterministic from date). One official run per player per day; practice mode unlimited.

- Daily Trial result is recorded with a date stamp.
- Clearing the daily trial maintains a streak. Missing a day breaks it.
- After a 7-day streak: weekly cosmetic for companion (a new color, a new accessory).
- After 30-day streak: permanent companion evolution path unlocked.
- Streak shield once per week (Duolingo pattern; allows one missed day).

This is the single most important addition. Wordle works because of this exact mechanic.

### 5. Concrete Records (fixes "metrics feel pointless")

Replace abstract scores with verifiable records, per mode:

| Old (abstract)          | New (concrete)                              |
|-------------------------|---------------------------------------------|
| Pulse Index 68          | Highest Wave: 7 (ARC) — set 3 days ago      |
| Cognitive Profile bars  | Trials Won: 47 (across all modes)           |
| Engine Intensity 75%    | Boss Rounds Survived: 4                     |
| Avg Score 1240          | Best Run: 2,847 — Wave 8, ARC, 4-day streak |

These are records that *climb*. They mean something specific. They cannot feel made-up because they are observable in-session.

---

## Session anatomy

```
Session ─→ Wave 1 ─→ Wave 2 ─→ Wave 3 ─→ ... ─→ Failure (or quit)
            │           │           │
            └─ Round    └─ Round    └─ Round
                         · combo +1 · combo +1
                         · engine voice line
                         · score with multiplier
```

A run ends on failure (wrong tap or timeout). Time-limited mode (60s) becomes a separate "Quick Drill" option for habit-pressed players. **Default mode is endless.**

---

## Daily / weekly anatomy

- **Daily**: trial of the day (one mode), one shot, deterministic seed.
- **Weekly cycle**: 7 trials = streak reward (cosmetic).
- **Monthly**: 30-day streak unlocks evolved companion form.

---

## What we keep from v1

- DB layer (`db/`) — schema, sessions, profile, companion, weekly report.
- Theme tokens (`constants/theme.ts`) — Pressed, Easing, Shadow, radii.
- Components — `Cell`, `Grid`, `Companion`, `CompanionSwitcher`, `LevelUpModal`, `ErrorBoundary`.
- Adaptive engine math (`engine/adaptiveEngine.ts`) — levers stay; we drive *waves* off lever values rather than letting them drift continuously.
- Engine insight (`engine/engineInsight.ts`) — promoted from results card to in-session voice.
- Legal/about screens, accessibility labels, app.json fixes — keep all the v1 compliance work.
- Sequence + scoring math (`engine/sequenceGenerator.ts`, `engine/scoring.ts`).
- Calibration first-session — keep, but rename to "Reading the Player" and make it visible.

## What we rebuild

- **Game loop** — `app/game.tsx` becomes a wave-driven loop instead of a 60-second time-limited one.
- **Results screen** — `app/results.tsx` becomes a "Run Summary" with wave reached, records broken, daily-trial result.
- **Home screen** — `app/index.tsx` leads with **Highest Wave per mode** + **Today's Trial** card + streak.
- **Engine layer** — new `engine/wave.ts` module that maps lever state → current wave name + entry conditions.
- **Combo logic** — new `engine/combo.ts` (pure function over recent round results).
- **Daily trial** — new `db/dailyTrial.ts` (date → mode + seed; record per-day result; streak math).
- **Voice** — new `components/EngineVoice.tsx` overlay showing engine lines mid-session.

## What we drop

- The 60-second hard timer as the *default* mode (becomes optional Quick Drill).
- Pulse Index as the hero metric (replaced by Highest Wave per mode).
- The cognitive radar on home (moved to a "Profile" sub-screen for stat nerds; not the hero).
- Generic streak counter without stakes (replaced by Daily Trial streak with cosmetic rewards).

---

## Alternatives I considered

**Daily Drill (Wordle-for-cognitive)** — three deterministic 90-second drills per day. Strongest on return pressure but weakest on in-the-moment dopamine. Boring for power users.

**The Climb (pure roguelite)** — same wave structure but framed as floors of a tower with permadeath aesthetic. Stronger fantasy but heavier art investment. Considered: would land in v2.1 if mascot/illustration budget arrives.

**Pulse Trials (recommended)** — what's above. Hybrid: endless run loop + daily scarcity + concrete records + visible engine voice. Hits all 5 pain points without requiring new art.

---

## Implementation phases (4-week v2 plan)

**Week 1 — Skeleton**
- Fresh branch `feat/v2-trials` off `main`.
- Cherry-pick v1's correctness fixes (RT calc, dead-code removal, legal screens, accessibility, error boundary, app.json, theme tokens).
- New modules: `engine/wave.ts`, `engine/combo.ts`, `db/dailyTrial.ts`, `components/EngineVoice.tsx`.
- New game loop in `app/game.tsx`: wave-driven, endless, fail-on-mistake.

**Week 2 — Feel**
- Wave-entry banners with sound + haptic.
- Combo HUD + multipliers + screen-edge glow.
- Engine voice lines triggered off `lastBranch`.
- Companion reactions to wave milestones.

**Week 3 — Daily**
- Daily Trial flow: seeded run, date-locked, one-shot.
- Streak math + cosmetic rewards.
- Home screen redesign: Today's Trial card + Highest Wave records + streak.
- Run-summary results screen with shareable card.

**Week 4 — Polish**
- Sound design pass (wave entry, combo break, level up, mutation incoming).
- Accessibility re-pass (wave banners need screen-reader text).
- App Store assets refresh: screenshots showing Wave 5, Combo x10, Daily Trial.
- TestFlight beta.

---

## Open questions

1. **Endless or capped?** Endless reads as more thrilling; capped (e.g. Wave 12 = win) reads as more achievable. I lean endless with a "Survivor" badge at Wave 10. Confirm preference.
2. **Sound design** — willing to commission a small sound pack ($100–300 on Splice/Soundsnap)? Strong sound is half of the dopamine.
3. **Daily Trial seeding** — pure deterministic seed is fairest but means everyone gets the same drill. OK with that, or want per-player seed? Pure deterministic is what makes Wordle work.
4. **Mode count for v2 launch** — keep all 4 modes (ARC, Tide, Ember, HALT) or simplify to 1 mode for the first v2 release and add modes in v2.1? I'd lean: ship with all 4; the wave system gives variety without needing new modes.
5. **Companion role** — purely cosmetic (XP / evolutions / cosmetics)? Or active mechanical role (e.g. companion offers a "shield" once per run)? I'd lean cosmetic for v2; mechanical risks bloat.

---

## Recommendation

Take **Pulse Trials**. It's the only direction that hits all five pain points without requiring new art assets. The math from v1 isn't wasted; it gets promoted into a louder, more visible engine. The 4-week plan above is realistic.

If you confirm, I'll:
1. Create branch `feat/v2-trials` off `main`.
2. Cherry-pick the v1 correctness/compliance commits (the work that survives).
3. Start Week 1: scaffold `engine/wave.ts`, `engine/combo.ts`, the new game loop.
4. Update `docs/progress.md` to reflect the v2 plan.
