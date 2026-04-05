# Known inconsistencies (specs ↔ docs ↔ code)

This document tracks **deliberate divergences** and **bugs** discovered by comparing `specs.md`, `docs/*.md`, and the TypeScript implementation. Previously fixed items have been removed.

**Last reviewed:** 2026-04-04

---

## Product spec (`specs.md`) vs code

These are intentional or accepted divergences — the spec describes aspirational or earlier design intent.

| Topic | `specs.md` | Code / config |
|--------|------------|----------------|
| Target difficulty | Maintain **20–30% failure rate** over last 3 rounds | Engine targets **80–90% accuracy** (= 10–20% failure). Close in spirit, different framing. |
| Session end | Single mistake ends session | **Lives** (from app settings); wrong tap consumes a life and continues. |
| Cognitive loop | Watch → Recall only | **Ember** mode: watch-phase interception; **Tide** mode: recall sequence reversed vs display — not described in `specs.md` |

---

## How to use this file

1. **Before changing tuning:** Decide whether to update **code**, **`EngineConfig` defaults**, or **docs/specs** so they match the intended product behavior.
2. **When fixing an item:** Remove or narrow the corresponding section here so the list stays actionable.
