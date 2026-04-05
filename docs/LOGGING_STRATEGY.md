# Pulse Cognitive — Logging & Debug Strategy

## Overview

This document outlines the logging approach for Pulse Cognitive, designed to provide actionable dev/debug insights **without bloat** and without impacting runtime performance or app size.

---

## Core Principles

### 1. **Selective, Layered Logging**
- **DEV-only**: Logs only appear in `__DEV__` builds (dev client, not production)
- **Structured**: Use consistent format to parse/filter logs programmatically
- **Optional**: Disable via settings toggle in dev tools (no performance penalty when off)
- **Targeted**: Log only critical decision points, not every state change

### 2. **Three Log Levels** (vs verbose console spam)

| Level | Use Case | Visibility |
|-------|----------|-----------|
| **TRACE** | Detailed state transitions, every mutation decision | Dev-only, opt-in |
| **INFO** | Round completion, engine state changes, settings updates | Always in dev |
| **WARN** | Edge cases, config issues, unexpected states | Always in dev |

### 3. **No Runtime Storage in Production**
- In-memory ring buffer (capped size, ~100 entries) in dev mode only
- No localStorage/database bloat
- Logs cleared on app reload
- Optional export to file in dev tools

---

## Architecture

### Logger Module (`lib/logger.ts`)

```typescript
// Minimal, tree-shakeable logging utility
interface LogEntry {
  level: 'TRACE' | 'INFO' | 'WARN';
  timestamp: number;
  module: string;
  message: string;
  data?: Record<string, any>;
}

class Logger {
  private static enabled = __DEV__;
  private static buffer: LogEntry[] = [];
  private static maxBufferSize = 100;

  static info(module: string, message: string, data?: any) {
    if (!this.enabled) return;
    this.log('INFO', module, message, data);
  }

  static warn(module: string, message: string, data?: any) {
    if (!this.enabled) return;
    this.log('WARN', module, message, data);
  }

  static trace(module: string, message: string, data?: any) {
    if (!this.enabled) return;
    if (!debugSettings.traceEnabled) return; // opt-in sub-level
    this.log('TRACE', module, message, data);
  }

  private static log(level: string, module: string, message: string, data?: any) {
    const entry: LogEntry = {
      level: level as any,
      timestamp: Date.now(),
      module,
      message,
      data,
    };

    // Ring buffer: auto-drop oldest when full
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift();
    }
    this.buffer.push(entry);

    // Console output (dev-friendly formatting)
    const prefix = `[${module}:${level}]`;
    console.log(prefix, message, data ? JSON.stringify(data, null, 2) : '');
  }

  static getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  static clearBuffer() {
    this.buffer = [];
  }
}

export default Logger;
```

---

## What to Log (& What Not To)

### ✅ DO Log

1. **Engine Decision Points**
   ```typescript
   // After updateEngine() completes
   Logger.info('engine', 'Round decision', {
     round: 5,
     accuracy: 0.92,
     branch: 'accelerate_all',
     newLevers: { sequenceGrowth: 2, tempoRamp: -15 },
     intensity: 0.67,
   });
   ```

2. **Game Phase Transitions**
   ```typescript
   Logger.info('game', 'Phase change', { from: 'watch', to: 'recall' });
   ```

3. **Settings Changes**
   ```typescript
   Logger.info('settings', 'Engine config saved', {
     field: 'flashFloor',
     oldValue: 100,
     newValue: 80,
   });
   ```

4. **Profile/Companion Updates**
   ```typescript
   Logger.info('profile', 'Cognitive profile updated', {
     rtScore: 42,
     wmScore: 68,
     flexScore: 55,
   });
   ```

### ❌ DON'T Log

- Every tap result (creates noise)
- Every animation frame update
- Render-time state reads
- Every individual tile flash timing
- Zustand selector calls

**Rule of thumb**: If you'd have to clear 50 logs to find the interesting one, it's too verbose.

---

## Integration Points

### 1. **Adaptive Engine** (`engine/adaptiveEngine.ts`)

After `updateEngine()`:
```typescript
export function updateEngine(
  state: EngineState,
  roundPerf: RoundPerformance,
  currentRound: number
): EngineState {
  // ... existing logic ...

  Logger.info('engine', 'updateEngine', {
    round: currentRound,
    accuracy: rollingAccuracy(history, 3),
    branch: determineBranch(accuracy, avgRt), // helper
    levers: newLevers,
    intensity: intensityScore,
  });

  return { /* ... */ };
}
```

### 2. **Game State Machine** (`engine/gameStateMachine.ts`)

```typescript
// When phase changes
Logger.info('game', 'Phase transition', {
  round: gameState.roundCount,
  from: oldPhase,
  to: newPhase,
  ...(newPhase === 'ended' && { summary: gameState.summary }),
});
```

### 3. **Settings Screen** (`app/settings.tsx`)

```typescript
async function handleSave() {
  const config = fromDraft(draft);
  if (!config) {
    Alert.alert('Invalid values', 'All fields must be valid numbers.');
    return;
  }
  await saveEngineConfig(config);

  Logger.info('settings', 'Engine config saved', {
    configName: 'custom_preset_1', // optional user label
    changedFields: diffConfigs(oldConfig, config),
  });

  setSaved(true);
}
```

### 4. **App Settings** (`store/appSettingsStore.ts`)

```typescript
setAnimatedBackground: (v) => {
  Logger.info('settings', 'Visual setting changed', {
    field: 'animatedBackground',
    newValue: v,
  });
  set({ animatedBackground: v });
},
```

---

## Dev Tools UI

Add to **Settings Screen** a new section (only in `__DEV__`):

