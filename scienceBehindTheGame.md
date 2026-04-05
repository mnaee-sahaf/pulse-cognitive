# Pulse — Scientific Brief for Research Collaboration

**April 2026 · For researcher review**

---

## What Pulse Is

Pulse is a mobile cognitive training application that gives ordinary people access to science-backed tools to **improve, maintain, and benchmark their cognitive performance** across the dimensions that matter most for real-world functioning.

Each session is ~60 seconds. The app measures performance, adapts difficulty in real time, and produces a quantified cognitive profile the user can track over weeks and months. There is no fixed difficulty ladder — an adaptive engine finds each user's personal cognitive edge and keeps them there, maximizing time spent in the zone where neuroplasticity and learning are highest.

The positioning is deliberate: this is not a "brain game" or wellness toy. It is a **precision cognitive instrument** designed with the same rigor as a clinical assessment, but packaged for daily consumer use. We want every mechanic, every score, and every claim to stand up to scientific scrutiny.

---

## The Core Question We Need Help Answering

**What are the cognitive dimensions that truly matter for human performance, and what is the strongest scientific evidence that targeted training can improve them?**

We need a researcher to help us:

1. **Validate or expand our dimension model** — Are we measuring the right things? Are there critical dimensions we're missing? Is our 4-dimension model sufficient, or should it be 5, 6, or restructured entirely?

2. **Strengthen the evidence base for each dimension** — For every dimension we claim to train, we need the strongest available evidence that (a) the construct is real and measurable, (b) targeted training produces meaningful improvement, and (c) improvement transfers to real-world outcomes.

3. **Ground our game mechanics in established paradigms** — Each game mode operationalizes a cognitive construct. We need to ensure our implementations are faithful to the research, not loosely inspired approximations.

4. **Identify what we can and cannot claim** — Where is the evidence strong enough to say "this trains X"? Where should we say "this measures X" instead? Where is the science genuinely contested?

5. **Build the reference library** — Key papers, meta-analyses, and foundational texts for each dimension. Not a literature dump — a curated set of the papers that actually matter.

---

## Current Cognitive Model

We currently measure and train **four dimensions**. This model is a starting point, not a conclusion. We want it challenged and refined.

### 1. Reaction Speed

**What we mean:** The time between perceiving a visual stimulus and executing a motor response. The efficiency of the entire perceptual-motor pipeline.

**How we measure it:** Millisecond-precision tap latency on every interaction. We track simple RT (single stimulus), choice RT (selecting among alternatives), and RT under increasing time pressure.

**How we train it:** One game mode (Ember/INTERCEPT) focuses on tapping cells as they illuminate, with flash durations that compress as performance improves. The adaptive engine pushes tempo until the user's accuracy begins to degrade.

**Current scientific grounding:**
- Simple and Choice RT (Donders, 1868)
- Hick's Law — RT increases logarithmically with number of alternatives (Hick, 1952)
- Speed-accuracy tradeoff / Drift-Diffusion Model (Ratcliff, 1978)

**What we need from research:**
- Is RT training transfer well-established, or is it mostly task-specific?
- What is the evidence for RT improvement persisting beyond training sessions?
- Are there better RT training paradigms than what we're using?
- How does RT relate to broader cognitive health and aging?
- What is the relationship between RT and fluid intelligence?

---

### 2. Working Memory

**What we mean:** The capacity to hold and manipulate information in conscious awareness over short periods. The "mental workspace" that underpins reasoning, comprehension, and problem-solving.

**How we measure it:** Maximum sequence length before failure. Each round adds elements to a spatial sequence the user must recall in order, scaling the memory load.

**How we train it:** One game mode (Arc/MEMORY) presents a sequence of illuminating cells that the user must reproduce from memory. The adaptive engine controls sequence length, growth rate, and spatial complexity (grid size expansion from 3×3 to 5×5).

**Current scientific grounding:**
- Spatial N-back task (Kirchner, 1958)
- Working Memory training and fluid intelligence transfer (Jaeggi et al., 2008)
- Multi-component Working Memory model (Baddeley, 2000)
- Visuospatial sketchpad as a WM subsystem (Baddeley & Hitch, 1974)

