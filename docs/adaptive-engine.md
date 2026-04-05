# Pulse Adaptive Engine — How It Works

## The Goal

The engine has one job: keep the player in the Zone of Proximal Development (ZPD) — the narrow band where difficulty is challenging but not overwhelming. The target is **80–90% accuracy** over the last 3 rounds.

That sounds counterintuitive, but it's grounded in cognitive science. Learning is maximized when the player is succeeding most of the time but still being stretched. Below 80% accuracy means they're overwhelmed; above 90% means the game isn't pushing hard enough.

If accuracy is consistently above 90% → too easy → engine pushes harder.  
If accuracy drops below 80% → too hard → engine eases back.

---

## The Four Levers

The engine controls difficulty through four independent axes:

### 1. Sequence Growth (`sequenceGrowth`)
How many cells are added to the sequence after each round.

| Value | Effect |
|---|---|
| 0 | Hold at current length (ZPD: player is being tested, not grown) |
| +1 per round | Gentle ramp (default / recovery) |
| +2 per round | Fast ramp (triggered when player is well below ceiling) |

**Example:** If you're on a 5-cell sequence and growth is +2, next round is 7 cells.

---

### 2. Tempo Ramp (`tempoRamp`)
How much the flash duration changes per round. Negative = faster (harder); positive = slower (easier).

| Value | Effect |
|---|---|
| +40ms/round | Ease back — flashes slow down (overwhelm branch) |
| −10ms/round | Default gentle ramp |
| −20ms/round | Tempo-only push (speed lagging branch) |
| −30ms/round | Accelerate — full push (well-below-ceiling branch) |

**Flash duration is accumulated**, not computed from a formula. Each round applies the ramp delta to the running total:

```
newFlashDuration = clamp(currentFlashDuration + tempoRamp, flashFloor, flashCeiling)
```

**Defaults:** initial 600ms, floor 300ms, ceiling 800ms.

**Example at −20ms/round starting from 600ms:**
- Round 1: 600ms → 580ms  
- Round 5: ~500ms  
- Round 15: 300ms (floor — never faster than this)

---

### 3. Mutation Rate (`mutationRate`)
The probability (0–60%) that a rule change is introduced on a given round.

Mutations are temporary rule modifications that test cognitive flexibility:
- **Poison** — one cell is marked dangerous; avoid it while completing the sequence (simplest)
- **Mirror** — tap the horizontally mirrored positions instead (medium)
- **Reverse** — tap the sequence in reverse order (hardest)

The engine starts with mutation rate at 0 and gradually introduces them as the player demonstrates they can handle the base game. When a player fails a mutation, the engine drops the rate and prefers simpler types. When they survive 3 consecutive mutation rounds, the rate increases.

---

### 4. Grid Expansion (`gridSize`)
The grid starts at 3×3 (9 cells). The engine can expand it to 4×4 (16 cells) and eventually 5×5 (25 cells).

This is the most disruptive lever — a bigger grid means more spatial complexity and harder memorization. The engine only expands the grid after confirming strong performance (>88% accuracy) over **3 consecutive rounds**, not just one good round. Earliest possible expansion: round 6 for 3×3→4×4, round 12 for 4×4→5×5.

---

## Decision Logic — What Happens After Each Round

After every completed round, the engine reads the **last 3 rounds** of data and applies one of these branches:

```
Accuracy > 90% AND avg RT < 350ms
→ Player is well below ceiling
→ Sequence growth +2, tempo ramp −30ms, mutation rate increases

Accuracy > 90% AND avg RT > 450ms
→ Memory is fine but speed is lagging
→ Hold sequence growth at +1, push tempo to −20ms

Accuracy 80–90%
→ Player is in the ZPD (target zone)
→ Hold sequence length (growth = 0), hold tempo (ramp = 0)

Accuracy < 80%
→ Player is overwhelmed
→ Sequence growth back to +1, ease tempo to +40ms (slower), reduce mutations
```

