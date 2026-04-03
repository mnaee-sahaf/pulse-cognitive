# PULSE
## Adaptive Cognitive Training — Comprehensive Design Document

**Version 2.0 · April 2026**
**CONFIDENTIAL** — Distribution restricted to authorized team members only.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scientific Foundation](#2-scientific-foundation)
3. [Adaptive Engine](#3-adaptive-engine)
4. [Game Mechanics](#4-game-mechanics)
5. [Design System](#5-design-system)
6. [Screens & User Flows](#6-screens--user-flows)
7. [Data Model & Analytics](#7-data-model--analytics)
8. [Technical Architecture](#8-technical-architecture)
9. [Monetization Strategy](#9-monetization-strategy)
10. [Growth & Retention Strategy](#10-growth--retention-strategy)
11. [Product Roadmap](#11-product-roadmap)
12. [Competitive Landscape](#12-competitive-landscape)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Success Metrics](#14-success-metrics)

---

## 1. Executive Summary

Pulse is a mobile-first adaptive cognitive training application that combines reaction-time measurement, pattern recognition, and rule-switching into short, scientifically-grounded sessions. What separates Pulse from every existing brain training app is its **adaptive difficulty engine**: a real-time system that finds each player's cognitive ceiling and keeps them training at the precise point where neuroplasticity is maximized.

Each session lasts approximately 60 seconds and produces a quantified cognitive profile across four dimensions: reaction speed, working memory, cognitive flexibility, and decision speed. The difficulty of every session is personalized — two players will never experience the same game, because the engine tailors tempo, complexity, and rule mutations to each individual's performance in real time.

### Vision Statement

To become the default daily cognitive training tool for knowledge workers, athletes, and anyone who values mental performance — by building the first brain training app that genuinely adapts to you, backed by transparent science and radical data openness.

### Core Differentiators

| Differentiator | What It Means |
|---|---|
| **Adaptive Engine** | Every session is personalized. The game finds your cognitive edge — the zone where you fail ~25–30% of the time — and keeps you there. No fixed difficulty ladder. Every competitor uses static escalation. |
| **Radical Data Transparency** | Full CSV export on the free tier. Open methodology whitepaper. Public scoring algorithms. We're so confident in the science that we show everything. No competitor does this. |
| **60-Second Commitment** | One game, one minute, four metrics. No bloated game library, no 15-minute sessions, no decision fatigue. The constraint is the product. |
| **Clinical Aesthetic** | Design language drawn from medical instrumentation and scientific publication, not gaming or wellness. Communicates: this is a precision instrument, not a toy. |

### Target Audience

**Primary:** Knowledge workers aged 22–45 already invested in self-optimization (fitness trackers, meditation apps, productivity tools). **Secondary:** Competitive gamers, athletes, and students preparing for high-stakes cognitive tasks. **Tertiary:** Aging adults interested in cognitive maintenance. **Enterprise:** Esports orgs, trading floors, sports teams, military units where cognitive readiness is a performance variable.

---

## 2. Scientific Foundation

Every mechanic in Pulse maps to established cognitive science research. This section documents the theoretical basis for each game element and the critical scientific principle underlying the adaptive engine.

### The Zone of Proximal Development

The adaptive engine is grounded in Vygotsky's zone of proximal development (ZPD) and the "85% Rule" formalized by Wilson et al. (2019). The core insight is that learning is maximized in a narrow band between tasks that are too easy (no cognitive strain, no adaptation) and tasks that are too hard (random failure, no useful signal). The optimal training zone is where a player is failing approximately 15–30% of the time — the task is hard enough to demand full cognitive engagement but achievable enough to permit meaningful learning.

Every existing brain training app uses fixed difficulty ladders: add one element per round, speed up by a constant, introduce new rules at predetermined thresholds. This means every player rides the same escalator regardless of ability. A competitive gamer with 200ms baseline RT rides the same curve as a casual user with 500ms RT. The gamer is bored for the first 5 rounds; the casual user is overwhelmed by round 3. Neither spends much time in their ZPD.

Pulse's adaptive engine solves this by observing performance in real time and adjusting difficulty to maintain each player at their personal cognitive edge. The result: every session feels the same kind of hard, regardless of ability level. This is both the optimal training experience and the optimal engagement experience.

### Reaction Time Training

**Construct:** Simple and Choice Reaction Time (Donders, 1868; Hick, 1952)

Pulse measures RT at millisecond precision on every tap. As sequences grow longer, the task shifts from simple RT to choice RT, which Hick's Law predicts increases logarithmically with alternatives. The adaptive engine uses running RT averages to calibrate tempo — if a player's RT is consistently below the current flash duration, the engine compresses timing to push them toward their speed ceiling.

### Working Memory (N-Back)

**Construct:** Working Memory Capacity (Kirchner, 1958; Jaeggi et al., 2008; Baddeley, 2000)

The core "watch and repeat" mechanic is a spatial N-back task. Each round adds elements to the sequence, scaling working memory load. The adaptive engine controls how aggressively this scales — for high-performing players, it may add 2 elements per round instead of 1, while for struggling players it holds the sequence length steady and adjusts other axes instead.

### Cognitive Flexibility (Task-Switching)

**Construct:** Executive Function, Set-Shifting (Monsell, 2003; Wisconsin Card Sorting Test)

The mutation system — rule changes mid-game (mirror, reverse, poison) — operationalizes the task-switching paradigm. The switch cost (increased RT and errors after a rule change) reflects cognitive overhead of reconfiguring task sets. The adaptive engine controls mutation frequency and type selection: players who handle mutations easily get them more frequently; players who struggle get more rounds to consolidate before the next switch.

### Speed-Accuracy Tradeoff

**Construct:** Drift-Diffusion Model (Ratcliff, 1978)

As tempo increases, players navigate the speed-accuracy tradeoff: responding faster increases error probability. The adaptive engine uses this relationship directly — it monitors the ratio of correct-to-incorrect taps at the current speed and adjusts tempo to maintain the target failure rate.

### Measurement Summary

| Dimension | Game Mechanic | Scientific Basis | Metric |
|---|---|---|---|
| Reaction Speed | Tap targets as they appear | Donders RT, Hick's Law | Milliseconds per tap |
| Working Memory | Repeat growing sequences | N-Back, Baddeley WM | Max sequence length |
| Cognitive Flexibility | Adapt to rule mutations | WCST, Task-Switching | Switch cost (RT delta) |
| Decision Speed | Maintain accuracy at speed | Drift-Diffusion Model | Accuracy at peak tempo |

---

## 3. Adaptive Engine

The adaptive engine is Pulse's core technical differentiator. It replaces the traditional fixed difficulty ladder with a real-time system that personalizes every session to each player's cognitive profile. This section specifies the engine's architecture, control levers, decision logic, and evolution path from rule-based to ML-driven.

### Design Principle

The engine operates on a single governing principle: **maintain the player's failure rate within a target band of 20–30% across a rolling window of the last 3 rounds.** This target is derived from the 85% Rule (Wilson et al., 2019) adjusted upward for the multi-dimensional cognitive load of Pulse's combined memory + speed + flexibility demands.

If the player's rolling failure rate drops below 20% (they're finding it too easy), the engine increases difficulty. If it rises above 30% (they're overwhelmed), the engine eases off. The player consciously experiences a game that always feels "right at the edge" — challenging but achievable. Unconsciously, they're spending maximum time in their zone of proximal development.

### Control Levers

The engine adjusts difficulty across four independent axes. Each lever can be tuned independently, allowing fine-grained difficulty control:

| Lever | Range | Effect | Cognitive Target |
|---|---|---|---|
| Sequence Growth | +1 to +3 elements/round | Controls how fast working memory load increases | Working Memory |
| Tempo Ramp | 0ms to −50ms/round (floor: 200ms) | Controls how fast flash duration compresses | Reaction Speed |
| Mutation Rate | 0% to 60% per round | Controls how often rules change | Cognitive Flexibility |
| Grid Expansion | Round 4–10 trigger | When 3×3 → 4×4 → 5×5 transitions occur | Spatial Complexity |

### Decision Logic (v1.0 — Rule-Based)

The v1.0 engine uses a deterministic rule-based system. After each round, it evaluates the player's recent performance and adjusts levers for the next round.

#### Input Signals

- Rolling accuracy over last 3 rounds (correct taps / total taps)
- Rolling average RT over last 3 rounds
- RT trend direction (improving, stable, degrading)
- Mutation survival rate (did the player pass the last mutation round?)
- Current round number (to avoid adjusting too aggressively early)

#### Adjustment Rules

| Condition | Action | Rationale |
|---|---|---|
| Accuracy > 90% for 3 rounds AND avg RT < 350ms | Increase sequence growth to +2/round, increase tempo ramp to −40ms/round, unlock mutation rate to 50% | Player is well below their ceiling. Accelerate on all axes. |
| Accuracy > 90% but avg RT > 450ms | Hold sequence growth at +1, increase tempo ramp to −35ms/round | Memory is fine but speed is slow. Push RT specifically. |
| Accuracy 70–90% and avg RT < 400ms | Maintain current settings. This is the target zone. | Player is in their ZPD. Don't adjust. |
| Accuracy < 70% for 2 rounds | Reduce sequence growth to +1, slow tempo ramp to −15ms/round, reduce mutation rate to 20% | Player is overwhelmed. Ease back to let them consolidate. |
| Failed mutation round (wrong tap during mutation) | Reduce mutation rate by 15%, prefer simpler mutations next (Poison > Mirror > Reverse) | Flexibility is the weak link. Reduce set-shifting demand, train it more gradually. |
| Survived 3 consecutive mutation rounds | Increase mutation rate by 10%, unlock harder mutations (Reverse, Dual Sequence) | Flexibility is strong. Increase the challenge on this axis. |

### Player Profile & Cross-Session Learning

The engine doesn't start from scratch each session. It maintains a persistent player profile that captures baseline cognitive metrics:

- **Baseline RT:** Rolling average of the player's first-tap RT across the last 10 sessions. Used to set initial tempo.
- **WM Capacity Estimate:** Average max sequence length before failure across last 10 sessions. Used to set initial sequence growth rate.
- **Flexibility Rating:** Mutation survival rate across last 10 sessions. Used to set initial mutation frequency.
- **Speed-Accuracy Profile:** The RT threshold at which accuracy drops below 80%. Identifies whether the player's bottleneck is memory or speed.

On session start, the engine uses this profile to set initial lever positions, then begins real-time adjustments from round 1. A first-time player with no profile data starts on default settings (equivalent to the original fixed difficulty curve) and the profile builds over 3–5 sessions.

### Evolution Path: Rule-Based → ML-Driven

The rule-based engine is designed to be replaced. Every session generates structured training data: the lever settings for each round, the player's performance on that round, and whether the round was passed or failed. This creates a labeled dataset mapping (player profile + lever settings) → (outcome).

1. **Phase 1 (v1.0):** Deterministic rules. Ship fast, validate the core mechanic, collect data.
2. **Phase 2 (v1.5, ~10K sessions collected):** Lightweight regression model trained on collected data. Predicts optimal lever settings given a player profile. A/B tested against rule-based engine.
3. **Phase 3 (v2.0, ~100K sessions):** Reinforcement learning agent. The reward signal is maintaining the player in the target failure-rate band for the longest possible session. The agent learns lever-adjustment policies that outperform any hand-tuned rules.
4. **Phase 4 (v3.0, ~1M sessions):** Multi-objective optimization. The agent balances failure rate, session duration, user engagement (return rate), and actual cognitive improvement (measured by RT trend over weeks). This is the moat — the model improves with every session across every user, and no competitor can replicate the dataset.

### Why This Can't Be an Afterthought

If the adaptive engine ships in v1, every session from day one generates training data for the ML model. If it ships in Phase 4 (as originally planned), the first 12 months of session data is collected against a fixed difficulty curve and is largely useless for training an adaptive model — the data doesn't contain the lever-adjustment → outcome signal the model needs. The data moat starts accumulating on launch day, not a year later.

---

## 4. Game Mechanics

### Core Loop

The fundamental gameplay loop follows a **Watch → Recall → Adapt → Escalate** cycle:

1. **Watch Phase:** The system illuminates cells in sequence. The player observes without interacting.
2. **Recall Phase:** The player reproduces the sequence by tapping cells in the correct order. Each tap is timed in milliseconds.
3. **Adapt Phase:** The adaptive engine evaluates performance data from the completed round and adjusts lever settings for the next round.
4. **Escalate Phase:** The sequence grows (by 1–3 elements based on engine decision), tempo adjusts, and a mutation may be introduced. The loop restarts.

A session ends when the player makes an incorrect tap or taps a poison cell. The adaptive engine ensures natural session termination typically within 45–90 seconds by maintaining difficulty at the player's edge.

### Mutation System

Mutations are temporary rule modifications that train cognitive flexibility. The adaptive engine controls when and which mutations appear based on the player's flexibility rating.

#### v1.0 Mutations

- **Mirror:** Sequence displayed normally; player taps horizontally mirrored positions. Engages spatial transformation and mental rotation.
- **Reverse:** Sequence displayed normally; player reproduces in reverse order. Adds backward span to working memory load.
- **Poison:** One cell marked with red ×. Player must avoid it while completing the sequence. Introduces inhibitory control (Go/No-Go paradigm).

#### v2.0 Mutations (Unlocked by Adaptive Engine)

- **Color Inversion:** Cells flash in color; player taps only cells of a specific color in order, ignoring distractors. Stroop-like interference.
- **Dual Sequence:** Two interleaved sequences in different colors. Player reproduces only one. Selective attention and filtering.
- **Delayed Response:** 3-second blank screen between Watch and Recall phases. Delayed match-to-sample.
- **Grid Rotation:** Grid rotates 90° between Watch and Recall. Mental rotation (Shepard & Metzler paradigm).

### Scoring Algorithm

The scoring system rewards sustained performance at difficulty, with the adaptive engine's difficulty level factored into the multiplier:

```
Base Points        = Sequence Length × 10
Speed Bonus        = max(0, 500 − RT) per tap
Mutation Bonus     = 1.5× multiplier when active
Difficulty Mult    = 1.0 + (engine_intensity × 0.5)
Round Score        = (Base + Σ Speed Bonuses) × Mutation × Difficulty
```

The `engine_intensity` value (0.0–1.0) reflects how aggressively the adaptive engine is pushing difficulty. This ensures players who are being challenged harder earn proportionally more points, maintaining fair leaderboard comparison across skill levels.

---

## 5. Design System

### Design Philosophy

Pulse's visual identity draws from medical instrumentation and scientific publication design. The aesthetic communicates: this is a precision tool, not a toy.

1. **Clinical Restraint:** Color is used sparingly. The palette is predominantly neutral with a single accent for interactive elements and data.
2. **Typographic Hierarchy:** Information is communicated through type size, weight, and spacing rather than color or decoration.
3. **Data Density:** Post-session screens present information at a density closer to a lab report than a game-over screen.
4. **Micro-Motion:** Animations are subtle, functional, and physics-based. Motion communicates state change, not personality.

### Color Palette

| Token | Value | Usage |
|---|---|---|
| Background | `#F7F6F3` | Primary app background. Warm off-white. |
| Card Surface | `#FFFFFF` | Elevated surfaces: grid cells, metric cards, modals. |
| Text Primary | `#1A1A1A` | Headings, scores, primary content. |
| Text Secondary | `#6B6B6B` | Labels, descriptions, supporting copy. |
| Text Tertiary | `#9E9E9E` | Uppercase category labels, timestamps. |
| Accent | `#2D5BFF` | Interactive elements, active cell, primary data color. |
| Accent Soft | `#EEF2FF` | Accent backgrounds for badges, highlights. |
| Success | `#22C55E` | Correct tap feedback, positive RT readings. |
| Danger | `#EF4444` | Incorrect tap, poison cell, session end. |
| Warning | `#F59E0B` | Mutation indicators, caution states. |
| Border | `#E8E6E1` | Card borders, dividers, grid cell outlines. |

### Typography

| Element | Typeface | Weight / Size | Usage |
|---|---|---|---|
| Display | Source Serif 4 | 600 / 28px | Headings, score numbers, metric values. |
| Body | DM Sans | 400 / 15px | Descriptions, status messages, general copy. |
| Label | DM Sans | 500 / 11px uppercase | Category labels, phase indicators, section headers. |
| Monospace Data | SF Mono / system | 500 / 15px | RT display (ms), timer countdowns. |
| Logo | Source Serif 4 | 600 / 22px | App wordmark with animated blue dot. |

### Spacing & Animation

8px base grid, 20px page padding, 420px max content width for one-handed mobile use. 10px grid gap, 16px card radius, 10px cell radius. Elevation via 1.5px borders, not drop shadows.

- **Cell illumination:** 150ms ease with 3% scale and soft shadow bloom.
- **Correct tap:** 350ms green flash with scale bump (1.1× → 1.0×).
- **Wrong tap:** 400ms horizontal shake (±4px oscillation), red flash.
- **Countdown:** Scale-in from 0.5× to 1.1× to 1.0× over 600ms with frosted overlay (blur 4px, 92% opacity).
- **Results bars:** cubic-bezier(0.22, 1, 0.36, 1) over 800ms, staggered 100ms.

---

## 6. Screens & User Flows

### Screen Inventory

| Screen | Purpose | Key Elements |
|---|---|---|
| Home | Session launchpad and performance overview | Logo, lifetime metrics, cognitive profile trends, Begin Session CTA |
| Countdown | Transition overlay preparing user | 3-2-1 countdown with scale animation, frosted overlay |
| Game | Core gameplay canvas | Round/score HUD, phase indicator, cell grid, RT display, mutation badge, adaptive intensity meter |
| Results | Post-session cognitive snapshot | Four metric cards, cognitive profile bars, engine difficulty report, Home/Again CTAs |
| History * | Longitudinal performance trends | RT trend, accuracy over time, rounds/session, streak calendar, adaptive ceiling tracker |
| Settings * | Preferences and account | Haptic toggle, sound toggle, data export, account management |
| Onboarding * | First-run tutorial and calibration | Science explainer, calibration taps (to seed player profile), practice round |

\* Denotes planned screens not yet implemented in the prototype.

### Primary User Flow

Home → Countdown → Game → Results → Home (or Game again). A returning user goes from app launch to active gameplay in under 4 seconds. Every additional tap between "open app" and "playing" is friction that erodes daily habit formation. The adaptive engine runs silently — the player never sees difficulty being adjusted, they only feel it.

---

## 7. Data Model & Analytics

### Session Data Schema

| Field | Type | Description |
|---|---|---|
| `session_id` | UUID | Unique session identifier |
| `timestamp` | ISO 8601 | Session start time |
| `rounds_completed` | Integer | Rounds completed before failure |
| `total_score` | Integer | Cumulative session score |
| `reaction_times[]` | Int[] | Per-tap RT values in milliseconds |
| `avg_rt` | Float | Mean RT across all taps |
| `best_rt` | Integer | Fastest single-tap RT |
| `accuracy` | Float | Correct taps / total taps (0.0–1.0) |
| `mutations_faced` | String[] | Mutations encountered |
| `mutations_survived` | Integer | Mutation rounds passed |
| `engine_lever_log[]` | Object[] | Per-round lever settings (sequence growth, tempo ramp, mutation rate, grid size) |
| `engine_intensity` | Float | Peak engine intensity reached (0.0–1.0) |
| `player_profile_snapshot` | Object | Player profile at session start (baseline RT, WM capacity, flex rating) |
| `wm_score` | Float | Working memory score (0–100) |
| `rt_score` | Float | Reaction speed score (0–100) |
| `flex_score` | Float | Cognitive flexibility score (0–100) |
| `decision_score` | Float | Decision speed score (0–100) |

The `engine_lever_log` field is critical for the ML evolution path. It captures exactly what the adaptive engine did on each round and the player's response, creating the labeled dataset needed to train the regression model in Phase 2 and the RL agent in Phase 3.

---

## 8. Technical Architecture

### Platform Strategy

| Phase | Platform | Rationale |
|---|---|---|
| v1.0 (MVP) | React Native (Expo) | Single codebase for iOS + Android. Expo simplifies build pipeline. Adaptive engine runs client-side in TypeScript. |
| v1.5 | Progressive Web App | Web distribution for growth. Service worker for offline. Engine model weights downloaded on first load. |
| v2.0+ | Native Swift/Kotlin modules | Sub-ms RT precision for pro/clinical tier. RL agent runs on-device via ONNX Runtime. |

### Architecture Overview

- **Game Engine:** Pure TypeScript state machine. Manages sequence generation, timing, scoring, and state transitions. The adaptive engine is a module within the game engine, not a separate service.
- **Adaptive Engine Module:** Receives performance signals after each round. Outputs lever adjustments for the next round. v1.0: rule-based functions. v2.0: ONNX model inference. Swappable via strategy pattern.
- **UI Layer:** React Native components subscribing to engine state via Zustand. Responsible only for rendering and forwarding touch events.
- **Data Layer:** Local-first with SQLite (expo-sqlite) for session history, player profile, and engine lever logs. Cloud sync via Supabase for cross-device continuity and aggregate analytics.
- **Analytics:** PostHog for product analytics. Engine lever logs synced to a data warehouse (BigQuery) for ML model training. Privacy-first: no PII, cognitive data stored locally by default.

### RT Precision Considerations

Touch-to-event latency: ~8–40ms depending on device. JS event loop jitter: ~1–4ms (Hermes engine). Mitigation: `performance.now()` for timing, relative RT measurement (tap-to-tap delta), device-class normalization via calibration tap during onboarding. Consumer tier precision: ±10ms. Native modules in v2.0 enable sub-millisecond precision for clinical use.

---

## 9. Monetization Strategy

### Freemium Model

Core game with adaptive engine is permanently free. Premium features expand analytics and personalization. Critical design decision: **CSV data export is free, not gated.** This is the radical transparency play — it builds trust and differentiates from competitors who gate data behind paywalls.

| Free | Pro ($4.99/mo) | Teams ($9.99/seat/mo) |
|---|---|---|
| Unlimited sessions + adaptive engine | Everything in Free, plus: | Everything in Pro, plus: |
| Full cognitive profile | Unlimited history + trends | Team leaderboards |
| 3 mutation types | All 7 mutation types | Admin dashboard |
| 7-day history | Percentile ranking | Aggregate team analytics |
| CSV data export | Custom training programs | Pre-session warmup protocols |
| | Adaptive engine insights | API access |

### Revenue Projections

- Free-to-Pro conversion: 3–5% (industry average for cognitive training apps).
- Target: 100K MAU by month 12, yielding 3–5K Pro subscribers = $15–25K MRR.
- Teams targets esports orgs, trading floors, sports teams, military readiness programs. Higher ARPU, longer contract cycles.

---

## 10. Growth & Retention Strategy

### Habit Formation Mechanics

The adaptive engine is itself a retention mechanism. Because the game always feels the same kind of hard regardless of how much the player improves, there's no natural plateau where the game becomes boring (too easy) or frustrating (too hard). The engine maintains the player in the engagement sweet spot indefinitely.

1. **Trigger:** Daily push notification. Copy rotates between performance hooks ("Your RT improved 12% this week") and adaptive engine hooks ("Your ceiling moved up — new personal best incoming?").
2. **Action:** Sub-4-second path from app open to gameplay.
3. **Variable Reward:** Each session produces a unique cognitive profile. The adaptive engine ensures no two sessions feel the same, even at similar skill levels.
4. **Investment:** Session data feeds the player profile, making the adaptive engine more accurate over time. The more you play, the better Pulse knows your brain. This is a switching cost competitors can't replicate.

### Viral Mechanics

- **Shareable cognitive snapshots:** Post-session branded card for Stories/X showing four cognitive scores and adaptive ceiling level.
- **Challenge links:** "Beat my score" deep link that opens Pulse into a session with the challenger's score as target.
- **Ceiling milestones:** When the adaptive engine pushes your difficulty to new levels, shareable milestone cards are generated. "Your brain is now performing at Level 14 — top 8% of Pulse users."
- **Streaks:** Daily session streaks with celebrations at 7, 30, 100, 365 days.

### Content Marketing

The adaptive engine gives Pulse a unique content angle no competitor can match. Blog themes: "How Pulse Finds Your Cognitive Ceiling," "The 85% Rule: Why Your Brain Learns Best at the Edge of Failure," "Why Fixed-Difficulty Brain Training Doesn't Work," "Open Data: Why We Give You Your Cognitive Data for Free." Each piece positions the adaptive engine as the technical moat and links to the app as the tool.

---

## 11. Product Roadmap

The roadmap is structured around the adaptive engine's evolution. Every phase serves two purposes: shipping user-facing features and collecting data to make the engine smarter.

### Phase 1: Adaptive Foundation (Months 1–3)

*Ship the core product with the rule-based adaptive engine from day one. Every session generates training data.*

1. React Native (Expo) app with core game loop and rule-based adaptive engine
2. 3 mutations (Mirror, Reverse, Poison) with engine-controlled frequency
3. Dynamic grid expansion (3×3 → 4×4) triggered by engine, not fixed round
4. Player profile system: baseline RT, WM capacity, flexibility rating
5. Onboarding with calibration taps to seed initial player profile
6. Home, Game, Results screens with cognitive profile and engine intensity report
7. Local data persistence (SQLite) including engine lever logs
8. CSV export on free tier (radical transparency from launch)
9. PostHog analytics + lever log pipeline to BigQuery
10. App Store + Google Play launch

### Phase 2: Intelligence (Months 4–6)

*Train the first ML model on collected data. Expand the game's cognitive surface area.*

- Regression model trained on ~10K+ sessions, A/B tested against rule-based engine
- History screen with longitudinal trends: RT, accuracy, rounds, adaptive ceiling over time
- 4 new mutations: Color Inversion, Dual Sequence, Delayed Response, Grid Rotation
- 5×5 grid tier unlocked by adaptive engine for elite players
- Pro tier launch with Supabase cloud sync, unlimited history, percentile ranking
- Shareable cognitive snapshot cards with adaptive ceiling level
- Push notifications with engine-aware copy
- Apple Health and Google Fit integration

### Phase 3: Scale & Compete (Months 7–12)

*RL agent replaces regression model. Launch Teams tier for enterprise. Go wide.*

- Reinforcement learning agent trained on ~100K sessions, optimizing for ZPD maintenance
- PWA for web distribution
- Teams tier: admin dashboard, team leaderboards, aggregate cognitive analytics
- Challenge links and competitive multiplayer (matched by adaptive ceiling, not raw score)
- Custom training programs targeting specific cognitive dimensions
- Localization (10 languages)
- Research partnership program: open-access methodology paper, IRB-ready data export
- Public API for third-party integrations

### Phase 4: Precision & Moat (Year 2)

*Multi-objective optimization. The engine becomes the product.*

- Native Swift/Kotlin modules for sub-millisecond RT precision
- Multi-objective RL agent: balances failure rate, session duration, engagement (return rate), and actual cognitive improvement (RT trend over weeks)
- Clinical/research tier with IRB-ready protocols and research dashboard
- Wearable integration (Apple Watch, Galaxy Watch) for biometric × cognitive correlation
- Peer-reviewed publication on adaptive training efficacy vs. fixed-difficulty training
- Enterprise partnerships: esports pre-scrim warmup, trading floor readiness, sports science integration
- **The data moat:** ~1M+ sessions of (lever settings → outcome) training data. No competitor can replicate this dataset without building the same adaptive infrastructure and waiting for the same volume of users.

---

## 12. Competitive Landscape

| App | Strengths | Weaknesses | Pulse Advantage |
|---|---|---|---|
| **Lumosity** | Strong brand, large library, published research | Dated UI, bloated, FTC settlement, fixed difficulty | Adaptive engine, minimal design, transparent scoring, data export |
| **Peak** | Good design, diverse games, coaching | Too many games, 5+ min sessions, fixed difficulty per game | Single perfected mechanic, 60s sessions, personalized difficulty |
| **Elevate** | Beautiful UI, language/math skills | Broader education focus, not cognitive performance, no adaptive engine | Pure cognitive focus, ms-precision, real-time adaptation |
| **BrainHQ** | Strongest science (ACTIVE trial), clinical credibility | Extremely dated UI, desktop-first, expensive, no modern adaptive system | Modern mobile-first, comparable rigor, ML-driven adaptation, consumer pricing |

Pulse's core moat is the adaptive engine and the data flywheel it creates. Fixed-difficulty competitors cannot replicate the personalized training experience without rebuilding their core architecture, and even then they lack the training data to power an ML model. The data advantage compounds with every user and every session.

---

## 13. Risks & Mitigations

| Severity | Risk | Impact | Mitigation |
|---|---|---|---|
| **High** | Scientific claims attract regulatory scrutiny (FTC precedent) | Fines, brand damage | Never claim guaranteed improvement. Use "train" and "measure." Legal review all copy. |
| **High** | Adaptive engine feels unfair or confusing to users | Support complaints, poor reviews | Engine runs invisibly. Optional "adaptive insights" screen for Pro users. Extensive user testing. |
| **Medium** | Single-mechanic fatigue | D30 retention drops below 10% | Adaptive engine prevents plateau. 7 mutations provide variety. Monitor engagement. |
| **Medium** | RT precision questioned by researchers | Credibility loss | Publish methodology whitepaper. Calibration tap on onboarding. Native modules in v2.0. |
| **Medium** | ML model degrades or produces bad experiences | User frustration, churn spike | Rule-based fallback always available. Gradual rollout with A/B testing. Automatic rollback triggers. |
| **Low** | Competitor copies adaptive approach | Market share pressure | Data moat: 12+ months of training data head start. First-mover in "adaptive brain training." |

---

## 14. Success Metrics

### North Star Metric

**Daily Active Sessions (DAS):** Completed sessions per day across all users. Target: 50K DAS by month 6. The adaptive engine should improve this metric directly by eliminating early-quit frustration and late-game boredom.

### Adaptive Engine Metrics

| Engine Metric | Target | Why It Matters |
|---|---|---|
| ZPD Adherence Rate | 70%+ of rounds within 20–30% failure band | Core engine objective. Validates that the engine is finding the edge. |
| Session Duration Variance | <15% CoV across skill levels | Sessions should feel similar length regardless of ability. Engine is equalizing. |
| First-Session Profile Accuracy | <20% deviation from session-5 profile | Calibration taps should produce a useful initial profile quickly. |
| ML vs. Rule-Based Lift | >10% improvement in ZPD adherence | Justifies the ML investment. Measured via A/B test. |
| Ceiling Progression Rate | Measurable increase over 30-day windows | Players should see their adaptive ceiling rise. This is the "it works" signal. |

### Product KPIs

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Monthly Active Users | 10K | 50K | 100K |
| D1 Retention | 50% | 55% | 60% |
| D7 Retention | 30% | 35% | 40% |
| D30 Retention | 15% | 22% | 28% |
| Avg Sessions/User/Day | 1.3 | 1.6 | 1.9 |
| Free → Pro Conversion | 2% | 3.5% | 5% |
| App Store Rating | 4.5+ | 4.6+ | 4.7+ |
| MRR | $1K | $8K | $25K |

*Note: D1/D7/D30 retention targets are higher than the original document because the adaptive engine is expected to reduce both early frustration (casual users) and late boredom (advanced users), which are the two primary drivers of churn in brain training apps.*

---

*Pulse Design Document v2.0 · April 2026*