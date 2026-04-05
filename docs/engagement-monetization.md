# Engagement & Monetization Strategy

**Version 1.0 · April 2026**
**CONFIDENTIAL**

---

## 1. Monetization Model

### One-Time Purchase: $7.99 USD — "Full Brain Unlock"

Pulse uses a **freemium model with a one-time purchase**. No subscriptions. Players choose one free companion on first launch; the other two are locked behind a single $7.99 payment that unlocks everything permanently.

| Feature | Free Tier | Full Unlock ($7.99) |
|---|---|---|
| Companions | 1 (player's choice) | All 3 |
| Game modes | 1 training type | All 3 training types |
| Cognitive profile | 1 active dimension | Full 4-dimension profile |
| Adaptive engine | Full | Full |
| Session history | Full | Full |
| CSV export | Full | Full |
| Companion evolution | Full (chosen companion) | Full (all 3) |

### Why One-Time, Not Subscription

- Brain training apps have historically poor subscription retention (Lumosity, Peak)
- One-time purchase removes the "is this still worth it?" friction every renewal
- $7.99 is impulse-purchase territory — low enough to not require deliberation
- Creates goodwill: "they're not trying to milk me"
- The data moat grows regardless of payment — every session trains the ML model

### Why Not Free-to-Play with Ads

- Ads destroy the clinical aesthetic and precision-instrument positioning
- 60-second sessions mean ad interruptions are proportionally huge
- Target audience (knowledge workers, athletes) actively avoids ad-supported products
- One-time purchase signals quality and attracts the right user base

---

## 2. Cognitive Profile Restructuring

### The Core Psychological Lever

Each companion trains a **specific cognitive dimension**. Free users only train ONE dimension. Their cognitive profile will show clear, visible gaps in the untrained areas — creating organic FOMO that drives conversion.

### Mode → Dimension Mapping

| Companion | Mode | Primary Dimension Trained | Secondary Signal |
|---|---|---|---|
| **Arc** | MEMORY | Working Memory (wmScore) | Decision Speed |
| **Tide** | REVERSE | Cognitive Flexibility (flexScore) | Decision Speed |
| **Ember** | INTERCEPT | Reaction Speed (rtScore) | Decision Speed |

**Decision Speed** is a universal metric (accuracy at peak tempo) that improves with any mode. The other three are **mode-specific** — you can only meaningfully train them by playing that mode.

### How Scoring Reinforces This

The existing scoring formulas already support this:
- **rtScore**: Driven by tap reaction times — Ember's intercept mechanic directly trains this
- **wmScore**: Driven by max sequence length — Arc's memory recall directly trains this
- **flexScore**: Driven by mutation survival rate — Tide's reverse recall + mutations directly trains this
- **decisionScore**: Driven by accuracy at speed — all modes train this equally

No scoring formula changes needed. The natural gameplay already isolates dimensions. What changes is **how we present the profile** to make gaps visible.

---

## 3. The FOMO Engine — Making Gaps Painfully Obvious

### 3.1 Results Screen — Locked Dimension Display

After each session, the cognitive profile shows all 4 dimensions. For free users:
- The **active dimension** shows the real score with a filled, colored bar
- **Decision Speed** shows normally (universal metric)
- The **two locked dimensions** display as:
  - Greyed-out bars with a lock icon
  - Label: "LOCKED — Train with [Companion Name]"
  - A subtle shimmer/pulse animation drawing the eye
  - Tapping a locked dimension opens the upgrade prompt

**Psychology**: The player sees their profile is incomplete. Every session reinforces "I'm only training 1/3 of my brain." The locked bars create a visual gap that feels wrong — an incomplete dashboard on a precision instrument.

### 3.2 Home Screen — Cognitive Radar Chart

Add a small radar/spider chart to the home screen showing all 4 dimensions:
- Trained dimensions fill out over sessions
- Locked dimensions stay at a flat baseline (rendered as dotted/ghosted lines)
- The lopsided shape makes imbalance viscerally obvious
- Label beneath: "Unlock all training modes to build a complete profile"

### 3.3 Session Summary Nudge

After every 3rd session, show a contextual upgrade nudge at the bottom of results:
- "You've improved your [dimension] by X% — but your [locked dimension] hasn't been trained yet."
- "Complete cognitive training requires all 3 modes. Unlock for $7.99."
- Never blocking, never modal — always dismissible, always at the bottom

### 3.4 Companion Switcher Lock States

When the free user opens the companion switcher:
- Their chosen companion shows normally
- Locked companions display with:
  - Semi-transparent/desaturated visual
  - Lock icon overlay
  - "Unlock All — $7.99" button replacing the select button
  - Brief text: "Trains [Dimension] — your weakest area" (if we have data showing it's low)

### 3.5 Milestone Triggers

At specific milestones, surface upgrade prompts with higher emotional impact:
- **Session 5**: "You've completed 5 sessions! Your [dimension] is growing. Want to train the full brain?"
- **Level 10 on companion**: "Your [Companion] reached Level 10! The other companions are waiting."
- **New personal best**: "New PR! Imagine what you could do with full cognitive training."
- **Day 7 streak**: "7 days straight — you're serious about this. Unlock everything for $7.99."

---

## 4. Engagement Mechanics

### 4.1 Daily Habit Loop

| Stage | Mechanic | Implementation |
|---|---|---|
| **Trigger** | Push notification | Adaptive copy: "Your RT dropped 8% — let's get it back" |
| **Action** | Sub-4s app-to-play | Home → Countdown → Game, minimal friction |
| **Variable Reward** | Unique cognitive profile each session | Adaptive engine ensures no two sessions feel identical |
| **Investment** | Profile improves, companion grows | More play = more accurate engine = better experience |

### 4.2 Streak System

| Streak | Reward | Purpose |
|---|---|---|
| 3 days | "Consistency" badge on profile | Early habit reinforcement |
| 7 days | Streak flame icon on home screen | Visual identity marker |
| 14 days | Bonus XP multiplier (1.2x for the day) | Tangible gameplay benefit |
| 30 days | "Dedicated" badge + milestone card | Shareability moment |
| 100 days | "Centurion" badge + special companion aura | Long-term retention marker |
| 365 days | "Apex Mind" title + permanent XP boost | Aspirational anchor |

**Streak forgiveness**: Missing one day doesn't break the streak — it freezes it. Two consecutive misses reset. This prevents the "I missed one day so the streak is gone and I stop playing" cliff.

### 4.3 Weekly Cognitive Report

Every Sunday, generate a summary:
- Dimension scores this week vs. last week (trend arrows)
- Sessions completed, avg RT, best round
- "Your [strongest dimension] improved X%. [Weakest dimension] needs attention." (upgrade nudge for free users)
- Shareable as an image card

### 4.4 Companion Investment Loop

The companion system is the long-term engagement anchor:
- 4 evolution stages create visible, aspirational milestones
- XP curve (level^0.85) means early levels come fast (instant gratification) and later levels require dedication (sunk cost)
- Evolution transitions are visually rewarding (shape/color change, animation, haptic burst)
- Free users see their ONE companion growing while the others stay at level 5 — reinforcing the "wasted potential" framing

### 4.5 Session Variety Through Adaptive Engine

The engine itself is an engagement mechanism:
- No two sessions feel the same, even at similar skill levels
- The plateau breaker ensures monotony never sets in
- Mutations introduce surprise (Mirror, Reverse, Poison) at unpredictable intervals
- Grid expansion (3x3 → 4x4 → 5x5) creates "level up" moments within sessions
- The intensity bar gives real-time feedback that the game is responding to YOU

---

## 5. Conversion Funnel Design

### Stage 1: First Session (Day 0)

**Goal**: Show the value, plant the seed.
- Player picks their free companion and plays their first session
- Results screen shows all 4 cognitive dimensions
- 2 dimensions are locked — visible but greyed
- No upgrade prompt yet. Let them enjoy the first session clean.

### Stage 2: Returning Player (Day 1-3)

**Goal**: Establish the habit, show the gap growing.
- Results screen now shows improvement trend on their active dimension
- Locked dimensions remain flat at baseline — the contrast grows each session
- After session 3: first soft nudge — "Your [dimension] is climbing. Your full brain profile awaits."

### Stage 3: Invested Player (Day 4-7)

**Goal**: Make the gap uncomfortable.
- Home screen radar chart makes the lopsided profile viscerally obvious
- Companion switcher shows locked companions at level 5 while theirs is 8-12
- After session 5: "You've built real momentum. Complete the picture for $7.99."
- If they view a locked companion: "Trains [Dimension]. One-time unlock — no subscription, no tricks."

### Stage 4: Committed Player (Day 7+)

**Goal**: Convert with confidence.
- Weekly report highlights the untrained dimensions explicitly
- Streak reward (7-day) feels good but also shows what they're NOT tracking
- The ask is simple: "You're already dedicated. Train the whole brain."
- After conversion: all companions unlock, cognitive profile fills out, immediate sense of "completeness"

### Post-Conversion Retention

Once unlocked, the game needs to retain:
- 3 modes provide natural session variety (rotate daily)
- Full cognitive profile creates a richer dashboard to track
- All 3 companions level independently — 3x the progression hooks
- Weekly reports now show all dimensions trending — more data, more engagement
- The game becomes genuinely more valuable with all 3 modes

---

## 6. Upgrade Prompt Design

### Principles

1. **Never block gameplay.** The player can always play their free companion without interruption.
2. **Never use dark patterns.** No countdown timers, no "limited offer," no manipulative urgency.
3. **Show value, not pressure.** The locked dimensions speak for themselves.
4. **Respect frequency.** Max 1 contextual nudge per session. No pop-ups on app launch.
5. **Make the offer clear.** "$7.99 once. All modes. All companions. Forever."

### Upgrade Modal Content

```
┌──────────────────────────────────────┐
│         UNLOCK FULL TRAINING         │
│                                      │
│   Your brain has 4 dimensions.       │
│   You're only training 1.            │
│                                      │
│   ┌─────┐  ┌─────┐  ┌─────┐         │
│   │ Arc │  │Tide │  │Ember│         │
│   │  ✓  │  │  🔒 │  │  🔒 │         │
│   │ WM  │  │Flex │  │ RT  │         │
│   └─────┘  └─────┘  └─────┘         │
│                                      │
│   ● Working Memory                   │
│   ● Cognitive Flexibility            │
│   ● Reaction Speed                   │
│   ● Decision Speed (always active)   │
│                                      │
│   $7.99 one-time · No subscription   │
│                                      │
│   [     Unlock Everything     ]      │
│                                      │
│          Maybe later                 │
└──────────────────────────────────────┘
```

---

## 7. Revenue Projections

### Conservative Model

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| MAU | 10K | 50K | 100K |
| Free → Paid conversion | 5% | 8% | 12% |
| Cumulative paid users | 500 | 4,000 | 12,000 |
| Cumulative revenue | $3,995 | $31,960 | $95,880 |
| Monthly new revenue | ~$1,300 | ~$5,300 | ~$8,000 |

**Why higher conversion than subscription**: One-time purchases convert 2-3x better than subscriptions in the brain training category. $7.99 is below the "deliberation threshold" for the target audience. The cognitive gap visualization creates strong organic motivation.

### Optimistic Model (with viral mechanics)

If shareable cognitive snapshots and challenge links drive viral growth:
- 200K MAU by month 12, 15% conversion = $239,760 cumulative
- Average user acquires 0.3 new users via sharing = compounding growth

---

## 8. Implementation Checklist

### Phase 1: Core Paywall (Current Sprint)

- [ ] Add `purchase_state` to database (free/unlocked, chosen companion ID)
- [ ] Create unlock store with purchase state management
- [ ] Gate companion selection: first pick is free, others locked
- [ ] Update companion switcher with lock states and upgrade button
- [ ] Show locked dimensions on results screen with lock icons
- [ ] Add upgrade modal component
- [ ] Wire up In-App Purchase (expo-in-app-purchases or RevenueCat)

### Phase 2: FOMO Mechanics (Next Sprint)

- [ ] Add cognitive radar chart to home screen
- [ ] Implement session-count-based nudge triggers (session 3, 5, 10)
- [ ] Add milestone upgrade prompts (level 10, 7-day streak, PR)
- [ ] Weekly cognitive report generation
- [ ] Streak system with forgiveness mechanic

### Phase 3: Viral & Growth (Month 2-3)

- [ ] Shareable cognitive snapshot cards
- [ ] Challenge links (deep linking)
- [ ] Push notifications with adaptive copy
- [ ] Streak badges and profile customization

---

## 9. Success Metrics

| Metric | Target | Why |
|---|---|---|
| Free → Paid conversion (30-day) | 8-12% | Above industry average (3-5%) due to organic FOMO |
| Session 5 retention | 60% | Explainer + adaptive engine reduce early churn |
| Upgrade prompt tap-through | 15% | Soft prompts, high relevance |
| Post-purchase D30 retention | 45% | 3x modes = 3x variety |
| Average sessions before purchase | 6-8 | Enough to feel the gap, not so many they plateau |
| Refund rate | <5% | Clear value proposition, no subscription regret |

---

*Engagement & Monetization Strategy v1.0 · April 2026*