**Important:** The engine does not make any adjustments for the first 3 rounds (`warmupRounds = 3`). These rounds apply a fixed gentle escalation (−5ms/round) regardless of performance.

---

## Intensity Score

The engine tracks an intensity score (0–1) that reflects how hard it is currently pushing:

```
intensity =
  ((sequenceGrowth − 1) / 2) × 0.3      // sequence pressure
  + ((800 − currentFlashDuration) / 500) × 0.4   // tempo pressure
  + (mutationRate / 0.6) × 0.3           // mutation pressure
```

Note: the tempo term uses the accumulated flash duration, not the lever's `tempoRamp` value.

---

## Player Profile — Cross-Session Learning

The engine doesn't start from scratch every session. After each session, it updates a **player profile** stored locally on the device:

| Profile Field | What It Tracks | Used For |
|---|---|---|
| `baselineRt` | Average reaction time across last 10 sessions | Sets initial tempo |
| `wmCapacity` | Average max sequence length reached before failure | Sets initial sequence growth |
| `flexRating` | Mutation survival rate | Sets initial mutation rate |
| `speedAccuracyThreshold` | Avg RT from sessions where accuracy dropped below 80% | Identifies player's speed/memory bottleneck |

On session start, the engine reads this profile and calibrates initial lever positions. A brand new player with no profile data starts at defaults (equivalent to the gentlest settings). After 3–5 sessions, the profile is meaningful enough to skip the early "finding your level" phase.

---

## Why Does It Sometimes Feel Too Hard Too Fast?

A few dynamics cause this:

**Short sequences are deceptively easy.** A 2-cell sequence (the starting length) is almost impossible to fail — even a distracted player gets it right. The engine sees 100% accuracy and concludes "push harder," even though the player hasn't been meaningfully tested yet.

**Accuracy reacts faster than the player's subjective feel.** By the time the player notices the game feels hard, the engine has already been ramping for 3–4 rounds.

**Multiple levers moving at once.** If the engine decides to push, it adjusts tempo AND sequence growth simultaneously. The combined effect feels steeper than either change alone.

The mitigations built into the current engine:
- The floor of 300ms prevents physical impossibility
- Grid expansion requires 3 consecutive strong rounds, not just one
- The engine doesn't act on rounds 1–3 (warmup)

---

## Evolution Path

The current engine (v1.0) is fully rule-based — all the logic above is deterministic, hand-tuned code. It's designed to be replaced.

**v1.5 (~10K sessions collected):** A lightweight regression model trained on real session data predicts optimal lever settings given a player profile. A/B tested against the rule-based engine.

**v2.0 (~100K sessions):** A reinforcement learning agent replaces the regression model. The reward signal is: keep the player in the 80–90% accuracy band for as long as possible. It learns lever-adjustment policies that no hand-tuned rule system can match.

**v3.0 (~1M sessions):** Multi-objective optimization. The agent balances accuracy band, session duration, user engagement (return rate), and actual cognitive improvement measured across weeks. This is the data moat — the model improves with every user and every session, and no competitor can replicate it without the same infrastructure and the same volume of data.

---

## Key Numbers Reference

| Parameter | Value | Notes |
|---|---|---|
| Target accuracy band | 80–90% | ZPD — below = overwhelmed, above = push harder |
| Rolling window | Last 3 rounds | For all accuracy/RT calculations |
| Warmup rounds | 3 | No adaptive branches, fixed −5ms/round |
| Initial flash duration | 600ms | How long each cell illuminates |
| Flash duration floor | 300ms | Never faster than this |
| Flash duration ceiling | 800ms | Never slower than this (ease-back cap) |
| Initial sequence length | 2 cells | Round 1: prevLength(1) + sequenceGrowth(1) |
| Grid expansion threshold | >88% accuracy × 3 rounds | Before 3×3 → 4×4 (earliest round 6) |
| Max mutation rate | 60% | Cap on mutation probability |
