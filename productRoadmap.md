# Pulse Training Modes Roadmap
## From Scientific Evidence to Programmed Exercises

**April 2026 · Product & Engineering Planning Document**

---

## How to Read This Document

Every training mode below is derived directly from the research brief. Each mode specifies: the cognitive construct it targets, the scientific paradigm it operationalizes, the adaptive levers available, what can be measured, and what claims are defensible. Modes are organized into three launch phases based on evidence strength and engineering complexity.

---

## Architecture Overview: The Dimension Model

Based on the research findings, Pulse should expand from 4 to 6 primary dimensions:

| # | Dimension | Scientific Basis | Evidence Strength | Status |
|---|-----------|-----------------|-------------------|--------|
| 1 | **Processing Speed** | UFOV / Choice RT / ACTIVE trial | ★★★★★ | Rename & refactor existing Reaction Speed |
| 2 | **Working Memory** | Spatial span / Dual n-back / Baddeley model | ★★★★☆ | Refactor existing |
| 3 | **Cognitive Flexibility** | Task-switching / Wen et al. (2023) meta-flexibility | ★★★☆☆ | Refactor existing |
| 4 | **Decision Efficiency** | Drift-Diffusion Model / SAT optimization | ★★★☆☆ | Rename & refactor existing Decision Speed |
| 5 | **Impulse Control** | Go/No-Go + Stop-Signal / Raud et al. (2020) | ★★★★☆ | **NEW — Phase 1** |
| 6 | **Spatial Reasoning** | Mental rotation / Uttal et al. (2013) meta-analysis | ★★★★☆ | **NEW — Phase 2** |

**Key rename rationale:**
- "Reaction Speed" → **"Processing Speed"** — aligns with CHC taxonomy and the ACTIVE trial's language. "Reaction speed" implies simple RT; your paradigm is closer to adaptive UFOV (divided attention + speed).
- "Decision Speed" → **"Decision Efficiency"** — the research shows drift rate reflects *efficiency* not *speed* (Weigard et al., 2026). This also sounds better in marketing.

---

## Phase 1: Core Refactors + First New Mode
**Timeline: Months 1–3**
**Goal: Strengthen scientific grounding of existing modes, ship Impulse Control**

---

### Mode 1: INTERCEPT → Renamed "SURGE"
**Dimension: Processing Speed**
**Paradigm: Adaptive Useful Field of View (UFOV)**

#### Why the refactor matters
The ACTIVE trial's speed-of-processing training — the only cognitive training shown to reduce dementia risk over 20 years — is NOT simple RT. It's an adaptive UFOV paradigm that engages divided attention, peripheral detection, and rapid stimulus discrimination simultaneously. Pulse's current "tap the lit cell" mechanic maps to simple/choice RT, which has weaker transfer evidence. Shifting toward UFOV-like mechanics dramatically strengthens the scientific positioning.

#### Core mechanic (refactored)
The grid illuminates a **target cell** (center or near-center) and a **peripheral distractor or secondary target** simultaneously. The user must:
1. Tap the primary target (speed component)
2. Identify the location or identity of the peripheral stimulus (divided attention component)

Flash duration compresses adaptively. As performance improves, peripheral stimuli move further from center and flash duration decreases.

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| Flash duration | 500ms → 16ms | Visual processing speed |
| Target eccentricity | Center → corner cells | Useful field of view breadth |
| Distractor density | 0 → 3 distractors | Selective attention under load |
| Stimulus similarity | High contrast → low contrast | Perceptual discrimination |
| Response window | 2000ms → 200ms | Decision speed under pressure |

#### Round structure (within 60s session)
- ~15–25 trials per session
- Each trial: stimulus flash → response → 200ms inter-trial interval
- Adaptive engine adjusts after every 3 trials (rolling accuracy window)
- Target accuracy band: **80–85%** (per Wilson et al. 85% rule, adjusted for the perceptual nature of this task)

#### Metrics captured
- **Mean RT** (ms) — primary processing speed measure
- **RT variability** (IIV / coefficient of variation) — strongest predictor of cognitive health per Bielak et al. (2017) and Jutten et al. (2023)
- **Peripheral accuracy** — UFOV breadth proxy
- **Flash duration threshold** — the shortest flash at which 80% accuracy is maintained

