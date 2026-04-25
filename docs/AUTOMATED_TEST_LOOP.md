# Automated Test Loop — Handoff for Next Session

> Working doc. The previous session ran an autonomous "play-and-fix" loop on
> the iPhone 17 simulator using idb. This file captures everything you need
> to resume the loop in a fresh session without re-discovering tooling.

---

## Project state

**Branch:** `feat/v2-trials` (off `feat/phase1-redesign`).
**Goal:** Validate the v2 redesign on a simulator by playing through, screenshotting each step, finding visual/behavioral bugs, fixing them, reloading, repeating.

**Plan + design docs:**
- `~/.claude/plans/this-is-an-app-staged-sunrise.md` — original v1 plan (stale; we pivoted to v2)
- `docs/REDESIGN_v2.md` — v2 game-design brief (Pulse Trials)
- `docs/ADAPTIVE_ENGINE_v2.md` — v2 engine + benchmarking design

**v2 modules already built (Weeks 1–3 complete):**
- `engine/staircase.ts`, `norms.ts`, `dimensions.ts`, `improvement.ts` — staircase + norms + RCI
- `engine/wave.ts`, `combo.ts`, `dailyTrial.ts` — waves, combos, daily trial logic
- `components/EngineVoice.tsx` — animated overlay
- `store/gameStoreV2.ts` — new wave-driven game store
- `app/game.tsx`, `app/results.tsx`, `app/countdown.tsx` — rewritten for v2
- `db/database.ts`, `db/sessions.ts`, `db/profile.ts`, `db/checkpoints.ts`, `db/dailyTrial.ts` — schema + persistence

Tests: 256/256 green at last commit. Run `npx jest --no-coverage` to verify.

---

## The autonomous loop — how it actually works

### Tools

- **iDB (Meta)** — required for tap input on simulator. cliclick alone does NOT work on Apple Silicon Macs because the iOS Simulator filters synthesized mouse events.
  - Install once (already done in prior session):
    ```bash
    brew tap facebook/fb
    brew install idb-companion
    pip3 install fb-idb --break-system-packages
    ```
  - Verify: `idb list-targets`
- **xcrun simctl** — boot/launch/screenshot/terminate the app on simulator.
- **Metro logs** — read `tail -N` of the bundler output file to see `log.phase`, `log.tap`, `log.engine` calls. The output path is reported when the bg task starts (`/private/tmp/claude-501/.../tasks/<id>.output`).
- **AX accessibility tree** — `idb ui describe-all --udid <UDID>` returns JSON of every visible element's frame + label. Use this to find tap targets reliably.

### Setup steps (do once at session start)

```bash
# 1. Confirm simulator + idb
xcrun simctl list devices booted              # ensure iPhone 17 booted
idb list-targets | grep "iPhone 17 |"          # see UDID, must say "Booted"

# 2. If sim isn't booted:
xcrun simctl boot "iPhone 17"
open -a Simulator

# 3. Confirm idb companion is connected (one-time per boot):
idb connect <UDID>

# 4. Make sure Metro is running (background):
#    npx expo start --dev-client
#    Track the output file the system reports.

# 5. Build + install (only needed if native code changed; otherwise skip):
#    npx expo run:ios --device <UDID>
```

The current iPhone 17 sim UDID is `A3B3DC7E-8150-43F0-9668-1A9F66D0C305` but verify each session — UDIDs are stable across reboots but new sims regenerate.

### The loop pattern

```
1. Take a screenshot:
   xcrun simctl io booted screenshot /tmp/pulse_step_NN.png
   Read the PNG with the Read tool.

2. Inspect the AX tree to find a tap target:
   idb ui describe-all --udid <UDID> | python3 -c "..."
   Each Button / GenericElement has an AXLabel and frame.x/y/width/height.
   Center = (frame.x + frame.width/2, frame.y + frame.height/2).
   Coordinates are POINTS (device-logical), not pixels. iPhone 17 is 402x874 points.

3. Tap:
   idb ui tap --udid <UDID> <x> <y>

4. If a bug is visible: fix the code. The patched JS hot-reloads via Metro.
   If you need a fresh JS bundle: `xcrun simctl terminate booted com.muneeb.pulse`
   then `xcrun simctl launch booted com.muneeb.pulse`.

5. Screenshot again. Compare. Continue.
```

### Reading game state mid-run

Two tricks already wired into the codebase:

