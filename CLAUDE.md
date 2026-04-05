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