**What we need from research:**
- The Jaeggi et al. (2008) findings on WM training → fluid intelligence transfer are contested. What is the current state of this debate? Meta-analyses by Melby-Lervåg & Hulme (2013) and Au et al. (2015) reach different conclusions. Where does the evidence actually stand?
- Is spatial WM training (our approach) more or less transferable than verbal WM training?
- What is the optimal training dose? Daily? How many minutes? How many weeks before measurable improvement?
- What is the ceiling on WM improvement through training? Does it plateau?
- How does WM capacity relate to real-world outcomes (job performance, academic achievement, everyday functioning)?

---

### 3. Cognitive Flexibility

**What we mean:** The ability to shift between different mental sets, rules, or strategies in response to changing demands. The executive function that enables adaptive behavior when conditions change.

**How we train it:** One game mode (Tide/REVERSE) requires the user to recall sequences in reverse order, adding a mental transformation to the memory task. Additionally, "mutations" are rule changes introduced mid-session: Mirror (horizontal flip of spatial positions), Reverse (recall in opposite order), and Poison (inhibit response to a marked cell). The adaptive engine controls mutation frequency and selection.

**How we measure it:** Mutation survival rate and the RT "switch cost" — the increase in reaction time and decrease in accuracy immediately after a rule change compared to non-switch rounds.

**Current scientific grounding:**
- Task-switching paradigm and switch costs (Monsell, 2003)
- Wisconsin Card Sorting Test as a flexibility measure (Berg, 1948; Grant & Berg, 1948)
- Executive functions as separable but related constructs (Miyake et al., 2000)
- Set-shifting as a core executive function

**What we need from research:**
- Is our mutation system a valid operationalization of task-switching? Does it produce measurable switch costs that correspond to the construct?
- What is the evidence that cognitive flexibility can be trained, not just measured?
- How does flexibility relate to creativity, problem-solving, and adaptability in real-world settings?
- Are there better flexibility training paradigms we should consider?
- How does flexibility change with age? Is it the first executive function to decline?

---

### 4. Decision Speed (Speed-Accuracy Tradeoff)

**What we mean:** The ability to maintain response accuracy as processing speed increases. Not raw speed and not raw accuracy — the *interaction* between them under pressure.

**How we measure it:** Accuracy at peak tempo — the percentage of correct responses when the adaptive engine is pushing the user to their speed limit. This captures the efficiency of the decision-making process under time pressure.

**How we train it:** All three game modes contribute to this dimension. As the adaptive engine compresses flash timing, the user must make faster decisions about which cell to tap, when to respond, and whether to inhibit (poison cells). The engine specifically monitors the point where accuracy begins to degrade and trains the user to push that threshold further.

**Current scientific grounding:**
- Drift-Diffusion Model of decision-making (Ratcliff, 1978; Ratcliff & McKoon, 2008)
- Speed-accuracy tradeoff as a fundamental cognitive constraint
- Evidence accumulation models

**What we need from research:**
- Is "decision speed" a distinct cognitive dimension, or is it an emergent property of RT + WM + flexibility combined?
- Can the speed-accuracy tradeoff be trained, or is it a fixed individual characteristic?
- What is the relationship between decision speed and real-world decision-making (e.g., under time pressure in professional contexts)?
- Should we separate inhibitory control (Go/No-Go, poison cells) as its own dimension?

---

## Dimensions We're NOT Currently Measuring (But Should We?)

These are constructs we've considered but don't yet include. We need guidance on whether any should be added.

### Inhibitory Control
The ability to suppress a prepotent or automatic response. Currently folded into our flexibility dimension via poison cells (tap inhibition), but it may deserve standalone measurement. Research basis: Go/No-Go paradigm, Stop-Signal Task (Logan & Cowan, 1984), Stroop interference.

**Question:** Is inhibitory control distinct enough from cognitive flexibility to warrant its own dimension and training mode?

### Sustained Attention / Vigilance
The ability to maintain focus on a task over time. Our sessions are ~60 seconds, which may be too short to meaningfully train or measure sustained attention. Research basis: Continuous Performance Test (CPT), Psychomotor Vigilance Task (PVT).

