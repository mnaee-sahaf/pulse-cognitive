# Pulse — Gameplay Tuning Plan

> Diagnosis + fix plan for "too fast, too soon" feel. Covers root causes, specific code changes, and test checkpoints.

---

## Problem Statement

The game accelerates too aggressively from the first round. Players hit an overwhelming pace before they've learned the pattern. The engine's "ease back" decision has no effect because the tempo model is broken at a fundamental level.

---

## Root Cause #1 — Tempo Accumulation Bug (Critical)

**File:** `engine/gameStateMachine.ts:91`

```ts
function calcFlashDuration(roundCount: number, tempoRamp: number): number {
  const duration = INITIAL_FLASH_DURATION + tempoRamp * roundCount;
  return Math.max(300, duration);
}
```

**Why this is broken:**

`tempoRamp` is always a negative number (e.g. `-20`, `-15`, `-30`). The formula multiplies it by `roundCount`, so flash duration decreases by `|tempoRamp|` every single round — no matter what the engine decides.

When the engine "eases back" to `-15ms`, the *rate of acceleration* drops, but the game is still getting faster every round. There is no way for the engine to hold tempo steady or slow back down.

**Example with DEFAULT_LEVERS (tempoRamp = -20):**

| Round | Flash Duration |
|-------|---------------|
| 1     | 580ms         |
| 5     | 500ms         |
| 10    | 400ms         |
| 15    | 300ms (floor) |

The game hits max speed in 15 rounds regardless of how the player performs.

**The fix — accumulation model:**

Store `currentFlashDuration` in `EngineState`. Each round, `tempoRamp` acts as a *delta* applied to the current value. A positive `tempoRamp` slows back down. The engine's ease-back branch sets `tempoRamp = +30` to give the player breathing room.

**Changes required:**

1. Add `currentFlashDuration: number` to `EngineState`
2. Initialize it to `INITIAL_FLASH_DURATION` (600ms) in `initEngine()`
3. In `updateEngine()`, at the end: `currentFlashDuration = clamp(currentFlashDuration + tempoRamp, 300, 800)`
4. In `buildRound()`, use `state.engine.currentFlashDuration` instead of calling `calcFlashDuration()`
5. Update `tempoRamp` values in the engine decision branches:
   - Overwhelmed (`accuracy < 0.70`): `tempoRamp = +40` (slow back down)
   - Hold ZPD: `tempoRamp = 0` (freeze tempo)
   - Push RT: `tempoRamp = -20`
   - Accelerate all: `tempoRamp = -30`

---

## Root Cause #2 — Sequence Starts Too Long

**File:** `engine/gameStateMachine.ts:99`

```ts
const prevLength = state.round?.displaySequence.length ?? 2;
const newLength = Math.min(prevLength + levers.sequenceGrowth, ...);
```

Round 1 uses `prevLength = 2`, then adds `sequenceGrowth` (1). So round 1 has **3 cells**. Players see a 3-cell sequence on their very first round, before they understand the recall mechanic.

**The fix:** Change fallback to `1` so round 1 starts at 2 cells after adding sequenceGrowth.

```ts
const prevLength = state.round?.displaySequence.length ?? 1;
```

This gives players one round at length 2 before it starts growing.

---

## Root Cause #3 — ZPD Round Still Grows Sequence

**File:** `engine/adaptiveEngine.ts:122`

```ts
} else if (accuracy >= 0.7 && accuracy <= 0.9 && avgRt < 400) {
  // Target ZPD — don't adjust
}
```

The engine correctly doesn't adjust levers, but `sequenceGrowth` remains at its current value (could be 1 or 2). So the sequence still grows every ZPD round. True ZPD behavior means holding the player at the current difficulty, not continuing to push.

**The fix:** In the ZPD branch, explicitly set `sequenceGrowth = 0` so sequence length holds:

