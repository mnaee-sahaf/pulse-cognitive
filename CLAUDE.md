# CLAUDE.md — Project Rules

## Logging Rule

Every new feature, component, or user-facing flow MUST include dev logs at key interaction points using `import { log } from '../lib/devLog'`. This is non-negotiable — silent failures are the #1 debugging time sink.

### What to log:
- **User interactions**: Button/tap handlers that trigger state changes (e.g., `log.info('upgrade prompt opened')`)
- **State transitions**: Phase changes, modal open/close, navigation (e.g., `log.phase('watch → recall')`)
- **Engine decisions**: Branch taken, lever values, why (e.g., `log.engine('R5 → accel-all', { accuracy, avgRt, ... })`)
- **Error paths**: Unexpected conditions, fallbacks, guards that fire (e.g., `log.warn('summary null on results mount')`)
- **Data persistence**: Session saves, profile updates, purchase state changes (e.g., `log.data('session saved', { score })`)

### What NOT to log:
- Individual render cycles or animation frames
- Every tap in a sequence (only wrong/significant taps)
- Zustand selector calls
- Style computations

### Format:
```typescript
log.info('short description of what happened', { key: value, ... });
```

Use the appropriate level: `log.engine()`, `log.phase()`, `log.tap()`, `log.store()`, `log.nav()`, `log.data()`, `log.info()`, `log.warn()`.

### No nested Modals:
React Native crashes when a `<Modal>` is rendered as a sibling of or outside another `<Modal>`. If a component needs to show a secondary overlay while a modal is open, render it as a conditional view **inside** the parent modal's content tree, not as a separate `<Modal>`.

## Functional Architecture Rules

### Rule 1: Domain logic is pure functions
All game logic lives in `engine/` as pure functions with typed inputs and outputs. No React imports, no hooks, no side effects. Randomness should be injected (pass a seed or RNG), not called inline via `Math.random()`.

### Rule 2: Components are views
React components in `components/` render data — they do not compute it. Business logic belongs in `engine/` or dedicated utility modules, not inline in JSX files. If a component needs derived data, call a pure function from `engine/` or `lib/`.

### Rule 3: State is explicit and centralized
All app state flows through Zustand stores in `store/`. Screens in `app/` wire state to views using **selective subscriptions** (e.g. `useGameStore(s => s.phase)`, never bare `useGameStore()`). Effects and I/O (DB, audio, haptics) live at the edges — in screens or hooks, not in `engine/` or `components/`.

## Complexity Checks

ESLint enforces complexity thresholds via `eslint.config.mjs`. Key limits (currently warnings):

- Cyclomatic complexity: 10 (8 in `engine/`)
- Cognitive complexity: 15
- Max nesting depth: 4
- Max lines per function: 50 (40 in `engine/`)
- Max file lines: 400
- Max function parameters: 4

Run `npm run lint` to check. Promote warnings to errors once hotspots are cleaned up.
