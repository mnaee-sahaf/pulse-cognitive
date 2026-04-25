# Pulse v2 — Adaptive Engine, Benchmarking, and Difficulty Logic

> Companion to `REDESIGN_v2.md`. Focused on the science: how we keep the player at the edge of their ability, how we measure improvement honestly, and how we benchmark them against population norms. Status: proposed. Date: 2026-04-25.

---

## The problem we're actually solving

The product goal is not "fun brain game". It is: **help people measurably improve their cognitive ability over weeks, and prove it with numbers they can trust.**

That requires four things v1 doesn't have:

1. **Forced edge-of-ability training** — the user must operate at ~80–85% accuracy *at all times*, not "on average over a window". v1's rolling-3 averaging is too lazy and lets users drift comfortable.
2. **Real benchmarks** — "Pulse Index 68" means nothing. The user needs to know how their reaction time compares to other adults their age, and whether their working-memory span is below, at, or above the population mean for their cohort.
3. **Consequences for failure** — failing must hurt enough to keep stakes real. v1's "round restarts at slightly easier" is no consequence at all.
4. **Honest improvement tracking** — pre/post measurement with proper statistical comparison, not averages that drift.

This doc specifies how each is solved.

---

## The science we're standing on

The "80–85% accuracy is optimal for learning" target is not vibes. Citations we anchor to (encode in code comments where relevant):

- **Wilson et al. 2019 — *The Eighty Five Percent Rule for optimal learning***. Mathematically derives that for binary-classification learning, gradient-descent learners optimize at ~85% training accuracy. This is our headline target.
- **Vygotsky 1978 — Zone of Proximal Development**. Skills develop fastest just above current capacity, with scaffolding. We scaffold via the staircase.
- **Levitt 1971 — *Transformed up-down methods in psychoacoustics***. The 3-down-1-up adaptive staircase converges to 79.4% threshold. Decades of validation.
- **Deary et al. 2001 / Hultsch et al. 2002** — population norms for simple and choice reaction time across the adult lifespan.
- **Salthouse 1996** — processing-speed slowdown ≈ 1ms/year past 20.
- **Park et al. 2002** — working-memory span norms by age.
- **Logan et al. 1997 / Verbruggen et al. 2019** — Stop-Signal Reaction Time (SSRT) norms; ~200ms in healthy adults.
- **Jacobson & Truax 1991 — Reliable Change Index**. Clinical statistic for whether an individual's pre/post change is real or noise. We adapt this for "did the user actually improve?".

**Disclaimer we surface in-app**: "Pulse compares to published research norms. It is not a clinical assessment or medical diagnosis."

---

## New engine architecture: five independent staircases

v1 mashes everything into one shared adaptive engine drifting four levers loosely. v2 splits the engine into **five independent dimensions, each with its own staircase**. Each dimension maps to a real cognitive construct with a published reference range.

| Dimension              | Construct           | Lever                          | Reference                |
|------------------------|---------------------|--------------------------------|--------------------------|
| **Working Memory**     | WM span             | Sequence length                | Digit span; Park 2002    |
| **Processing Speed**   | Choice RT           | Flash duration                 | Deary 2001; Hultsch 2002 |
| **Inhibition**         | Stop-signal control | HALT SSD                       | Logan 1997; Verbruggen   |
| **Flexibility**        | Set-shifting        | Mutation rate + types          | WCST norms; loose        |
| **Sustained Attention**| Vigilance           | Drift detected across long runs| MacKworth-style          |

Each dimension has:

- A **threshold parameter** `θ` (current difficulty target)
- A **step size** `s` (how much θ changes per response, shrinks with each reversal)
- A **reversal counter** to track convergence
- A **history window** of the last N responses
- A **percentile mapping** to a published norm table

---

## The staircase: 3-down-1-up

For each dimension:

```
on correct response:
  consecutiveCorrect += 1
  if consecutiveCorrect == 3:
    θ += s              // make it harder
    consecutiveCorrect = 0
on incorrect response:
  θ -= s                // make it easier immediately
  consecutiveCorrect = 0
  reversals += 1
  if reversals % 2 == 0:
    s = max(s_min, s * 0.7)  // shrink step on every other reversal
```

**Convergence guarantee**: this procedure converges to a stable threshold at **79.4% accuracy** (Levitt 1971). That is the point. The user is *forced* to operate at the edge. They cannot get comfortable.

For continuous parameters (flash duration), step `s` starts at 50ms and floors at 5ms — so first errors cause big easy-jumps, late-session drift fine-tunes.

For discrete parameters (sequence length), step is integer (1) and the staircase produces clean +1 / -1 changes.

---

## Failure has consequence

Every layer of the design enforces this:

1. **Round level**: a wrong tap *immediately* drops θ for that dimension by a full step. The round ends. The combo resets. The wave run ends.
2. **Run level**: failure ends the run. No retries within a run. Wave reached is locked. (Exception: HALT mode by nature has many trials per run; failure threshold is a wave cap.)
3. **Daily Trial level**: one shot per day. Fail = the daily streak breaks (with one weekly streak shield, Duolingo-style).
4. **Streak level**: missing the daily trial breaks the streak. Streak resets. The cosmetic reward path resets.

The asymmetry — small reward to climb, sharp loss when you fail — is what creates the dopamine loop. v1 has neither side of the asymmetry; v2 has both, loudly.

---

## Benchmarking against the population

### Profile inputs (collected on first launch)

Required: **age band** (18–25, 25–35, 35–45, 45–55, 55–65, 65+), **sex** (Male / Female / Prefer not to say). Both ship with non-judgemental copy ("This helps us compare your scores to research data for similar adults.").

Optional: handedness, hours of sleep last night, caffeine in last hour. These tag sessions but don't gate features.

### Norm tables (`engine/norms.ts`)

For each dimension, a hard-coded table of `(ageBand, sex) → { mean, sd }` derived from published research:

```ts
const RT_NORMS = {
  '18-25': { male: { mean: 290, sd: 45 }, female: { mean: 305, sd: 48 } },
  '25-35': { male: { mean: 305, sd: 50 }, female: { mean: 318, sd: 52 } },
  // ... up to 65+
};
```

(Values illustrative; final table will be sourced from Deary 2001 + Hultsch 2002 + UK Biobank cognitive RT data and cited inline.)

### Percentile calculation

```ts
function percentile(value, mean, sd, lowerIsBetter = true): number {
  const z = (value - mean) / sd;
  const cdf = standardNormalCdf(z);
  return Math.round((lowerIsBetter ? 1 - cdf : cdf) * 100);
}
```

### What the user sees

Replace abstract metrics with grounded ones. On home and weekly review:

- **Working Memory Span: 7** *(75th percentile, adults 25–35)*
- **Reaction Time: 312ms** *(58th percentile)*
- **Inhibition (SSRT): 218ms** *(62nd percentile)*

Plus a single composite: **Cognitive Profile: 68th percentile across four dimensions** — but now the 68 is *traceable* to four real numbers vs population, not a black box.

---

## Honest improvement tracking

Per-session metrics are noisy. We need a real "did this person improve?" signal.

### Reliable Change Index (RCI), adapted

For each dimension, after every session we compute:

```
baseline_mean = avg of first 5 sessions for this dimension
baseline_sd   = sd of first 5 sessions
current_mean  = avg of last 5 sessions
sem           = baseline_sd * sqrt(2)   // standard error of measurement
RCI           = (current_mean - baseline_mean) / sem
```

If `|RCI| ≥ 1.96`, the change is reliable (p < 0.05). The user sees: **"Your reaction time has reliably improved by 28ms over 4 weeks (RCI = 2.3)."** That sentence is unfakeable. It is real evidence.

If `|RCI| < 1.96`, we say: **"You're trending in the right direction, but we need 2 more weeks of data to confirm."** Honest.

### Pre/post comparison

