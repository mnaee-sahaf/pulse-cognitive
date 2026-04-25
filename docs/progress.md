# Pulse — Production Progress Tracker

> Updated on each commit. Check items as they ship.

---

## Legend
- ✅ Shipped
- 🔄 In progress
- ⬜ Not started
- 🚫 Blocked (dependency noted)

---

## Phase A — Pre-Launch (Blockers)

### Authentication & Data
- ⬜ Supabase project setup (auth + database)
- ⬜ User account creation (email + social login)
- ⬜ Session data synced to Supabase per user
- ⬜ Player profile synced cross-device
- ⬜ Companion state synced cross-device
- ⬜ Account deletion + data wipe

### Onboarding
- ⬜ Science explainer screen (what Pulse is, why it works)
- ✅ First-session calibration — fixed-difficulty session 1 seeds baselineRt/wmCapacity for session 2 adaptive — Sprint 2
- ⬜ Practice round with mutation tutorial
- ⬜ First-run flow gate (onboarding → choose companion → home)

### App Store Submission
- ⬜ App icon (final design, all required sizes)
- ⬜ Splash screen (final design)
- ✅ Splash background matches theme (`#F7F6F3`) — Sprint 1
- ✅ Bundle ID set to `com.athleteos.pulse` (was `com.muneeb.pulse`) — Sprint 1
- ⬜ App Store screenshots (6.7", 6.1", iPad)
- ⬜ App Store description + keywords
- ✅ In-app privacy policy screen (`app/privacy.tsx`) — Sprint 1
- ⬜ Privacy policy hosted at public URL
- ✅ In-app terms of use screen (`app/terms.tsx`) — Sprint 1
- ⬜ Terms of service hosted at public URL
- ✅ About screen with version + legal links (`app/about.tsx`) — Sprint 1
- ⬜ Age rating questionnaire
- ✅ Engine-tuning sections gated behind `__DEV__` — Sprint 1

### Infrastructure
- ✅ Error boundary at root (`components/ErrorBoundary.tsx`, wired in `app/_layout.tsx`) — Sprint 1
- ⬜ Push notification permission flow
- ⬜ Daily reminder scheduling (user-set time)
- ⬜ Notification copy rotation (engine-aware hooks)
- ⬜ Settings screen (haptic toggle, notification time, account)
- ✅ Accessibility labels on critical-path interactive elements (home, game grid + quit, results, choose-companion, history, weekly, settings, modals) — Sprint 1
- ✅ Loading state on results screen (replaces empty `<View />` flash) — Sprint 1

### Retention Mechanics
- ⬜ Streak counter (daily session tracking)
- ⬜ Streak milestone celebrations (7, 30, 100, 365 days)

---

## Phase B — Launch to Growth

### Monetization
- ⬜ RevenueCat integration
- ⬜ Pro tier paywall screen ($4.99/mo)
- ⬜ Pro feature gating (mutations, history, percentile)
- ⬜ Subscription management (restore, cancel)

### Game Content (Pro-Gated)
- ⬜ Mutation: Color Inversion
- ⬜ Mutation: Dual Sequence
- ⬜ Mutation: Delayed Response
- ⬜ Mutation: Grid Rotation

### Analytics & Data Pipeline
- ⬜ PostHog integration (session events, retention, funnels)
- ⬜ Lever log pipeline to BigQuery (ML training data)
- ⬜ Percentile ranking (requires aggregate backend data)

### Social & Viral
- ⬜ Shareable session cards (react-native-view-shot → share sheet)
- ⬜ Challenge links (deep link with target score)
- ⬜ Ceiling milestone cards ("You're in the top 8%")

### Health Integrations
- ⬜ Apple Health (log sessions as mindfulness)
- ⬜ Google Fit

---

## Phase C — Scale

### Teams Tier ($9.99/seat/mo)
- ⬜ Team creation + invite flow
- ⬜ Team leaderboard
- ⬜ Admin dashboard (aggregate cognitive analytics)
- ⬜ Pre-session warmup protocols

