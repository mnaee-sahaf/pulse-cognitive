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
- ⬜ Calibration tap sequence (seeds initial player profile)
- ⬜ Practice round with mutation tutorial
- ⬜ First-run flow gate (onboarding → choose companion → home)

### App Store Submission
- ⬜ App icon (final design, all required sizes)
- ⬜ Splash screen (final design)
- ⬜ App Store screenshots (6.7", 6.1", iPad)
- ⬜ App Store description + keywords
- ⬜ Privacy policy (hosted URL)
- ⬜ Terms of service (hosted URL)
- ⬜ Age rating questionnaire

### Infrastructure
- ⬜ Error boundaries (catch JS crashes, show recovery UI)
- ⬜ Push notification permission flow
- ⬜ Daily reminder scheduling (user-set time)
- ⬜ Notification copy rotation (engine-aware hooks)
- ⬜ Settings screen (haptic toggle, notification time, account)

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