Every 4 weeks we lock a "checkpoint" — frozen averages from the last 5 sessions of that period. Users can see their week-1 → week-4 → week-8 trajectory as discrete data points, not a smoothed line that obscures real change.

### What we never claim

- Improvement on Pulse → improvement on real-world tasks (transfer is contested in the literature; we don't lie about it).
- Diagnosis of attention deficit, dementia, etc.
- Comparison to clinical populations.

The marketing / About copy says: "Pulse trains the cognitive abilities it tests. Whether that helps in your daily life is something only you can judge."

---

## Putting it together — one round, one run

```
User starts a run in ARC mode. Engine reads their five staircase thresholds:
  WM_θ      = 6 (sequence length)
  Speed_θ   = 540ms (flash duration)
  Mutation_θ = 0.15 (probability)
  ...

Round 1 generated at exactly those parameters.
User taps the sequence. Each tap → engine logs RT.

If all correct:
  consecutiveCorrect++ for involved dimensions
  if 3 in a row → θ ratchets up

If wrong tap:
  Round fails.
  Run ends. Wave locked.
  All staircase thresholds drop one step.
  Combo reset.
  Engine voice line: "Tough one. Easing back."

Run ends. Session summary writes to db:
  - per-dimension threshold reached
  - per-dimension % correct
  - any reversals (= reached genuine edge)

After session, percentile re-computed against norm table.
After 5 sessions, RCI vs baseline starts being computed.
After 4 weeks, checkpoint locks.
```

---

## What this gives us that v1 doesn't

| Pain point                       | v1 answer                  | v2 answer                                                                 |
|----------------------------------|----------------------------|---------------------------------------------------------------------------|
| Forced edge of ability           | Rolling-3 average drift    | 3-down-1-up staircase per dimension; converges at 79.4% threshold         |
| Failure has consequence          | Round eases                | Run ends; combo breaks; staircase drops; daily streak at risk             |
| Real benchmarks                  | None                       | Published-norm percentiles per dimension, per age × sex                   |
| Honest improvement signal        | Smoothed averages          | Reliable Change Index (RCI) with p-value gate                             |
| Adaptive engine feels alive      | Silent math                | Five visible per-dimension dials, engine voice on threshold changes       |

---

## Implementation

New modules on `feat/v2-trials`:

- `engine/staircase.ts` — pure 3-down-1-up procedure, parametrized by step size and reversal count. Per-dimension state.
- `engine/dimensions.ts` — five staircase configs (WM, Speed, Inhibition, Flexibility, Attention) with starting θ, step ranges, mapping to game levers.
- `engine/norms.ts` — hard-coded population norm tables with citations. Percentile calc.
- `engine/improvement.ts` — RCI calculation, baseline locking, checkpoint logic.
- `db/profile.ts` — store age band + sex (extends `player_profile` schema).
- `db/checkpoints.ts` — pre/post snapshots.

Tests required (we will treat these as launch blockers):

- Staircase converges to ~79.4% threshold over 1000 simulated rounds at fixed underlying ability.
- Norm table percentiles match published reference values within ±2.
- RCI flags reliable change vs no-change correctly across simulated user trajectories.
- Step-size halving on reversals behaves as Levitt 1971 specifies.

---

## Open calibration questions

1. **Sex-specific norms** — for some metrics (RT) sex differences are small (5–15ms). For others (verbal WM) they're slightly larger. Worth differentiating for honesty, but UI must not feel like it's grading "M vs F". Show *your* age × sex band; don't compare across bands.
2. **Privacy of demographic data** — age + sex stay on-device only by default. Surfacing the privacy policy on collection is non-negotiable.
3. **Initial calibration session** — keep the v1 calibration concept (session 1 is fixed pacing) but use it to *seed every staircase's starting θ*, not just one global baseline.
4. **Step size policy** — Levitt's 0.7 reversal-shrink factor is the default; verify in simulation for our specific dimension ranges.

Confirm direction and I'll start scaffolding `engine/staircase.ts` and `engine/norms.ts` first — they unblock everything else.