### ML Engine
- ⬜ Collect 10K sessions with lever logs
- ⬜ Train regression model (lever settings → outcome)
- ⬜ A/B test vs rule-based engine
- ⬜ Gradual rollout with automatic fallback

### Distribution
- ⬜ PWA (web build, service worker, offline)
- ⬜ Localization framework setup
- ⬜ 10 language translations

---

## Gameplay & Engine (Ongoing)

### Core Engine Fixes
- ✅ Flash duration floor raised 200ms → 300ms
- ✅ Max tempo ramp capped at -30ms/round
- ✅ Grid expansion requires 3 consecutive strong rounds
- ⬜ **Tempo accumulation model** (engine can slow down, not just accelerate — current bug)
- ⬜ Start sequence at 2 cells (not 3)
- ⬜ Sequence holds on ZPD round (doesn't always grow)
- ⬜ Overwhelm threshold raised 70% → 80%
- ⬜ Tune initial defaults after playtesting data

### Sound & Polish
- ⬜ Real level-up sound file (replace silent placeholder)
- ⬜ Real evolve sound file (replace silent placeholder)
- ✅ Level-up/evolve modal with haptic feedback
- ⬜ Game-over feedback (sound + animation)
- ⬜ Correct-round celebration animation between rounds

---

## Sprint 2 — Design System & "Feel" Loop (April 2026)

Builds on Sprint 1. Plan: `~/.claude/plans/this-is-an-app-staged-sunrise.md`.

**Design system foundations** (`constants/theme.ts`)
- ✅ Added `Spacing.badgeRadius (8)`, `Spacing.pillRadius (20)`, `Spacing.inputRadius (8)`.
- ✅ Exported `Pressed = { opacity: 0.85 }` token; standard pressed-state opacity.
- ✅ Added `Easing.standard` (Reanimated bezier) and `Easing.out` curves.
- ✅ Added `Shadow.sm`/`Shadow.md` cross-platform shadow tokens.

**First-session calibration** (the single biggest "feel" win)
- ✅ Added `calibrated: boolean` to `PlayerProfile`; SQLite migration added the `player_profile.calibrated` column.
- ✅ `engine/adaptiveEngine.ts:initEngine` now detects uncalibrated profiles and returns an `EngineState` with `isCalibration: true` and fixed safe levers (no growth surge, no mutations, 600ms flash).
- ✅ `updateEngine` short-circuits in calibration mode — appends history, logs `R{n} → calibration`, returns same levers.
- ✅ `updatePlayerProfile` always writes `calibrated = 1` after the first session, seeding `baselineRt`/`wmCapacity`/`flexRating` from observed performance. Session 2 enters normal adaptive flow at the player's actual baseline.
- ✅ Tests: `engine/__tests__/adaptiveEngine.test.ts` covers calibration init for null and uncalibrated profiles, and asserts `updateEngine` is a no-op on levers during calibration. Existing adaptive tests updated to use a calibrated profile.

**Adaptation transparency on results** (`app/results.tsx`)
- ✅ New `engine/engineInsight.ts` with `describeEngineDecision(state)` and `describeNextSessionPreview(state)` — pure functions mapping engine state to player-facing copy.
- ✅ Results "Adaptive Engine" card now leads with a one-line narrative ("You were fast and accurate — we sped up flashes…") and ends with a "Next Session" preview ("flashes ~570ms · mutations ~10%").

**Hero metric on home** (`app/index.tsx`)
- ✅ Pulse Index card above the streak: average of the four cognitive scores this week, with a week-over-week trend arrow. Tap to open the weekly report. Hidden until first session of the current week. Foreground retention lever per the audit.
- ✅ Reuses `db/weeklyReport.generateWeeklyReport()` — no new aggregation code.

**Token sweep across screens**
- ✅ Replaced ad-hoc press opacities `0.5/0.75/0.8/0.82` with `Pressed` (0.85) in: `app/index.tsx`, `app/results.tsx`, `app/privacy.tsx`, `app/terms.tsx`, `app/about.tsx`, `app/weekly-report.tsx`, `app/+not-found.tsx`, `app/settings.tsx`, `components/ErrorBoundary.tsx`, `components/CompanionSwitcher.tsx`.
- ✅ Replaced inconsistent `borderRadius: 12` on cards with `Spacing.cardRadius` in: `app/index.tsx` (streakRow), `app/results.tsx` (streakCard), `app/history.tsx` (sessionRow), `app/weekly-report.tsx` (insight/nudge cards). XP badge → `pillRadius`. Banner badges → `badgeRadius`. Settings input → `inputRadius`.

**Tests**: 128/128 green (one new calibration test added).

**Docs**: `docs/adaptive-engine.md` updated with the calibration section and the engine-insight transparency layer.

---

## Sprint 1 — Correctness & Compliance (April 2026)

Audit-driven launch-blocker pass. Plan: `~/.claude/plans/this-is-an-app-staged-sunrise.md`.

**Engine correctness**
- ✅ Multi-tap RT calculation verified correct via new regression tests in `engine/__tests__/gameStateMachine.test.ts` (`computes per-tap RT as inter-tap interval...` and `multi-tap RT remains correct across consecutive rounds...`). Refactored to use `state.tapResults`-local cumulative sum for clarity (was implicit via `sessionRts.slice(-N)`). Behavior unchanged.
- ✅ Removed `colorSwitch` mutation from the pool — UI tap-filter was never built; firing it was an auto-fail. `engine/sequenceGenerator.ts` and `engine/adaptiveEngine.ts:354-377`.
- ✅ Removed dead ARC binding-question code: `processBindingAnswer`, `BINDING_COLORS`, `BindingQuestion` interface, `bindingColors`/`bindingQuestion` round fields, `bindingQuestionsAsked`/`Correct` counters and their tests. Generated but never displayed in UI.

**App Store compliance**
- ✅ `app.json` updated: bundle ID `com.athleteos.pulse`, Android package added, splash + adaptive-icon backgrounds aligned to theme `#F7F6F3`.
- ✅ Privacy policy (`app/privacy.tsx`), Terms of Use (`app/terms.tsx`), and About (`app/about.tsx`, version from `expo-constants`) screens; linked from settings. Public hosting still required pre-submission.
- ✅ Engine-tuning section in settings already `__DEV__`-gated; verified.

**Stability**
- ✅ `ErrorBoundary` component catches uncaught render errors and shows a friendly retry; logs to `devLog`.
- ✅ Results screen no longer flashes an empty white view; renders a "Calculating results" loading state.

**Cleanup**
- ✅ Deleted orphaned `components/UpgradePrompt.tsx` (no imports after IAP removal).

**Tests**: 127/127 green after changes (regression tests added for multi-tap RT, three obsolete binding tests removed).

---

## What's Shipped (Phase 1 Complete)

- ✅ Core game loop (Watch → Recall → Adapt → Escalate)
- ✅ Rule-based adaptive engine (4 levers)
- ✅ 3 mutations: Mirror, Reverse, Poison
- ✅ Dynamic grid 3×3 → 4×4 → 5×5 (engine-triggered)
- ✅ Reanimated 4 cell animations (illuminate, correct, wrong shake)
- ✅ 6 screens: Home, Choose Companion, Countdown, Game, Results, History
- ✅ SQLite persistence (sessions, player profile, companion)
- ✅ Cross-session player profile (adaptive engine learns over time)
- ✅ CSV export via native share sheet
- ✅ Companion system: 3 starters, leveling, 4 evolutions each
- ✅ RT trend chart + avg cognitive profile bars in history
- ✅ Home screen stats refresh on focus
- ✅ RT values rounded to integers
- ✅ Architecture + engine documentation