**Question:** Can sustained attention be meaningfully trained in 60-second sessions, or does it require longer exposure? Should we add a longer session mode?

### Processing Speed
The speed at which cognitive operations are executed, independent of motor response. Related to but distinct from reaction time. Research basis: Digit Symbol Substitution, Trail Making Test, Processing Speed Index (Wechsler).

**Question:** Is our RT measurement already capturing processing speed, or is it confounded with motor speed? Should we separate them?

### Spatial Reasoning / Mental Rotation
The ability to mentally manipulate spatial representations. Our Mirror mutation touches this (horizontally flipping spatial positions), but it's not a dedicated training dimension. Research basis: Shepard & Metzler (1971), mental rotation tasks.

**Question:** Is spatial reasoning important enough for general cognitive performance to warrant its own mode?

### Episodic Memory / Long-Term Encoding
The ability to encode and retrieve specific experiences. Our app is entirely about short-term / working memory. Research basis: Distinction between WM and LTM, levels of processing (Craik & Lockhart, 1972).

**Question:** Should cognitive training include a long-term memory component, or is WM training sufficient?

---

## The Adaptive Engine — Why It Matters Scientifically

The adaptive difficulty engine is not just a product feature — it's a scientific claim. We claim that training is most effective when difficulty is personalized to maintain each individual in their Zone of Proximal Development (ZPD).

**How it works:** After every round (~5-10 seconds of play), the engine evaluates performance across a rolling window and adjusts four independent difficulty levers:

| Lever | What It Controls | Cognitive Target |
|-------|-----------------|------------------|
| Sequence Growth | How many elements are added per round (+1 to +3, or shrink) | Working Memory load |
| Tempo Ramp | How fast cell illumination speed changes (ms delta per round) | Reaction Speed / Processing Speed |
| Mutation Rate | Probability of a rule change on any given round (0–60%) | Cognitive Flexibility |
| Grid Size | Spatial complexity (3×3 → 4×4 → 5×5 grid) | Spatial Working Memory |

**The target:** Maintain the user's failure rate within a 15-30% band. This is derived from:
- Vygotsky's ZPD — learning occurs between what a person can do alone and what they can do with scaffolding
- The "85% Rule" (Wilson et al., 2019) — optimal learning occurs at ~85% accuracy (15% error rate)
- Yerkes-Dodson Law — performance follows an inverted U relative to arousal/difficulty

**What we need from research:**
- Is the 85% rule well-supported for motor-cognitive tasks like ours, or was it derived from different learning contexts?
- What is the optimal adaptation speed? Should the engine adjust every round, every 3 rounds, or on a different timescale?
- Are there individual differences in optimal difficulty that go beyond overall ability (e.g., some people learn better at 80% accuracy, others at 90%)?
- What does the evidence say about adaptive vs. fixed-difficulty training programs? Are there head-to-head studies?

---

## Transfer: The Central Scientific Challenge

The most important question in cognitive training research is **transfer**: does improvement on the training task generalize to other cognitive tasks and real-world outcomes?

The field broadly distinguishes:

| Transfer Type | Definition | Example |
|--------------|-----------|---------|
| **Near transfer** | Improvement on tasks similar to training | Training spatial N-back → better on verbal N-back |
| **Far transfer** | Improvement on dissimilar cognitive tasks | Training N-back → better fluid intelligence |
| **Real-world transfer** | Improvement in everyday cognitive functioning | Training WM → better job performance |

**What we need from research:**
- For each of our dimensions, what is the current evidence for near, far, and real-world transfer?
- Which dimensions have the strongest transfer evidence? Which are weakest?
- What training parameters (dose, frequency, duration, variability) maximize transfer?
- How should we communicate transfer evidence to users honestly? What can we say, and what would be overclaiming?
- Are there meta-analyses or systematic reviews we should treat as authoritative?

**Key papers we're aware of (need assessment of current standing):**
- Jaeggi et al. (2008) — WM training transfers to fluid intelligence (controversial)
- Melby-Lervåg & Hulme (2013) — meta-analysis questioning far transfer
- Au et al. (2015) — meta-analysis supporting some transfer
- Simons et al. (2016) — comprehensive review of cognitive training claims
- Sala & Gobet (2019) — meta-analysis of cognitive training programs
- The ACTIVE trial (Ball et al., 2002; Rebok et al., 2014) — largest cognitive training RCT

