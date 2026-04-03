# Pulse Adaptive Engine — How It Works

## The Goal

The engine has one job: keep the player failing ~20–30% of the time.

That sounds counterintuitive, but it's grounded in cognitive science. Learning is maximized in a narrow band — not so easy that nothing is being challenged, not so hard that the player can't succeed. This band is called the **Zone of Proximal Development (ZPD)**. The engine is constantly searching for that zone and nudging the game toward it.

If the player is failing less than 20% → the game is too easy → engine pushes harder.
If the player is failing more than 30% → the game is too hard → engine eases back.

---

## The Four Levers

The engine controls difficulty through four independent axes:

### 1. Sequence Growth (`sequenceGrowth`)
How many cells are added to the sequence after each round.

| Value | Effect |
|---|---|
| +1 per round | Gentle ramp (default) |
| +2 per round | Fast ramp (triggered when player is well below ceiling) |
| +3 per round | Aggressive ramp (reserved for future use) |

**Example:** If you're on a 5-cell sequence and growth is +2, next round is 7 cells.

---

### 2. Tempo Ramp (`tempoRamp`)
How much the flash duration (how long each cell lights up) decreases per round.

This is always a negative number — the game always gets faster over time.

| Value | Effect |
|---|---|
| -15ms/round | Gentle (recovery mode) |
| -20ms/round | Default |
| -30ms/round | Fast (player is handling speed well) |

**Flash duration formula:**
```
flashDuration = 600ms + (tempoRamp × roundNumber)
```

**Example at -20ms/round:**
- Round 1: 600ms per cell  
- Round 5: 500ms  
- Round 10: 400ms  
- Round 15: 300ms (floor)

**The floor is 300ms.** The cells will never flash faster than 300ms no matter what. This prevents the game from becoming physically impossible.

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

This is the most disruptive lever — a bigger grid means more spatial complexity and harder memorization. The engine only expands the grid after confirming strong performance over **3 consecutive rounds**, not just one good round.

---

## Decision Logic — What Happens After Each Round

After every completed round, the engine reads the last 3 rounds of data and applies one of these rules:

```
Accuracy > 90% AND avg RT < 350ms
→ Player is well below ceiling
→ Sequence growth +2, tempo ramp -30ms, mutation rate increases

Accuracy > 90% AND avg RT > 450ms
→ Memory is fine but speed is slow
→ Hold sequence growth at +1, push tempo to -35ms

Accuracy 70–90% AND avg RT < 400ms
→ Player is in the ZPD (target zone)
→ Don't change anything

Accuracy < 70%
→ Player is overwhelmed
→ Sequence growth back to +1, slow tempo to -15ms, reduce mutations
```

**Important:** The engine waits until round 3 before making any adjustments. The first 2 rounds are always gentle regardless of how well the player does.

---

## Player Profile — Cross-Session Learning

The engine doesn't start from scratch every session. After each session, it updates a **player profile** stored locally on the device:

| Profile Field | What It Tracks | Used For |
|---|---|---|
| `baselineRt` | Average reaction time across last 10 sessions | Sets initial tempo |
| `wmCapacity` | Average max sequence length before failure | Sets initial sequence growth |
| `flexRating` | Mutation survival rate | Sets initial mutation rate |
| `speedAccuracyThreshold` | RT at which accuracy degrades | Identifies player's speed/memory bottleneck |

On session start, the engine reads this profile and calibrates initial lever positions. A brand new player with no profile data starts at defaults (equivalent to the gentlest settings). After 3–5 sessions, the profile is meaningful enough to skip the early "finding your level" phase.

---

## Why Does It Sometimes Feel Too Hard Too Fast?

A few dynamics cause this:

**Short sequences are deceptively easy.** A 3-cell sequence is almost impossible to fail — even a distracted player gets it right. The engine sees 100% accuracy and concludes "push harder," even though the player hasn't been meaningfully tested yet.

**Accuracy reacts faster than the player's subjective feel.** By the time the player notices the game feels hard, the engine has already been ramping for 3–4 rounds.

**Multiple levers moving at once.** If the engine decides to push, it adjusts tempo AND sequence growth simultaneously. The combined effect feels steeper than either change alone.

The mitigations built into the current engine:
- The floor of 300ms prevents physical impossibility
- Grid expansion now requires 3 consecutive strong rounds
- The engine doesn't act on round 1 or 2

---

## Evolution Path

The current engine (v1.0) is fully rule-based — all the logic above is deterministic, hand-tuned code. It's designed to be replaced.

**v1.5 (~10K sessions collected):** A lightweight regression model trained on real session data predicts optimal lever settings given a player profile. A/B tested against the rule-based engine.

**v2.0 (~100K sessions):** A reinforcement learning agent replaces the regression model. The reward signal is: keep the player in the 20–30% failure band for as long as possible. It learns lever-adjustment policies that no hand-tuned rule system can match.

**v3.0 (~1M sessions):** Multi-objective optimization. The agent balances failure rate, session duration, user engagement (return rate), and actual cognitive improvement measured across weeks. This is the data moat — the model improves with every user and every session, and no competitor can replicate it without the same infrastructure and the same volume of data.

---

## Key Numbers Reference

| Parameter | Value | Notes |
|---|---|---|
| Target failure rate | 20–30% | Per ZPD / 85% Rule |
| Rolling window | Last 3 rounds | For all accuracy/RT calculations |
| Initial flash duration | 600ms | How long each cell illuminates |
| Flash duration floor | 300ms | Never faster than this |
| Initial sequence length | 3 cells | Start of every session |
| Grid expansion threshold | >88% accuracy × 3 rounds | Before 3×3 → 4×4 |
| Max mutation rate | 60% | Cap on mutation probability |
| Engine grace period | First 2 rounds | No adjustments made |