```typescript
{__DEV__ && (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: Colors.warning }]}>
      ⚠ DEBUG LOGS
    </Text>
    <View style={styles.card}>
      {/* Toggle trace logging */}
      <View style={styles.fieldRow}>
        <View style={styles.fieldLeft}>
          <Text style={styles.fieldLabel}>Trace Logging</Text>
          <Text style={styles.fieldHint}>Detailed TRACE level logs (noisy)</Text>
        </View>
        <Switch
          value={traceEnabled}
          onValueChange={(v) => {
            debugSettings.traceEnabled = v;
            setTraceEnabled(v);
          }}
        />
      </View>

      {/* View logs modal */}
      <Pressable
        style={styles.fieldRow}
        onPress={() => setShowLogViewer(true)}
      >
        <View style={styles.fieldLeft}>
          <Text style={styles.fieldLabel}>View Debug Logs</Text>
          <Text style={styles.fieldHint}>
            Ring buffer: {Logger.getBuffer().length} / 100 entries
          </Text>
        </View>
      </Pressable>

      {/* Clear logs */}
      <Pressable
        style={styles.fieldRow}
        onPress={() => Logger.clearBuffer()}
      >
        <View style={styles.fieldLeft}>
          <Text style={styles.fieldLabel}>Clear Logs</Text>
          <Text style={styles.fieldHint}>Flush in-memory buffer</Text>
        </View>
      </Pressable>

      {/* Export logs to file */}
      <Pressable
        style={styles.fieldRow}
        onPress={() => exportLogsToFile()}
      >
        <View style={styles.fieldLeft}>
          <Text style={styles.fieldLabel}>Export Logs</Text>
          <Text style={styles.fieldHint}>Save logs as JSON for analysis</Text>
        </View>
      </Pressable>
    </View>
  </View>
)}
```

---

## Log Viewer Component (Optional)

A modal that displays the last N logs, filterable by level/module:

```typescript
// components/DebugLogViewer.tsx (dev-only, conditionally imported)
function DebugLogViewer({ visible, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const logs = Logger.getBuffer();
  const filtered = logs.filter(
    (log) =>
      log.module.includes(filter) ||
      log.message.includes(filter) ||
      log.level.includes(filter.toUpperCase())
  );

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        <TextInput
          placeholder="Filter by module, message, level..."
          value={filter}
          onChangeText={setFilter}
          style={styles.filterInput}
        />
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.logEntry}>
              <Text style={[styles.level, levelColor(item.level)]}>
                {item.level}
              </Text>
              <Text style={styles.module}>{item.module}</Text>
              <Text style={styles.message}>{item.message}</Text>
              {item.data && (
                <Text style={styles.data}>{JSON.stringify(item.data)}</Text>
              )}
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
```

---

## Export Format

When exported, logs become a JSON file suitable for analysis:

```json
{
  "exportedAt": "2025-04-05T12:30:45Z",
  "appVersion": "1.0.0",
  "deviceInfo": { "platform": "ios", "osVersion": "18.3" },
  "logs": [
    {
      "timestamp": 1712345445123,
      "level": "INFO",
      "module": "engine",
      "message": "Round decision",
      "data": {
        "round": 5,
        "accuracy": 0.92,
        "branch": "accelerate_all"
      }
    }
  ]
}
```

**Why useful for debugging**:
- Filter/search logs across a tester's session
- Correlate engine decisions with user feedback
- Spot patterns in throttling or performance dips
- Share with team without opening console

---

## Implementation Checklist

- [ ] Create `lib/logger.ts` with ring buffer + three levels
- [ ] Add Logger calls to engine decision points
- [ ] Add Logger calls to phase transitions
- [ ] Add Logger calls to settings updates
- [ ] Create `components/DebugLogViewer.tsx`
- [ ] Add debug UI to `app/settings.tsx` (DEV-only)
- [ ] Add `debugSettings` to `store/appSettingsStore.ts`
- [ ] Create export utility (`lib/exportLogs.ts`)
- [ ] Test with `__DEV__` build
- [ ] Verify logs don't appear in production builds

---

## Performance Impact

| Component | Dev Build | Prod Build |
|-----------|-----------|-----------|
| Logger module | ~1.5 KB (gzipped) | 0 KB (tree-shaken) |
| Memory overhead | ~2–5 KB (100 entries) | 0 KB (disabled) |
| CPU per log call | <1ms | N/A |
| Render perf | No measurable impact | No code present |

---

## Example Log Sequence (Full Session)

```
[game:INFO] Phase transition { round: 0, from: 'idle', to: 'watch' }
[engine:TRACE] Warm-up calibration { rt: 425, accuracy: 0.95 }
[engine:INFO] Round decision { round: 1, branch: 'hold_steady', levers: {...} }
[game:INFO] Phase transition { round: 1, from: 'watch', to: 'recall' }
[game:INFO] Recall complete { round: 1, correct: 8, total: 8, avgRt: 380 }
[engine:INFO] Round decision { round: 2, branch: 'accelerate_all', levers: {...} }
...
[game:INFO] Phase transition { round: 8, from: 'watch', to: 'recall' }
[game:WARN] Life lost { lives: 2, reason: 'wrong_tap' }
[engine:INFO] Round decision { round: 9, branch: 'ease_back', levers: {...} }
...
[game:INFO] Session ended { totalScore: 1540, accuracy: 0.87, intensity: 0.64 }
```

---

## Notes for Future Expansion

- **Remote logging**: Could add opt-in Sentry/LogRocket integration later (logs + session replay)
- **Profiling**: Could log frame times, render cycles if performance issues arise
- **Analytics**: Separate from debug logs; use existing session/profile database
- **Network**: If backend added, log API calls and sync status