#### Defensible claims
- Level 1 (Measure): "Measures your visual processing speed and attentional field"
- Level 2 (Train): "Regular practice improves performance on processing speed tasks"
- Level 3 (Transfer): NOT YET — requires Pulse-specific RCT. But can reference: "The ACTIVE study found that adaptive speed-of-processing training, similar in structure to this exercise, produced lasting cognitive benefits."

---

### Mode 2: MEMORY → Renamed "ARC"
**Dimension: Working Memory**
**Paradigm: Adaptive Spatial Span + Dual-Modality N-Back Hybrid**

#### Why the refactor matters
The current spatial sequence recall is a solid WM task, but it's purely spatial span — a single subsystem of WM. The research shows: (a) spatial WM training transfers slightly better than verbal, (b) dual n-back (spatial + verbal) shows the most transfer evidence, and (c) task variation prevents strategy-specific plateaus. Adding a secondary modality (even simple) enriches the WM load and aligns with Baddeley's multi-component model.

#### Core mechanic (refactored)
**Primary task:** Spatial sequence recall — cells illuminate in sequence, user reproduces the sequence by tapping in order. (Existing mechanic, retained.)

**New secondary task layer (Phase 1 enhancement):** Each illuminated cell briefly displays a symbol, color, or number. After reproducing the spatial sequence, the user must recall one property of one of the cells (e.g., "What color was the 3rd cell?"). This engages the central executive for binding spatial and feature information.

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| Sequence length | 2 → 12 items | WM capacity (span) |
| Growth rate | +1, +2, or +3 per success | Challenge scaling |
| Grid size | 3×3 → 4×4 → 5×5 | Spatial resolution demands |
| Binding questions | 0 → 1 per round | Central executive / feature binding |
| Presentation speed | 1000ms → 300ms per item | Encoding speed |
| Interference delay | 0 → 3s between presentation and recall | Maintenance under delay |

#### Round structure
- ~6–10 rounds per 60s session (varies with sequence length)
- Each round: sequence presentation → recall → (optional) binding question → feedback
- Adaptive engine adjusts sequence length using 3-down/1-up staircase (converges to ~79.4% accuracy)
- Grid size expands after sustained performance plateau at current grid

#### Metrics captured
- **Max span** — peak sequence length before failure (primary WM capacity measure)
- **Average span** — mean correct sequence length across session
- **Binding accuracy** — % correct on feature-binding questions (central executive measure)
- **Encoding efficiency** — accuracy as a function of presentation speed

#### Defensible claims
- Level 1: "Measures your working memory capacity and feature-binding ability"
- Level 2: "Regular practice can expand your spatial working memory span"
- Level 3: NOT defensible — far transfer evidence is essentially null per Melby-Lervåg et al. (2016) and Gobet & Sala (2023). Never claim WM training improves intelligence, academic performance, or general cognitive ability.

---

### Mode 3: REVERSE → Renamed "SHIFT"
**Dimension: Cognitive Flexibility**
**Paradigm: Adaptive Task-Switching with Meta-Flexibility Training**

#### Why the refactor matters
Wen et al. (2023) demonstrated that training in high-volatility environments (frequent rule changes) produces transferable *abstract expectations about cognitive control demands*. This directly validates Pulse's mutation system. The refactor leans into this finding by making volatility itself a trainable, adaptive parameter — not just a game mechanic.

#### Core mechanic (refactored)
Fundamentally the same as existing: user performs a primary task (spatial sequence recall or pattern matching) with **mid-session rule mutations**. Refactoring focuses on:

1. **Expanding the mutation library** to engage diverse task-switching demands
2. **Making volatility adaptive** — mutation frequency itself scales with performance
3. **Adding explicit cue processing** — some mutations are cued (predictable), some are uncued (surprise)

#### Mutation library (expanded)

| Mutation | Rule Change | Cognitive Demand |
|----------|------------|-----------------|
| **Reverse** | Recall sequence in reverse order | Mental manipulation |
| **Mirror** | Horizontal flip of all positions | Spatial transformation |
| **Poison** | Inhibit response to marked cell(s) | Response inhibition |
| **Color Switch** | Tap only cells of a specific color | Attentional set shifting |
| **Parity** | Tap only even-numbered positions | Rule application |
| **Double** | Tap each cell twice | Motor planning adaptation |

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| Mutation frequency | 0% → 60% of rounds | General flexibility demand |
| Mutation predictability | 100% cued → 0% cued | Proactive vs. reactive control |
| Mutation diversity | 1 active type → 4 simultaneous | Multi-rule management |
| Mutation stacking | Single → compound (e.g., Mirror + Poison) | Complex rule integration |
| Switch interval | Regular → irregular | Temporal uncertainty |