```ts
} else if (accuracy >= 0.7 && accuracy <= 0.9 && avgRt < 400) {
  levers.sequenceGrowth = 0; // hold at current length
}
```

Note: `sequenceGrowth` type is `1 | 2 | 3` — needs to be widened to `0 | 1 | 2 | 3` in the interface.

---

## Root Cause #4 — Overwhelm Threshold Too Aggressive

**File:** `engine/adaptiveEngine.ts:124`

```ts
} else if (accuracy < 0.7) {
  // Overwhelmed — ease back
```

70% accuracy means the player is missing 3 in 10 taps. That's already a bad experience. The engine should ease back earlier.

**The fix:** Raise the overwhelm threshold to 80%:

```ts
} else if (accuracy < 0.8) {
  // Overwhelmed — ease back
```

Also tighten the ZPD band accordingly:

```ts
} else if (accuracy >= 0.8 && accuracy <= 0.9 && avgRt < 400) {
  levers.sequenceGrowth = 0;
}
```

---

## Root Cause #5 — Default TempoRamp Too Aggressive

**File:** `engine/adaptiveEngine.ts:34`

```ts
const DEFAULT_LEVERS: LeverSettings = {
  tempoRamp: -20,
  ...
```

For a first-time player with no history, `-20ms/round` is too fast. Tuned to `-10ms/round` until the engine has enough data to calibrate.

**The fix:**

```ts
const DEFAULT_LEVERS: LeverSettings = {
  tempoRamp: -10,
  ...
```

And in `initEngine()`, tighten the profile-based seed:

```ts
tempoRamp: p.baselineRt < 350 ? -20 : -10, // was -30 : -20
```

---

## Summary of All Changes

| # | File | Change | Impact |
|---|------|--------|--------|
| 1 | `gameStateMachine.ts` | Accumulation model — `currentFlashDuration` in state, delta per round | Fixes engine's ability to slow down |
| 2 | `adaptiveEngine.ts` | `tempoRamp` values updated for new model (+40 ease, 0 hold, -20 push, -30 max) | Completes fix #1 |
| 3 | `gameStateMachine.ts` | Sequence fallback `?? 1` (not `?? 2`) | Round 1 starts at length 2 |
| 4 | `adaptiveEngine.ts` | ZPD branch sets `sequenceGrowth = 0` | Sequence holds at ZPD |
| 5 | `adaptiveEngine.ts` | Overwhelm threshold `< 0.7` → `< 0.8` | Engine eases back sooner |
| 6 | `adaptiveEngine.ts` | Default `tempoRamp: -20` → `-10` | Gentler cold start |

---

## Expected Feel After Fixes

| Rounds | Expected Behavior |
|--------|------------------|
| 1–3    | Short sequences (2–3 cells), slow tempo (~580–550ms). Learning phase. |
| 4–8    | Engine calibrates. ZPD players hold steady, strong players accelerate. |
| 9–15   | Mutations introduced for strong players. Overwhelmed players slow down. |
| 15+    | Individual ceiling emerges. Some players hit 300ms floor, others plateau earlier. |

---

## Playtesting Checkpoints

After implementing fixes, validate with manual sessions:

- [ ] Round 1 should feel easy. 2 cells, slow flash.
- [ ] Getting 3 rounds wrong in a row should visibly slow the tempo.
- [ ] ZPD state (70–80% accuracy) should feel "just hard enough" — no speed increase.
- [ ] Strong players (>90% accuracy, <350ms RT) should feel escalating challenge within 8 rounds.
- [ ] Grid should not expand before round 6, and only after 3 clearly strong rounds.
- [ ] Overwhelm threshold: missing ~2 in 10 taps should trigger ease-back.

---

## What's NOT Changing (Intentionally)

- Flash duration floor: 300ms — already raised from 200ms, feels right
- Grid expansion logic: already requires 3 consecutive strong rounds — keep as is
- Mutation selection (poison preference when struggling) — working well
- Session end on wrong tap — core mechanic, intentional