1. **Sequence in Metro logs** — temporary debug logs added in `store/gameStoreV2.ts`:
   - On run start: `log.phase('v2 run started → wave-banner', { ..., cells: [5,4,8,1] })`
   - On round advance: `log.phase('v2 → round N', { ..., seq: [3,7,2,...] })`
   - These let you read the expected sequence from `tail -f <metro_output>` so you can tap correctly.
   - **REVERT THESE BEFORE COMMITTING.** They expose game internals and shouldn't ship.

2. **AX cell labels** — `Cell.tsx` exposes `accessibilityLabel="Cell ${index + 1}"`. So engine cellIndex `5` is labelled "Cell 6" — **off by one!** This caught me last session. Always do **engine_index = ax_label_number - 1** when mapping logged sequences to AX-located cells.

### Cell coordinates (3×3 grid, default at start of run)

Recorded from the AX tree on iPhone 17 at the v2 game screen (subject to drift if layout changes):

| Engine idx | AX label   | Center x,y |
|------------|------------|------------|
| 0          | Cell 1     | (77, 370)  |
| 1          | Cell 2     | (201, 370) |
| 2          | Cell 3     | (325, 370) |
| 3          | Cell 4     | (77, 494)  |
| 4          | Cell 5     | (201, 494) |
| 5          | Cell 6     | (325, 494) |
| 6          | Cell 7     | (77, 618)  |
| 7          | Cell 8     | (201, 618) |
| 8          | Cell 9     | (325, 618) |

Always re-query at the start of a session. 4×4 and 5×5 grids will have different positions.

### Watch-phase timing

- Default flash duration: 600ms per cell, 200ms gap.
- For a 4-cell sequence: ~3.6 seconds total watch time, then recall begins.
- After the watch phase ends, screenshots all look identical (cells at idle). To see a cell illuminated mid-flash you'd need 3+ screenshots within 600ms; idb is too slow for that. Use the Metro logs to know the sequence — don't try to read it from screenshots.

---

## Bugs found during the previous loop

### Fixed
1. **DB migration race on fresh install** (`db/database.ts`).
   `ALTER TABLE` ran before `CREATE TABLE IF NOT EXISTS`, so on a fresh install the columns didn't exist when first INSERT happened → "no such column: impulse_score" → JS crash → black screen.
   **Fix landed:** moved all v1+v2 columns into the `CREATE TABLE` block. ALTER statements remain for upgrade paths.

2. **EngineVoice overlay collides with iOS dynamic island.**
   `top: 8` placed the banner under the status bar / dynamic island, making "Wave 1 — Find your rhythm" unreadable.
   **Fix landed:** changed to `top: 56` in `components/EngineVoice.tsx`.

### Pending (next session should address)

1. **`Property 'document' doesn't exist` redbox on app launch.**
   Source: `node_modules/expo/src/async-require/hmr.ts:165`. Fires on every dev launch but is harmless — tapping Dismiss reveals the home screen which renders fine. Earlier I tried patching with `typeof document !== 'undefined'`, but that exposed a downstream bug (location.href empty path → jsc-safe-url throws). Reverted.
   - **Status:** Live with the redbox in dev mode. Doesn't affect production builds.
   - **Possible real fix:** wait for upstream Expo SDK fix, or shim `globalThis.document = {}` AND `location.href` to a non-empty URL early in the entry. Low priority.

2. **Run Again button accessibilityRole quirk.**
   The first Pressable in `app/results.tsx` (Run Again) shows up in the AX tree as `GenericElement` instead of `Button`, even though `accessibilityRole="button"` is set. The second Pressable (Home) renders correctly as `Button`. Same code shape — not yet diagnosed.

3. **Results CTAs below the fold.**
   On iPhone 17 (874pt), Run Again is at y=878 and Home is at y=942 — both off-screen. ScrollView lets you scroll, but the user can't see the CTAs without scrolling. UX bug.
   - **Possible fix:** make CTAs sticky at the bottom of the screen via a fixed footer.

4. **`Sustained Attention` shows initial theta 45000 always.**
   `MODE_DIMENSIONS` lists `sustainedAttention` as exercised by every mode, but `gameStoreV2.applyDimensionResponses` only feeds responses to dimensions in the active set. Sustained attention's theta never moves — it just shows the default 45000. Either remove from `MODE_DIMENSIONS` for v2 launch, or hide it from the results "What you trained" until we actually measure it.

5. **`Time` on results includes everything since `startRun`** (countdown + watch + recall etc.). Showed `84s` for a single round that took ~5 sec of actual play. Misleading.
   - **Possible fix:** track `firstRoundStartedAt` separately and use that for `durationMs` in summary.