#### Metrics captured
- **Switch cost** (ms) — RT increase on switch vs. non-switch trials (the gold-standard flexibility measure)
- **Mixing cost** (ms) — RT increase in mixed blocks vs. pure blocks (sustained control component; this is what declines with age per Wasylyshyn et al., 2011)
- **Mutation survival rate** — % correct across all mutation types
- **Recovery speed** — how quickly RT normalizes after a rule change
- **Volatility threshold** — maximum mutation frequency at which 80% accuracy is maintained

#### Defensible claims
- Level 1: "Measures your cognitive flexibility through switch costs and mutation survival"
- Level 2: "Training in high-volatility environments can improve your ability to adapt to changing rules"
- Level 3: Cautiously defensible with citation: "Recent research (Wen et al., 2023) shows that flexibility training in volatile environments can produce abstract transfer to novel task demands"

---

### Mode 4: NEW — "HALT"
**Dimension: Impulse Control**
**Paradigm: Adaptive Go/No-Go + Stop-Signal Hybrid**

#### Scientific justification
Inhibitory control is one of the most gamifiable cognitive tasks (30–40 trials in 60 seconds), has demonstrated training effects on health behaviors (d = 0.378 per Allom et al., 2015), and engages mechanisms distinct from cognitive flexibility (Raud et al., 2020: Go/No-Go = automatic restraint; Stop-Signal = controlled cancellation). It fills a genuine gap in Pulse's dimension coverage.

#### Core mechanic
Cells illuminate on the grid in rapid succession. The user must tap "Go" cells (majority) and withhold tapping on "No-Go" cells (marked with a distinct visual cue — e.g., red border, X overlay). Difficulty scales by manipulating the Go/No-Go ratio, the similarity between Go and No-Go cues, and the introduction of **Stop-Signal trials** where a Go stimulus changes to No-Go *after* the user has begun to initiate a response.

#### Trial types

| Trial Type | What Happens | Cognitive Demand |
|-----------|-------------|-----------------|
| **Go** (70–80%) | Green cell appears → tap it | Baseline response |
| **No-Go** (15–25%) | Red-bordered cell appears → withhold tap | Action restraint (proactive inhibition) |
| **Stop-Signal** (5–10%) | Green cell appears, then turns red after variable delay → cancel response | Action cancellation (reactive inhibition) |

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| Go/No-Go ratio | 80:20 → 60:40 | Prepotent response strength |
| Stimulus onset asynchrony (Stop-Signal delay) | 350ms → 50ms | Stop-signal reaction time (SSRT) |
| Cue similarity | High contrast → low contrast | Perceptual discrimination under inhibition load |
| Trial pacing | 1500ms → 500ms ISI | Speed pressure on inhibitory system |
| No-Go rule complexity | Color-based → shape-based → rule-based ("inhibit if preceded by X") | Conditional inhibition |