---

## What We Want to Be Able to Say

With appropriate scientific backing, we want to make claims at three levels:

### Level 1: Measurement (Confident)
"Pulse measures your reaction speed, working memory capacity, cognitive flexibility, and decision speed with millisecond precision."

→ This requires validated constructs and reliable measurement. We need to demonstrate that our game metrics correlate with established psychometric tests.

### Level 2: Training (Requires Evidence)
"Regular training with Pulse can improve your performance on these cognitive dimensions."

→ This requires evidence of within-task improvement that persists and isn't just practice effects. We need dose-response data and evidence distinguishing genuine cognitive improvement from task-specific learning.

### Level 3: Transfer (Aspirational, Needs Strong Evidence)
"Cognitive improvements from Pulse training transfer to real-world cognitive performance."

→ This is the strongest claim and requires the strongest evidence. We will only make this claim for dimensions where transfer evidence is robust. For others, we'll say "trains" or "measures" rather than "improves real-world performance."

---

## Competitive Scientific Positioning

| Competitor | Scientific Claim | Actual Evidence | Our Opportunity |
|-----------|-----------------|-----------------|-----------------|
| **Lumosity** | "Brain training" — FTC settlement for overclaiming | Some published studies, but claims exceeded evidence | Radical transparency. Show the science openly. Never overclaim. |
| **BrainHQ** | Strongest science (ACTIVE trial, IMPACT study) | Most rigorous evidence base in the category | Match rigor, modernize UX, add adaptive difficulty |
| **Peak** | "Personalized brain training" | Limited published research | Our adaptive engine is genuinely personalized, not marketing |
| **Elevate** | "Improve communication and math skills" | Education-focused, different construct | We focus on core cognitive dimensions, not domain skills |

**Our differentiator:** The adaptive engine generates structured training data from every session. This creates a dataset that enables:
1. Internal validation studies (do our metrics correlate with established tests?)
2. Dose-response analysis (how much training produces measurable improvement?)
3. Eventually, ML-driven difficulty optimization trained on real outcome data

---

## Deliverables We Need From Research Collaboration

1. **Dimension Validation Report** — For each of our 4 current dimensions: Is the construct valid? Is our operationalization faithful? Is there evidence that training works? What are the limitations?

2. **Gap Analysis** — Are there critical cognitive dimensions we should add? For each candidate (inhibitory control, sustained attention, processing speed, spatial reasoning, episodic memory): importance, trainability, and feasibility within our 60-second session format.

3. **Transfer Evidence Summary** — Current state of evidence for training transfer in each dimension. What can we claim at each of the three levels (measure, train, transfer)?

4. **Curated Reference Library** — 20-40 key papers organized by dimension. Not a comprehensive lit review — the papers that actually define the field and would withstand peer scrutiny.

5. **Claims Framework** — Language we can safely use for each dimension. What to say, what not to say, and where the evidence line is.

6. **Adaptive Training Evidence** — Does personalized adaptive difficulty produce better outcomes than fixed difficulty? What does the evidence say, and how should we cite it?

---

## Technical Details for Context

- **Platform:** Mobile app (iOS + Android), React Native
- **Session length:** ~60 seconds
- **Data captured per session:** Per-tap reaction times (ms precision), sequence accuracy, mutation survival, adaptive engine lever settings per round, grid size, flash duration
- **Sessions per day:** Designed for 1-2 daily sessions
- **User profile:** Rolling averages across last 10 sessions for baseline RT, WM capacity, flexibility rating, speed-accuracy threshold
- **Adaptive mechanism:** Rule-based engine (v1), designed to be replaced by ML model trained on accumulated session data (v2)
- **Data export:** Full CSV export available to all users (radical transparency positioning)

---

*This document is a working brief. It will evolve as research collaboration progresses. The goal is a product that is scientifically honest, clinically rigorous in its measurement, and genuinely useful for the people who use it.*
