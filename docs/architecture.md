# Pulse — Architecture & Design Document

**Last updated:** April 2026  
**Version:** 1.0 (Phase 1 complete)  
**Repo:** https://github.com/mnaee-sahaf/pulse-cognitive

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Key Decisions](#2-tech-stack--key-decisions)
3. [Repository Structure](#3-repository-structure)
4. [Data Flow](#4-data-flow)
5. [Layer-by-Layer Architecture](#5-layer-by-layer-architecture)
6. [Screen Inventory & Navigation](#6-screen-inventory--navigation)
7. [Database Schema](#7-database-schema)
8. [Design System](#8-design-system)
9. [Companion System](#9-companion-system)
10. [Development Setup](#10-development-setup)
11. [Testing](#11-testing)
12. [What's Built vs What's Planned](#12-whats-built-vs-whats-planned)
13. [Known Constraints & Gotchas](#13-known-constraints--gotchas)

---

## 1. Project Overview

Pulse is a mobile-first adaptive cognitive training app. Players complete 60-second sessions of a spatial memory game (Watch → Recall → Adapt → Escalate loop). The core differentiator is an adaptive engine that personalizes difficulty in real time, keeping each player at their cognitive edge.

The companion system (Pokémon-inspired) gives players a persistent creature that grows and evolves as they play, providing long-term engagement hooks.

Full product spec lives in `specs.md`. Adaptive engine explained in `docs/adaptive-engine.md`.

**Spec / doc / code drift:** see `docs/KNOWN_INCONSISTENCIES.md` for a maintained list of mismatches (including data-model issues such as `engine_lever_log`).

---

## 2. Tech Stack & Key Decisions

### Core Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React Native 0.81.5 + Expo SDK 54 | Cross-platform, managed build pipeline |
| Routing | Expo Router v6 (file-based) | Simpler than React Navigation for this screen count |
| Animations | React Native Reanimated 4.1.1 | UI-thread animations don't compete with game loop JS |
| Gestures | react-native-gesture-handler 2.28 | Pairs with Reanimated, UI-thread tap events |
| State | Zustand 5 | Lightweight, minimal boilerplate, good for reactive game state |
| Local DB | expo-sqlite v16 | Async SQLite on device, no network dependency |
| File export | expo-file-system (legacy API) + expo-sharing | CSV export via native share sheet |
| Build | expo-dev-client | Required for Reanimated 4 native modules |

### Critical Decisions

**Why Reanimated 4, not 3:**  
Reanimated 4 requires `react-native-worklets` as a separate TurboModule package. Reanimated 3.x is incompatible with React Native 0.81's folly headers (compile error: `folly/coro/Coroutine.h not found`). There is no working Reanimated version for this RN version that runs in Expo Go — a development build is required.

**Why expo-dev-client (not Expo Go):**  
Reanimated 4's `react-native-worklets` TurboModule is not bundled in Expo Go. Attempting to use Expo Go results in `Exception in HostFunction: <unknown>` on import. All testing must be done via a dev build (`npx expo run:ios --device`).

**Why expo-file-system legacy API:**  
expo-file-system v19 exposes two APIs — a new class-based API and a legacy functional API. `cacheDirectory` and `EncodingType` only exist on the legacy API. Import from `expo-file-system/legacy` not `expo-file-system`.

**Why local-first SQLite (not direct Supabase):**  
Game data must be available offline instantly. SQLite is the source of truth on device. Supabase sync is planned for Phase 2 and will be additive — not a replacement.

**Why Zustand (not Redux or Context):**  
The game state machine has rapid updates (every tap, every flash). Redux overhead and Context re-render patterns would cause frame drops during gameplay. Zustand's subscriptions are granular — components only re-render for the specific slice they subscribe to.

---

## 3. Repository Structure

```
pulse-cognitive/
│
├── app/                          # Expo Router screens (file = route)
│   ├── _layout.tsx               # Root layout: SafeAreaProvider + Stack navigator
│   ├── index.tsx                 # Home screen
│   ├── choose-companion.tsx      # First-run companion selection
│   ├── countdown.tsx             # 3-2-1 pre-session transition
│   ├── game.tsx                  # Core gameplay screen
│   ├── results.tsx               # Post-session results + XP award
│   ├── history.tsx               # Session history + RT trend chart
│   └── settings.tsx              # App settings (lives, haptics, background, etc.)
│
├── engine/                       # Pure TypeScript game logic (no React)
│   ├── __tests__/                # Jest unit tests (129 tests)
│   ├── sequenceGenerator.ts      # Grid sequences, mutation transforms
│   ├── adaptiveEngine.ts         # 4-lever rule-based difficulty engine
│   ├── boosterEngine.ts          # Training phases + booster session logic
│   ├── engineConfig.ts           # EngineConfig interface + tunable defaults
│   ├── gameStateMachine.ts       # Session state machine + RT measurement
│   └── scoring.ts                # Round score formula + cognitive scores
│
├── store/
│   ├── gameStore.ts              # Zustand store — bridges engine to UI
│   └── appSettingsStore.ts       # Zustand store — app settings (synced from DB)
│
├── components/
│   ├── Cell.tsx                  # Grid cell with Reanimated 4 animations
│   ├── Grid.tsx                  # Renders NxN grid, computes cell sizes
│   ├── Companion.tsx             # Companion shape + idle/celebrate animations
│   ├── AnimatedBackground.tsx    # Optional animated background effect
│   ├── FallingItemsGrid.tsx      # Ember mode falling-item visual (WIP)
│   └── LevelUpModal.tsx          # Level-up / evolution overlay
│
├── hooks/                        # Shared React hooks
│
├── db/
│   ├── database.ts               # SQLite init + migration runner
│   ├── sessions.ts               # Session CRUD + lifetime stats queries
│   ├── playerProfile.ts          # Player profile load/update
│   ├── engineConfig.ts           # Per-session engine config persistence
│   ├── appSettings.ts            # App settings CRUD
│   ├── companion.ts              # Companion definitions, XP/level logic, CRUD
│   └── export.ts                 # CSV export → native share sheet
│
├── constants/
│   └── theme.ts                  # All design tokens (colors, spacing, font sizes)
│
├── docs/
│   ├── architecture.md           # This file
│   ├── adaptive-engine.md        # Plain-english engine explanation
│   └── KNOWN_INCONSISTENCIES.md  # Tracked spec/doc/code divergences
│
├── specs.md                      # Full product specification (v2.0)
├── app.json                      # Expo config (bundle ID, plugins, new arch)
├── .github/workflows/test.yml    # CI: runs tests on push/PR to main
├── babel.config.js               # babel-preset-expo only (no reanimated plugin needed)
└── package.json
```

---

## 4. Data Flow

### Session Data Flow

```
User taps Begin Session
        │
        ▼
countdown.tsx
  loadPlayerProfile() ──► SQLite player_profile
        │
        ▼ profile (or null)
  startSession(profile)
        │
        ▼
gameStore.ts (Zustand)
  createInitialGameState(profile)
  buildRound() ──► engine/sequenceGenerator.ts
        │
        ▼
game.tsx
  Watch phase: setFlashIndex() fires on setTimeout loop
  Recall phase: user taps → handleTap()
        │
        ▼
gameStore.ts
  processTap() ──► engine/gameStateMachine.ts
        │
  correct? ──► advance to next tap
  wrong?   ──► lives > 1? loseLife() → rebuild round; else phase = 'ended'
  round complete? ──► phase = 'feedback'
        │
        ▼ (on feedback)
  completeRound()
    updateEngine() ──► engine/adaptiveEngine.ts  (adjusts levers)
    buildRound()   ──► next round state
        │
        ▼
results.tsx
  saveSession() ──► SQLite sessions
  updatePlayerProfile() ──► SQLite player_profile
  awardXp() ──► SQLite companion
        │
        ▼
  Display results + XP gain + level-up banners
```

### Adaptive Engine Data Flow (within a session)

```
After each round:
  roundHistory (last 3 rounds) ──► rollingAccuracy(), rollingAvgRt()
        │
        ▼
  Decision tree (4 branches):
    accuracy > 90% + RT < 350ms  → push all axes (accelTempoRamp, accelGrowth)
    accuracy > 90% + RT > 450ms  → push tempo only (pushTempoRamp)
    accuracy 80-90%              → hold (ZPD): sequenceGrowth=0, tempoRamp=0
    accuracy < 80%               → ease back (easeTempoRamp positive, reduces mutations)
        │
        ▼
  Updated LeverSettings → next buildRound()
```

---

## 5. Layer-by-Layer Architecture

### Engine Layer (`engine/`)
Pure TypeScript. Zero React imports. Zero side effects. All functions are deterministic given the same inputs.

- **sequenceGenerator.ts** — stateless functions. Given a length and grid size, returns a randomized sequence. Handles mutation transforms (mirror, reverse, poison cell selection).
- **adaptiveEngine.ts** — pure update function. Takes current `EngineState` + `RoundPerformance` → returns new `EngineState`. Output includes updated `levers`, accumulated `currentFlashDuration`, and a `leverHistory` snapshot array (one entry per completed round). No React or SQLite imports.
- **engineConfig.ts** — `EngineConfig` interface and `ENGINE_CONFIG_DEFAULTS`. All tuning knobs (thresholds, ramps, grid timing) live here. A config snapshot is frozen into `EngineState` at session start.
- **gameStateMachine.ts** — stateful session structure. Manages the `GameState` object through phases. `processTap()` and `completeRound()` are pure functions that return partial state updates (no mutations).
- **scoring.ts** — pure math functions. Round score formula and 0-100 cognitive dimension scores.

**Rule:** Nothing in `engine/` should ever import from React, Zustand, or SQLite.

### Store Layer (`store/`)
Zustand store is the only place that holds mutable session state during gameplay. It imports from `engine/` and exposes action functions to the UI.

The store is intentionally thin — it calls engine functions and applies their return values to state. No business logic lives here.

**Rule:** The store should not import from `db/`. Persistence happens in screens after session end, not inside the store.

### DB Layer (`db/`)
All SQLite access is async and centralized here. `database.ts` is the single entry point for getting the DB connection and running migrations. All other `db/` files import `getDb()` from `database.ts`.

Migrations are additive — new `CREATE TABLE IF NOT EXISTS` statements added to `migrate()`. The database auto-migrates on app start via `getDb()`.

**Rule:** Never write raw SQL in screens or components. All queries live in `db/`.

### Component Layer (`components/`)
Presentational components only. They receive props and render. No direct DB access. No Zustand subscriptions (except where unavoidable).

Animations use Reanimated 4's `useSharedValue` / `useAnimatedStyle`. The `worklet` keyword is handled automatically by the Reanimated babel transform.

**Rule:** Components should not know about game logic. A `Cell` knows it's illuminated or not — it doesn't know what round it is.

### Screen Layer (`app/`)
Screens are the integration layer. They connect the store, DB, navigation, and components. This is where lifecycle effects (`useFocusEffect`, `useEffect`) live.

Expo Router uses file-based routing — every `.tsx` file in `app/` is automatically a route. No manual route registration needed.

---

## 6. Screen Inventory & Navigation

```
App Launch
    │
    ▼
index (Home)
    │── no companion in DB ──► choose-companion ──► index
    │
    ├── Begin Session ──► countdown ──► game ──► results ──► index (or game again)
    │
    └── History ──► history ──► (back) ──► index
```

| Screen | File | Key Responsibilities |
|---|---|---|
| Home | `app/index.tsx` | Load lifetime stats + companion on focus. Route guard to companion selection. |
| Choose Companion | `app/choose-companion.tsx` | One-time starter selection. Writes to `companion` table. |
| Countdown | `app/countdown.tsx` | Load player profile. Call `startSession()`. 3-2-1 animation. |
| Game | `app/game.tsx` | Watch phase timer loop. Tap handler. Phase transitions. Navigate to results on session end. |
| Results | `app/results.tsx` | Persist session. Update player profile. Award XP. Display scores + companion state. |
| History | `app/history.tsx` | Load recent sessions. RT trend chart. Avg profile bars. CSV export trigger. |

---

## 7. Database Schema

All tables created in `db/database.ts` → `migrate()`.

### `sessions`
Stores every completed session. The `engine_lever_log` field is critical for the future ML pipeline — it captures exactly what the engine did each round.

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id              TEXT NOT NULL UNIQUE,
  timestamp               TEXT NOT NULL,           -- ISO 8601
  rounds_completed        INTEGER NOT NULL,
  total_score             INTEGER NOT NULL,
  reaction_times          TEXT NOT NULL,            -- JSON array of ms values
  avg_rt                  REAL NOT NULL,
  best_rt                 INTEGER NOT NULL,
  accuracy                REAL NOT NULL,            -- 0.0–1.0
  mutations_faced         TEXT NOT NULL,            -- JSON string array
  mutations_survived      INTEGER NOT NULL,
  engine_lever_log        TEXT NOT NULL,            -- JSON array of LeverSettings per round
  engine_intensity        REAL NOT NULL,            -- 0.0–1.0
  wm_score                REAL NOT NULL,            -- 0–100
  rt_score                REAL NOT NULL,
  flex_score              REAL NOT NULL,
  decision_score          REAL NOT NULL
);
```

### `player_profile`
Single-row table (id always = 1). Recomputed after every session from the last 10 sessions. Seeds the adaptive engine's initial lever positions.

```sql
CREATE TABLE IF NOT EXISTS player_profile (
  id                          INTEGER PRIMARY KEY CHECK (id = 1),
  baseline_rt                 REAL NOT NULL DEFAULT 450,
  wm_capacity                 REAL NOT NULL DEFAULT 4,
  flex_rating                 REAL NOT NULL DEFAULT 0.5,
  speed_accuracy_threshold    REAL NOT NULL DEFAULT 350,
  session_count               INTEGER NOT NULL DEFAULT 0,
  updated_at                  TEXT NOT NULL
);
```

### `companion`
Single-row table (id always = 1). Written on first companion selection and updated after every session.

```sql
CREATE TABLE IF NOT EXISTS companion (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  companion_id    TEXT NOT NULL,   -- 'ember' | 'tide' | 'arc'
  level           INTEGER NOT NULL DEFAULT 5,
  xp              INTEGER NOT NULL DEFAULT 0
);
```

---

## 8. Design System

All tokens defined in `constants/theme.ts`. Never hardcode colors or sizes in components.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `background` | `#F7F6F3` | App background (warm off-white) |
| `surface` | `#FFFFFF` | Cards, cells, modals |
| `textPrimary` | `#1A1A1A` | Headings, scores |
| `textSecondary` | `#6B6B6B` | Body copy, descriptions |
| `textTertiary` | `#9E9E9E` | Labels, timestamps, uppercase caps |
| `accent` | `#2D5BFF` | Interactive elements, active cells, primary data |
| `accentSoft` | `#EEF2FF` | Accent backgrounds for badges |
| `success` | `#22C55E` | Correct tap, positive readings |
| `danger` | `#EF4444` | Wrong tap, poison cell, session end |
| `warning` | `#F59E0B` | Mutation indicators |
| `border` | `#E8E6E1` | Card borders, dividers, cell outlines |

### Spacing

- Base grid: **8px**
- Page padding: **20px** horizontal
- Grid gap: **10px** between cells
- Card radius: **16px**
- Cell radius: **10px**
- Max content width: **420px** (one-handed mobile)

### Typography

| Role | Size | Weight | Notes |
|---|---|---|---|
| Display | 28px | 600 | `fontFamily: 'serif'` — scores, headings |
| Body | 15px | 400 | General copy |
| Label | 11px | 500 | Uppercase, letter-spaced category labels |
| Mono | 15px | 500 | RT values in ms |

### Animation Standards

- Cell illumination: `withTiming(150ms)` + `scale(1.03)`
- Correct tap: green flash `80ms` + spring scale to `1.1` → `1.0`
- Wrong tap: red flash + `±4px` horizontal shake oscillation
- Results bars: `cubic-bezier(0.22, 1, 0.36, 1)` over `800ms`, staggered `100ms`
- Companion idle: sine float `±6px` over `1800ms`, repeating

---

## 9. Companion System

Three starters, each with 4 evolution stages unlocked at levels 20, 50, and 80.

### Companions

| ID | Name | Personality | Shape Progression |
|---|---|---|---|
| `ember` | Ember | Reactive, intense | Circle → Triangle → Diamond → Diamond |
| `tide` | Tide | Patient, adaptive | Circle → Circle → Triangle → Diamond |
| `arc` | Arc | Precise, calculated | Triangle → Triangle → Diamond → Diamond |

### Leveling Formula

```typescript
xpForLevel(level) = floor(100 × level^0.85)   // XP needed to reach next level
scoreToXp(score)  = floor(score / 10)           // XP awarded per session
```

Level 5 (start) requires ~430 XP to reach level 6. Level 99 requires ~8,100 XP to reach 100. Progression slows meaningfully at high levels without becoming frustrating.

### Evolution Milestones

| Level | Ember | Tide | Arc |
|---|---|---|---|
| 1–19 | Spark (circle) | Drop (circle) | Pulse (triangle) |
| 20–49 | Flare (triangle) | Current (circle) | Charge (triangle) |
| 50–79 | Blaze (diamond) | Wave (triangle) | Bolt (diamond) |
| 80–100 | Inferno (diamond) | Surge (diamond) | Apex (diamond) |

### Visual Implementation

Companions use abstract geometric shapes (no images) to match the clinical aesthetic. Shapes are drawn with React Native `View` styling:
- **Circle:** `borderRadius` = size/2
- **Triangle:** border trick (transparent left/right borders, colored bottom border)
- **Diamond:** rotated square (`transform: [{ rotate: '45deg' }]`)

Each stage has a `primaryColor` and `secondaryColor` for the shape fill and inner accent.

---

## 10. Development Setup

### Prerequisites

- Node.js 20+
- Xcode 16+ with iOS 26 platform installed (Settings → Platforms)
- Apple Developer account (free personal team sufficient for device testing)
- iPhone with Developer Mode enabled (Settings → Privacy & Security → Developer Mode)

### Running the App

```bash
# Install dependencies
npm install

# Build and run on connected iPhone (first time: ~5 min native compile)
npx expo run:ios --device

# Start Metro bundler for hot reload after native build
npx expo start --dev-client
```

**Do NOT use `npx expo start` without `--dev-client`** — this starts regular Expo Go mode which is incompatible with Reanimated 4.

### TypeScript Check

```bash
node node_modules/typescript/lib/tsc.js --noEmit
```

(Standard `npx tsc` may fail due to a bin wrapper issue — use the direct node path above.)

### Adding a New Screen

1. Create `app/your-screen.tsx` with a default export React component
2. Navigate to it with `useRouter().push('/your-screen')`
3. Expo Router auto-discovers it — no registration needed

### Adding a New DB Table

1. Add `CREATE TABLE IF NOT EXISTS ...` to the `migrate()` function in `db/database.ts`
2. Create a new file in `db/` for the table's CRUD operations
3. The migration runs automatically on next app launch via `getDb()`

---

## 11. Testing

### Runner & Toolchain

Tests use **Jest** with **ts-jest** for TypeScript transformation. The engine layer is pure TypeScript with no React or native dependencies, so tests run in Node without the Expo runtime.

| Tool | Purpose |
|---|---|
| `jest` | Test runner |
| `ts-jest` | Transforms `.ts` files for Jest (bypasses Expo/Babel pipeline) |
| `@types/jest` | TypeScript definitions for `expect`, `describe`, `it`, etc. |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:ci

# Run a single suite
npx jest scoring
```

### Test Structure

Tests live alongside the code they cover in `engine/__tests__/`:

```
engine/
├── __tests__/
│   ├── scoring.test.ts            # 25 tests
│   ├── sequenceGenerator.test.ts  # 18 tests
│   ├── boosterEngine.test.ts      # 15 tests
│   ├── adaptiveEngine.test.ts     # 30 tests
│   └── gameStateMachine.test.ts   # 41 tests
├── scoring.ts
├── sequenceGenerator.ts
├── boosterEngine.ts
├── adaptiveEngine.ts
├── gameStateMachine.ts
└── engineConfig.ts
```

### What's Covered

All tests target the **engine layer** — pure functions with deterministic inputs and outputs. No mocking of DB, network, or React.

| Suite | What's tested |
|---|---|
| `scoring` | Streak multiplier tiers, round score with all multiplier combos (mutation, intensity, streak), RT distribution stats (mean, SD, CV, skewness/IIV), Pulse Index weighted composite, cognitive score derivation for all 5 dimensions including HALT impulse metrics |
| `sequenceGenerator` | Sequence length/bounds/uniqueness, poison cell exclusion, mirror transform (including double-mirror roundtrip), all 6 mutation recall mappings (reverse, parity, double, mirror, colorSwitch, poison), index↔position conversion |
| `boosterEngine` | Training phase boundaries (foundation/sharpen/maintain), booster type selection with priority chain (reactivation > challenge > maintenance), frequency cap messaging per Lampit et al., difficulty scaling factors |
| `adaptiveEngine` | Profile-seeded initialization (tempo, growth, mutation rate from baseline RT/WM/flex), warmup calibration on round 1, all post-warmup branches (accel-all, push-tempo, steady-push, zpd-hold, overwhelm, recovery), grid expansion 3→4, flash duration clamping to floor/ceiling, mutation streak tracking, intensity score bounds |
| `gameStateMachine` | Initial state creation for all 4 game modes, round building (standard + HALT single-trial + TIDE reverse), tap processing (correct/wrong/poison with session-end logic), HALT tap/timeout handling with SSD staircase, round completion with scoring + engine update, failed round engine feedback, session summary with HALT metrics (SSRT, d'), ARC binding question scoring |

### CI Workflow

GitHub Actions runs tests on every push to `main` and every PR targeting `main`:

- **File:** `.github/workflows/test.yml`
- **Environment:** Ubuntu, Node 20
- **Steps:** `npm ci` → `npm run test:ci` (with `--ci --coverage`)
- **Artifacts:** Coverage report uploaded and retained for 7 days

### Writing New Tests

When adding a new engine function:

1. Add a `describe` block in the corresponding `__tests__/*.test.ts` file
2. Test edge cases (empty inputs, boundary values, clamping)
3. For functions with randomness (`Math.random()`), use `jest.spyOn(Math, 'random').mockReturnValue(...)` to make tests deterministic
4. Run `npm test` before committing

**Rule:** Engine tests must never import from React, Zustand, or SQLite. If a function needs those, it belongs in a different test layer (integration tests, planned for Phase 2).

---

## 12. What's Built vs What's Planned

### Built (Phase 1)

- [x] Core game loop (Watch → Recall → Adapt → Escalate)
- [x] Rule-based adaptive engine with 4 levers
- [x] 3 mutations: Mirror, Reverse, Poison
- [x] Dynamic grid: 3×3 → 4×4 → 5×5 (engine-triggered)
- [x] Reanimated 4 cell animations (illuminate, correct, wrong shake)
- [x] 6 screens: Home, Choose Companion, Countdown, Game, Results, History
- [x] SQLite persistence: sessions, player profile, companion
- [x] Cross-session player profile (adaptive engine learns over time)
- [x] CSV export via native share sheet
- [x] Companion system: 3 starters, leveling, 4 evolutions each
- [x] RT trend chart + avg cognitive profile bars in history

### Planned (Phase 2 — next)

- [ ] Onboarding with calibration taps to seed player profile
- [ ] Supabase cloud sync (sessions + player profile)
- [ ] Push notifications with engine-aware copy
- [ ] Shareable cognitive snapshot cards (post-session, for Stories/X)
- [ ] Percentile ranking (requires backend + aggregate data)
- [ ] Pro tier (unlimited history, all 7 mutations, percentile)
- [ ] 4 new mutations: Color Inversion, Dual Sequence, Delayed Response, Grid Rotation

### Planned (Phase 3)

- [ ] ML adaptive engine (regression model trained on ~10K sessions)
- [ ] PWA for web distribution
- [ ] Teams tier (admin dashboard, leaderboards)
- [ ] Challenge links (deep link to beat a specific score)
- [ ] Localization (10 languages)

---

## 13. Known Constraints & Gotchas

**Reanimated 4 + Expo Go = broken.** Always use `npx expo run:ios --device` or the simulator. Do not test in Expo Go.

**expo-file-system legacy import.** Always import from `expo-file-system/legacy` not `expo-file-system` when using `cacheDirectory`, `EncodingType`, or `writeAsStringAsync`.

**`npx tsc` broken.** The `.bin/tsc` wrapper has a path resolution bug. Use `node node_modules/typescript/lib/tsc.js --noEmit` directly.

**Bundle ID is `com.muneeb.pulse`.** Registered under personal Apple team (Muneeb Ahmed Sahaf). Free team cert expires every 7 days — rebuild when prompted.

**New Architecture is ON.** `newArchEnabled: true` in `app.json`. Expo Go forces this anyway, and all dependencies (Reanimated 4, Screens, SafeArea) support it. Do not disable.

**No `GestureHandlerRootView` in layout.** Removed because it crashed on import in earlier Expo Go testing. Not needed until swipe gestures are introduced. Add back to `app/_layout.tsx` when needed.

**RT measurement precision.** `performance.now()` gives ~1-4ms jitter on JS thread. Good enough for consumer use. Native modules (Phase 4) will be needed for clinical-grade sub-millisecond precision.

**`engine_lever_log` in sessions table.** This is the most important field for future ML training. It stores per-round lever settings as a JSON array — one `LeverSettings` entry per completed round, snapshotted at the start of that round via `EngineState.leverHistory`. Never remove it or change its format without a migration plan.

**Single-row tables.** Both `player_profile` and `companion` use `id = 1` as a constraint. This is intentional — there is always exactly one player profile and one companion. Use `ON CONFLICT(id) DO UPDATE` for upserts.