6. **Legacy fields show 0/0ms on home stats**: SESSIONS / BEST RT / AVG SCORE pull from old columns (`avg_rt`, etc.) that v2's `saveSessionV2` writes as 0. Looks broken.
   - **Possible fix:** either populate legacy columns from v2 thetas in `saveSessionV2`, or rewrite the home stats to read theta_* + computed metrics.

7. **Visible-once redbox on every launch.**
   The HMR error fires on every fresh launch. Auto-dismiss script: `idb ui tap --udid <UDID> 100 816` to dismiss reliably. Add this as the first step in the loop helper.

---

## Helper script (paste this at top of next session)

The file `scripts/sim_play.sh` doesn't exist yet — the loop in the previous session was driven inline. Suggested helper for the next session:

```bash
# scripts/sim_play.sh
UDID="A3B3DC7E-8150-43F0-9668-1A9F66D0C305"   # re-check at session start
METRO_LOG=$(ls -t /private/tmp/claude-501/-Users-muneeb-code-athlete-os-pulse-cognitive/*/tasks/*.output 2>/dev/null | head -1)

shot()  { xcrun simctl io booted screenshot "/tmp/pulse_${1:-step}.png" >/dev/null 2>&1; ls -la "/tmp/pulse_${1:-step}.png"; }
tap()   { idb ui tap --udid "$UDID" "$1" "$2"; }
ax()    { idb ui describe-all --udid "$UDID" | python3 -c "import json,sys; [print(f\"{e['type']:14} y={e['frame']['y']:6.0f} | {(e.get('AXLabel') or '')[:60]}\") for e in json.load(sys.stdin) if e['type'] == 'Button']"; }
seq()   { tail -40 "$METRO_LOG" | grep -E "wave-banner|round.*seq" | tail -2; }
dismiss_redbox() { tap 100 816; }
relaunch() { xcrun simctl terminate booted com.muneeb.pulse; sleep 1; xcrun simctl launch booted com.muneeb.pulse; sleep 2; }
```

Source it once: `source scripts/sim_play.sh`. Then call `shot 01`, `tap 201 453`, `ax`, etc.

---

## How to resume the loop

The sequence the previous session was about to do but didn't finish:

1. Re-launch app to clear redbox + previous results screen.
2. Dismiss redbox (tap 100, 816).
3. Tap "Begin Session" (re-query position via `ax`; was around 201, 1083 with full home, 201, 453 if scrolled).
4. Tap explainer (tap 200, 500).
5. Wait 4s, read sequence from Metro logs.
6. Convert engine indices → AX cell coordinates (subtract 1 for AX label, look up coords).
7. Tap each cell with 0.4s delay.
8. If round survives: read next sequence from `log.phase('v2 → round N')` — `seq` field — and continue.
9. Reach Wave 2 (round 6). Verify wave-banner banner fires correctly. Screenshot. Verify EngineVoice overlay no longer collides with status bar.
10. Reach Wave 4 (round 16) to confirm mutations unlock. Screenshot.
11. Intentionally fail to verify run end → results screen.
12. Verify results render, scroll to Run Again, tap.

Things to check during the loop:
- Wave banner full-screen renders cleanly (no status-bar overlap).
- Combo HUD appears at x2 / x3 / x5 / x10.
- EngineVoice fires on combo entry ("On Fire!", etc.).
- Mutation badge appears at Storm wave.
- Boss round (round 41) shows "Boss round." voice + 2x bonus.
- Failure → ends run cleanly → results screen.
- Daily trial completion banner only shows when `isDailyTrial=true` (currently always false; needs Week 4 home wiring).

---

## What to commit at end of next session

Before committing:
1. **Revert the debug logs** in `store/gameStoreV2.ts` — search for `// DEBUG: expose` and remove the `cells` and `seq` fields from `log.phase` calls.
2. Run `npx jest --no-coverage` — confirm 256/256.
3. Run `npx eslint <changed files>` — fix any new errors.
4. Stage explicit files (no `git add -A`).
5. Commit with a message describing what bugs were found + fixed.
6. Push to `origin/feat/v2-trials`.

---

## Open questions (for the user)

After the loop finishes, next session should ask:
1. Should `Sustained Attention` be removed from MODE_DIMENSIONS for v2 launch (it's not really being staircased)?
2. Should results CTAs be sticky? Or is a single scroll acceptable?
3. Time-on-results: total elapsed vs round-only — preference?
4. Home screen v1 layout (Pulse Index card, Cog Profile, legacy stats) is still showing — is the Week 4 redesign next, or skip to demographics onboarding?

These shape Week 4 priorities.