#### Metrics captured
- **Commission errors** — false alarms on No-Go trials (primary impulsivity measure)
- **Stop-Signal Reaction Time (SSRT)** — estimated time to cancel a response (gold-standard inhibitory control metric, computed via staircase tracking of SSD)
- **d-prime (d')** — signal detection sensitivity separating Go from No-Go (perceptual discrimination component)
- **Post-error slowing** — RT adjustment after commission errors (error monitoring / cognitive control)

#### Round structure
- 30–45 trials per 60s session
- Each trial: stimulus (200–500ms) → response window (500–1000ms) → ISI (300–500ms)
- Stop-Signal delay tracks using staircase: correct stop → delay increases (harder); failed stop → delay decreases (easier)
- Target: ~50% successful stops on Stop-Signal trials (standard psychophysics convergence for SSRT estimation)

#### Defensible claims
- Level 1: "Measures your ability to control impulses via response inhibition tasks validated by decades of research (Go/No-Go and Stop-Signal paradigms)"
- Level 2: "Regular inhibition training can improve your ability to withhold unwanted responses"
- Level 3: Cautiously: "Inhibition training has shown effects on health-related behaviors in clinical meta-analyses"

---

### Cross-Mode Feature: Decision Efficiency Overlay
**Dimension: Decision Efficiency**
**Paradigm: Drift-Diffusion Model (DDM) parameter extraction**

Rather than a standalone mode, Decision Efficiency is computed as an **overlay metric across all modes** — exactly as the brief described it functioning already. The refactor makes this explicit and adds DDM-derived metrics.

#### How it works
Every mode already requires rapid decisions under time pressure. The adaptive engine tracks the user's full RT distribution (not just means) across all trials in all modes. From this distribution, DDM parameters are estimated:

| DDM Parameter | What It Means | User-Facing Label |
|--------------|--------------|-------------------|
| **Drift rate (v)** | Speed/efficiency of evidence accumulation | "Decision Clarity" |
| **Boundary separation (a)** | Response caution / speed-accuracy tradeoff setting | "Decision Caution" |
| **Non-decision time (t₀)** | Sensorimotor latency (encoding + motor execution) | "Processing Baseline" |

#### Implementation approach
- **V1 (rule-based):** Compute accuracy-at-peak-tempo as current. Additionally compute RT mean, SD, skewness, and accuracy as functions of tempo bin. The speed-accuracy curve itself is the primary visualization.
- **V2 (ML-based):** Fit hierarchical DDM using accumulated session data. Extract v, a, t₀ per user per session. Track drift rate improvement over weeks — this is the strongest indicator of genuine cognitive improvement (vs. strategy/familiarity).

#### Metrics captured
- **Accuracy at peak tempo** — existing metric, retained
- **Speed-accuracy curve** — accuracy as a function of response deadline (the full SAT function)
- **Decision Clarity score** — derived from drift rate (v), normalized across user population
- **Efficiency trend** — week-over-week drift rate change

#### Defensible claims
- Level 1: "Tracks how efficiently you make decisions under time pressure"
- Level 2: "Training can shift your speed-accuracy tradeoff, allowing faster decisions without sacrificing accuracy"
- Level 3: NOT independently defensible — but drift rate improvement is one of the best mechanistic indicators that genuine cognitive change is occurring (Reinhartz et al., 2023)

---

## Phase 2: Spatial Reasoning + Multi-Domain Sessions
**Timeline: Months 4–6**
**Goal: Launch 6th dimension, introduce composite training sessions**

---

### Mode 5: NEW — "ROTATE"
**Dimension: Spatial Reasoning**
**Paradigm: Mental Rotation + Spatial Transformation**

#### Scientific justification
Spatial skills have the strongest trainability evidence of any cognitive domain: g = 0.47 across 217 studies (Uttal et al., 2013), with durable effects that transfer to untrained spatial tasks. Mental rotation trials are inherently brief (3–10 seconds), making them perfectly suited to 60-second sessions. This dimension diversifies Pulse beyond executive function into broader cognitive fitness.

#### Core mechanic
A reference shape (2D or 3D) appears on the left side of the screen. On the right, 2–4 candidate shapes appear, each rotated, mirrored, or both. The user must identify which candidate is the rotated version of the reference (not the mirror image). As difficulty increases, shapes become more complex, rotation angles become less obvious, and mirror-image distractors become more similar to rotated versions.

#### Difficulty progression

| Level | Shape Complexity | Rotation | Distractors | Time Limit |
|-------|-----------------|----------|-------------|-----------|
| 1 | Simple 2D (L-shapes, arrows) | 90° increments | 1 mirror, 1 rotated | 8s |
| 2 | Complex 2D (irregular polygons) | 45° increments | 2 mirrors, 1 rotated | 6s |
| 3 | Simple 3D (Shepard-Metzler style blocks) | Any angle | 2 mirrors, 1 rotated | 5s |
| 4 | Complex 3D + color variations | Any angle | 3 mirrors, 1 rotated | 3s |
| 5 | Animated rotation preview removed | Any angle | Highest similarity | 2.5s |

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| Shape complexity | 2D simple → 3D complex | Spatial representation fidelity |
| Rotation granularity | 90° → arbitrary angles | Angular discrimination |
| Mirror similarity | Obvious → near-identical | Spatial discrimination |
| Number of candidates | 2 → 4 | Visual search + comparison |
| Response deadline | 8s → 2s | Speed of spatial processing |

#### Metrics captured
- **Rotation rate** — RT as a function of rotation angle (the classic Shepard & Metzler linear function; slope = spatial processing speed)
- **Accuracy by complexity** — performance across 2D vs. 3D, simple vs. complex
- **Mirror discrimination** — ability to distinguish rotation from reflection
- **Spatial processing speed** — mean correct RT across all trials

#### Defensible claims
- Level 1: "Measures your ability to mentally rotate and compare spatial objects"
- Level 2: "Spatial skills are highly trainable, with effects demonstrated across over 200 studies (Uttal et al., 2013)"
- Level 3: "Spatial training effects transfer to untrained spatial tasks and persist over time"

---

### Feature: Multi-Domain Sessions — "CIRCUIT"
**Not a mode — a session format that combines modes**

#### Scientific justification
Lampit et al. (2014) found multi-domain training generally produces broader transfer than single-task training. The ACTIVE trial's speed training implicitly engaged multiple domains (speed + attention + decision-making). Combining modes within a single session prevents task-specific strategy development and increases ecological validity.

#### Session structure
A CIRCUIT session (90–120 seconds) cycles through **3 mini-rounds** drawn from different dimensions:

| Segment | Duration | Mode | Purpose |
|---------|----------|------|---------|
| 1 | 30s | SURGE (Processing Speed) | Warm-up / baseline RT calibration |
| 2 | 30s | SHIFT (Flexibility) or ARC (Working Memory) | Higher-order cognitive challenge |
| 3 | 30s | HALT (Impulse Control) or ROTATE (Spatial) | Different domain engagement |

The engine selects modes based on: (a) dimensions where the user's performance is weakest (targeted remediation), (b) dimensions the user hasn't trained recently (coverage), or (c) random selection (variability).

#### Metrics captured
- **Cross-domain composite score** — weighted average across all dimensions
- **Dimension balance** — radar chart showing relative strengths
- **Session-to-session variability** — consistency of composite performance

---

## Phase 3: Advanced Modes + Booster Architecture
**Timeline: Months 7–12**
**Goal: Ship advanced training variants, implement booster mechanics, prepare for validation studies**

---

### Mode 6: "DUAL" — Dual-Task Training
**Dimensions: Processing Speed × Working Memory (cross-domain)**
**Paradigm: Dual N-Back / Divided Attention**

#### Scientific justification
Dual n-back remains the most-studied paradigm for WM far transfer (Jaeggi et al., 2008; Pahor et al., 2022). While far transfer is debated, the *near transfer mediates far transfer* finding from Pahor et al. (2022) suggests dual n-back may have a genuine gating mechanism — individuals who improve on dual n-back show subsequent improvement on reasoning tasks, while those who don't improve show none. This makes it worth including as an advanced mode, even if claims must remain conservative.

#### Core mechanic
Two simultaneous stimulus streams:
1. **Spatial stream:** Cells illuminate in sequence on the grid (as in ARC)
2. **Auditory/visual stream:** A secondary stimulus (tone pattern, number, or color) accompanies each spatial position

The user must simultaneously track whether the current spatial position matches the position N steps back AND whether the current secondary stimulus matches the one N steps back. Both must be tracked independently.

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| N-back level | 1-back → 5-back | WM capacity under dual load |
| Modality combination | Visual-spatial + visual-feature → visual-spatial + auditory | Cross-modal binding |
| Lure frequency | 10% → 40% | Interference resistance |
| Trial pacing | 3000ms → 1500ms per item | Encoding speed under dual load |

#### Metrics captured
- **Dual n-back level** — highest N achieved at 80%+ accuracy on both streams
- **Modality independence** — whether spatial and secondary accuracy are correlated (high correlation = shared resource bottleneck; low correlation = independent processing)
- **Lure resistance** — accuracy on lure trials (items that match on N-1 or N+1, not N)

---

### Mode 7: "FLUX" — Volatile Flexibility Training
**Dimension: Cognitive Flexibility (Advanced)**
**Paradigm: High-Volatility Meta-Flexibility (Wen et al., 2023)**

#### Scientific justification
This is the direct operationalization of Wen et al.'s (2023) finding that training in volatile environments produces abstract, transferable flexibility. It's the most scientifically novel mode in the lineup — and the one where Pulse can claim genuine paradigm innovation.

#### Core mechanic
A rapid sequence of **mini-tasks** (3–8 seconds each) drawn from a **pool of 4–6 simple rule sets**. The rules change unpredictably between mini-tasks — sometimes every task, sometimes after 3–4 consecutive tasks of the same type. The user must rapidly detect which rule set is active and respond accordingly.

Example rule sets:
- **"Tap the odd one out"** — one cell differs in color; tap it
- **"Tap the pattern continuation"** — three cells light in sequence; tap where the 4th would be
- **"Tap the mirror position"** — one cell lights; tap its horizontal mirror
- **"Tap nothing"** — all cells light; withhold response (catch trial)

The key innovation: **volatility itself is the adaptive parameter.** High volatility (rules change every trial) trains reactive control. Low volatility (rules persist for 3–5 trials then change) trains proactive control and switch detection.

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| Rule pool size | 2 rules → 6 rules | Rule-set management complexity |
| Volatility | Low (change every 5 trials) → High (change every trial) | Meta-flexibility |
| Cue availability | Explicit color cue → no cue (infer from feedback) | Rule discovery |
| Rule similarity | Highly distinct → overlapping rules | Interference management |

---

### Mode 8: "SCAN" — Adaptive UFOV Pro
**Dimension: Processing Speed (Advanced)**
**Paradigm: Full Useful Field of View with peripheral detection**

#### Scientific justification
This is the closest Pulse mode to the actual UFOV paradigm used in the ACTIVE trial — the paradigm with the strongest transfer evidence in all of cognitive training, including 25% dementia risk reduction at 20 years (Coe et al., 2026). The standard SURGE mode is the accessible version; SCAN is the full-fidelity research-grade paradigm.

#### Core mechanic
**Central task:** A stimulus flashes in the center of the screen — the user must identify it (e.g., which of two possible shapes it was).

**Peripheral task (simultaneous):** A secondary stimulus appears at a variable distance from center — the user must report its location (which quadrant/octant it appeared in).

**Distractor overlay:** Visual noise elements surround the peripheral target, requiring selective attention to locate it.

All three components happen simultaneously during a single brief flash. This is the UFOV triad: central identification + peripheral localization + distractor filtering.

#### Adaptive levers

| Lever | Range | What it trains |
|-------|-------|---------------|
| Flash duration | 500ms → 16ms | Visual processing speed |
| Peripheral eccentricity | Near → far edge | Useful field of view breadth |
| Distractor density | None → dense | Selective attention |
| Central task difficulty | 2-choice → 4-choice | Central processing load |
| Dual-task demand | Central only → central + peripheral | Divided attention |

---

### Booster Session Architecture

#### Scientific justification
The ACTIVE trial's most critical finding: speed training **with boosters** reduced dementia risk by 25% (HR = 0.75), while speed training **without boosters** did not reach significance (Coe et al., 2026). Booster sessions are not optional — they are the mechanism that separates lasting benefit from temporary improvement.

#### Implementation

| Booster Type | When | What | Duration |
|-------------|------|------|----------|
| **Maintenance booster** | After user completes initial 15-session "foundation" block | Abbreviated session at 90% of peak difficulty | 60s, 1×/week |
| **Reactivation booster** | After 3+ days of inactivity | Session starting at 70% of last peak, rapidly scaling up | 60s |
| **Challenge booster** | Monthly | Session at 110% of current adaptive ceiling | 60s |
| **Cross-domain booster** | Bi-weekly | CIRCUIT session targeting weakest 2 dimensions | 90s |

#### Notification strategy
The research is unambiguous: boosters matter more than initial training volume. The app should implement spaced reminders optimized for long-term retention rather than daily engagement streaks:
- Daily sessions during initial 3-week foundation period
- Transition to 3×/week maintenance (per Lampit et al., 2014's optimal frequency)
- Booster reminders at increasing intervals (1 week → 2 weeks → 1 month)

---

## Scoring System: The Cognitive Profile

### Per-Dimension Scores

Each dimension produces a **normalized score (0–100)** based on the user's adaptive threshold relative to population norms. The score reflects the difficulty level at which the user maintains ~80% accuracy.

| Dimension | Primary Metric | Score Derivation |
|-----------|---------------|-----------------|
| Processing Speed | Flash duration threshold + peripheral accuracy | Percentile rank of shortest flash sustaining 80% accuracy |
| Working Memory | Max span + binding accuracy | Percentile rank of sequence length sustaining 80% recall |
| Cognitive Flexibility | Switch cost + mixing cost + volatility threshold | Inverse percentile of switch cost (lower = better) |
| Decision Efficiency | Drift rate estimate | Percentile rank of drift rate across user base |
| Impulse Control | SSRT + commission error rate | Inverse percentile of SSRT (lower = better) |
| Spatial Reasoning | Rotation rate slope + accuracy | Percentile of rotation speed (shallow slope = fast) |

### Composite Score: "Pulse Index"

A single headline number (0–100) weighted by the evidence-supported importance of each dimension:

| Dimension | Weight | Justification |
|-----------|--------|---------------|
| Processing Speed | 25% | Strongest real-world transfer evidence |
| Working Memory | 20% | Strongest predictor of intelligence and academic outcomes |
| Cognitive Flexibility | 15% | Critical for adaptive behavior; emerging transfer evidence |
| Decision Efficiency | 15% | Partially independent dimension with DDM support |
| Impulse Control | 15% | High clinical and real-world relevance |
| Spatial Reasoning | 10% | Strong trainability but narrower real-world scope |

### Trend Metrics

Beyond point-in-time scores, track:
- **7-day rolling average** per dimension (smooths daily variability)
- **RT variability trend** — intraindividual variability (IIV) across sessions. Increasing IIV is a stronger early indicator of cognitive decline than mean RT (Jutten et al., 2023)
- **Drift rate trend** — week-over-week change in DDM drift rate. This is the best mechanistic indicator that genuine cognitive improvement (not just task familiarity) is occurring

---

## Training Programs: Structured Progressions

Rather than leaving users to train ad-hoc, offer structured programs aligned with evidence-based dose-response parameters.

### Program 1: "Foundation" (3 weeks)
**Goal:** Establish baseline across all dimensions, build habit
**Schedule:** Daily sessions, 1–2 per day
**Structure:**
- Week 1: One session each of SURGE, ARC, SHIFT, HALT (rotating daily)
- Week 2: Same rotation, adaptive engine fully calibrated, introduce CIRCUIT sessions on weekends
- Week 3: User's weakest 2 dimensions get 2 sessions/day; strongest get 1 session/day

**Evidence basis:** Lampit et al. (2014) — most gains captured in first 15–25 sessions. Wang et al. (2014) — spaced sessions produce more transfer than massed.

### Program 2: "Sharpen" (8 weeks)
**Goal:** Maximize improvement in a chosen dimension
**Schedule:** 3 sessions/week (optimal per Lampit et al., 2014 — more is counterproductive)
**Structure:**
- 2 sessions/week on target dimension (progressing through basic → advanced modes)
- 1 session/week CIRCUIT (maintains breadth)
- Bi-weekly progress assessment

**Evidence basis:** Belleville et al. (2022) — non-linear dose-response with plateau at 12–14 training hours. 3×/week for 8 weeks ≈ 12 hours at 30 min/session equivalent.

### Program 3: "Maintain" (ongoing)
**Goal:** Long-term cognitive maintenance with booster architecture
**Schedule:** 2–3 sessions/week indefinitely
**Structure:**
- 1 CIRCUIT session/week
- 1–2 targeted sessions on rotating dimensions
- Monthly challenge boosters
- Reactivation boosters after gaps

**Evidence basis:** ACTIVE trial — booster sessions were critical for long-term retention and dementia risk reduction. Maintenance schedule prevents decay.

### Program 4: "Speed Pro" (6 weeks)
**Goal:** Maximally train the dimension with the strongest transfer evidence
**Schedule:** 3 sessions/week
**Structure:**
- Week 1–2: SURGE (basic adaptive UFOV)
- Week 3–4: SURGE + HALT combined sessions (speed + inhibition)
- Week 5–6: SCAN (full UFOV paradigm)
- Booster sessions every 2 weeks after completion

**Evidence basis:** This is the closest program to the ACTIVE trial's speed-of-processing protocol. 10 hours of adaptive speed training over 5–6 weeks mirrors the ACTIVE dosing. The ACTIVE trial used ~10 initial hours + ~4 hours of boosters.

---

## Engineering Considerations

### Adaptive Engine V2 Requirements

The current rule-based engine should evolve toward a Bayesian adaptive engine:

| Feature | V1 (Current) | V2 (Target) |
|---------|-------------|-------------|
| Adaptation method | Rule-based thresholds | 3-down/1-up staircase + Bayesian threshold estimation |
| Adaptation speed | Fixed rules | Per-user learning rate based on response variability |
| Target accuracy | Fixed 80% | Adjustable per dimension (80% for perceptual tasks, 70% for motor-cognitive) |
| Difficulty space | 4 independent levers | Joint difficulty manifold — levers interact (e.g., grid size affects sequence difficulty) |
| DDM fitting | Not implemented | Session-level DDM parameter estimation using HSSM or equivalent |
| Individual optimization | Not implemented | Bayesian priors from user history inform starting difficulty |

### Data Pipeline for Validation Studies

Every session should capture sufficient data for future internal validation studies:

| Data Point | Granularity | Purpose |
|-----------|------------|---------|
| Per-tap RT (ms) | Every trial | DDM fitting, IIV computation |
| Accuracy (binary) | Every trial | Psychometric curve estimation |
| Adaptive lever settings | Every round | Dose-response analysis |
| Session metadata | Per session | Time-of-day effects, session spacing analysis |
| Full RT distribution | Per session | Skewness and ex-Gaussian parameters (early cognitive decline markers) |

This dataset enables: (a) internal validation — do Pulse metrics correlate with established tests? (b) dose-response curves — how much training produces measurable improvement? (c) eventually, ML-optimized difficulty adaptation trained on real outcome data.

---

## Regulatory-Safe Language Guide

### What to say on the App Store

✅ **Safe:**
- "Train your cognitive fitness with science-backed exercises"
- "Measure and improve your processing speed, working memory, and cognitive flexibility"
- "Adaptive difficulty keeps you challenged at your personal edge"
- "Track your cognitive performance over time"

❌ **Unsafe — will trigger FTC / FDA scrutiny:**
- "Prevent dementia" / "Reduce Alzheimer's risk"
- "Clinically proven to improve brain health"
- "Improve performance at work / school / in athletics"
- "Doctor-recommended" (unless actually endorsed by named physicians)
- "Scientifically proven" (use "science-backed" or "research-informed" instead)

### Citation format for in-app claims
When referencing research within the app:
> "Research published in [Journal Name] found that [specific finding]. Pulse's [Mode Name] is designed based on this paradigm."

Never imply Pulse's own product has been validated unless/until you run your own RCTs.

---

## Full Mode Summary

| Mode | Dimension | Phase | Paradigm | Session Length | Trials/Session |
|------|-----------|-------|----------|---------------|---------------|
| **SURGE** | Processing Speed | 1 | Adaptive Choice RT + UFOV-lite | 60s | 15–25 |
| **ARC** | Working Memory | 1 | Spatial Span + Feature Binding | 60s | 6–10 rounds |
| **SHIFT** | Cognitive Flexibility | 1 | Task-Switching + Mutations | 60s | 8–12 rounds |
| **HALT** | Impulse Control | 1 | Go/No-Go + Stop-Signal Hybrid | 60s | 30–45 |
| **ROTATE** | Spatial Reasoning | 2 | Mental Rotation | 60s | 10–15 |
| **CIRCUIT** | Multi-Domain | 2 | Combined mini-rounds | 90–120s | Variable |
| **DUAL** | WM (Advanced) | 3 | Dual N-Back | 60s | 20–30 |
| **FLUX** | Flexibility (Advanced) | 3 | Volatile Meta-Flexibility | 60s | 12–20 |
| **SCAN** | Processing Speed (Advanced) | 3 | Full UFOV Triad | 60s | 15–20 |

---

## What to Build First: Priority Stack

1. **HALT (Impulse Control)** — New mode, fills biggest gap, most gamifiable, highest engagement potential
2. **SURGE refactor** — Shift from simple RT toward UFOV-lite. This is where the strongest transfer evidence lives
3. **SHIFT refactor** — Expand mutation library, make volatility adaptive. Scientifically novel positioning
4. **ARC refactor** — Add feature-binding secondary task. Modest lift, solid improvement
5. **Decision Efficiency overlay** — Add DDM-derived metrics across all modes. Backend analytics lift
6. **ROTATE** — New mode, strong trainability evidence, diversifies dimension coverage
7. **Booster architecture** — Critical for long-term retention. More important than any single mode
8. **CIRCUIT sessions** — Multi-domain format. Requires all base modes to be stable
9. **DUAL** — Advanced mode, complex to implement, debated transfer evidence
10. **FLUX** — Most scientifically novel mode, but requires mature adaptive engine
11. **SCAN** — Full UFOV, the "research grade" mode. Requires validated SURGE as prerequisite

---

*This roadmap translates the Pulse scientific brief into actionable product and engineering work. Every mode traces directly to peer-reviewed evidence. The phasing prioritizes modes with the strongest evidence base and highest user-facing impact, while building toward a complete 6-dimension cognitive training platform with the scientific credibility to withstand scrutiny.*