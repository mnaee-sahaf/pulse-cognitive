import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import {
  getLogEntries,
  clearLog,
  subscribeLog,
  exportLogJson,
  type LogEntry,
  type LogLevel,
} from '../lib/devLog';

const LEVEL_COLORS: Record<LogLevel, string> = {
  engine: '#8B5CF6',
  phase: Colors.accent,
  tap: Colors.success,
  info: Colors.textSecondary,
  warn: Colors.warning,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  engine: 'ENG',
  phase: 'PHS',
  tap: 'TAP',
  info: 'INF',
  warn: 'WRN',
};

interface DevLogViewerProps {
  maxHeight?: number;
}

export function DevLogViewer({ maxHeight = 400 }: DevLogViewerProps) {
  const [entries, setEntries] = useState<LogEntry[]>(getLogEntries());
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    return subscribeLog(() => {
      setEntries([...getLogEntries()]);
    });
  }, []);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [entries.length]);

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.level === filter);

  const handleClear = () => {
    Alert.alert('Clear Logs?', 'This will remove all log entries.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { clearLog(); setExpanded(new Set()); } },
    ]);
  };

  const handleExport = async () => {
    const json = exportLogJson();
    await Share.share({ message: json, title: 'Pulse Dev Logs' });
  };

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  const filterButtons: (LogLevel | 'all')[] = ['all', 'engine', 'phase', 'tap', 'info', 'warn'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>DEV LOGS</Text>
        <Text style={styles.count}>{filtered.length} entries</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          {filterButtons.map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => setFilter(lvl)}
              style={[
                styles.filterBtn,
                filter === lvl && styles.filterBtnActive,
                filter === lvl && lvl !== 'all' && { borderColor: LEVEL_COLORS[lvl as LogLevel] },
              ]}
            >
              <Text style={[
                styles.filterBtnText,
                filter === lvl && styles.filterBtnTextActive,
                filter === lvl && lvl !== 'all' && { color: LEVEL_COLORS[lvl as LogLevel] },
              ]}>
                {lvl.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Log entries */}
      <ScrollView
        ref={scrollRef}
        style={[styles.logScroll, { maxHeight }]}
        showsVerticalScrollIndicator={true}
      >
        {filtered.length === 0 && (
          <Text style={styles.emptyText}>No log entries yet. Play a session to generate logs.</Text>
        )}
        {filtered.map((entry) => {
          const isExpanded = expanded.has(entry.id);
          const color = LEVEL_COLORS[entry.level];
          return (
            <Pressable
              key={entry.id}
              onPress={() => entry.data && toggleExpand(entry.id)}
              style={styles.entry}
            >
              <View style={styles.entryHeader}>
                <Text style={[styles.levelBadge, { color }]}>
                  {LEVEL_LABELS[entry.level]}
                </Text>
                <Text style={styles.entryTime}>{formatTime(entry.ts)}</Text>
                <Text style={styles.entryMessage} numberOfLines={isExpanded ? undefined : 1}>
                  {entry.message}
                </Text>
                {entry.data && (
                  <Text style={styles.expandIcon}>{isExpanded ? '\u25B2' : '\u25BC'}</Text>
                )}
              </View>
              {isExpanded && entry.data && (
                <View style={styles.dataBlock}>
                  {Object.entries(entry.data).map(([k, v]) => (
                    <View key={k} style={styles.dataRow}>
                      <Text style={styles.dataKey}>{k}</Text>
                      <Text style={styles.dataValue}>{String(v)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          onPress={handleExport}
        >
          <Text style={styles.actionBtnText}>Export JSON</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          onPress={handleClear}
        >
          <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 1.5,
  },
  count: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  filterBtnText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  filterBtnTextActive: {
    color: Colors.accent,
  },
  logScroll: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    padding: 12,
  },
  entry: {
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelBadge: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    width: 28,
  },
  entryTime: {
    fontSize: 9,
    color: '#666',
    fontFamily: 'monospace',
    width: 75,
  },
  entryMessage: {
    fontSize: 11,
    color: '#CCC',
    fontFamily: 'monospace',
    flex: 1,
  },
  expandIcon: {
    fontSize: 8,
    color: '#666',
    width: 14,
    textAlign: 'center',
  },
  dataBlock: {
    marginLeft: 34,
    marginTop: 4,
    marginBottom: 4,
    padding: 6,
    backgroundColor: '#222',
    borderRadius: 4,
    gap: 2,
  },
  dataRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dataKey: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'monospace',
    minWidth: 64,
  },
  dataValue: {
    fontSize: 10,
    color: '#DDD',
    fontFamily: 'monospace',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
