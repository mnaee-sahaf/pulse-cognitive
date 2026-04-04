import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getRecentSessions } from './sessions';

const CSV_HEADERS = [
  'session_id',
  'timestamp',
  'rounds_completed',
  'max_sequence_length',
  'total_score',
  'avg_rt_ms',
  'best_rt_ms',
  'accuracy',
  'mutations_faced',
  'mutations_survived',
  'engine_intensity',
  'rt_score',
  'wm_score',
  'flex_score',
  'decision_score',
  'engine_lever_log',
].join(',');

function escapeCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportSessionsCsv(): Promise<void> {
  const sessions = await getRecentSessions(1000);

  if (sessions.length === 0) {
    throw new Error('No sessions to export.');
  }

  const rows = sessions.map((s) =>
    [
      s.sessionId,
      s.timestamp,
      s.roundsCompleted,
      s.maxSequenceLength,
      s.totalScore,
      s.avgRt.toFixed(1),
      s.bestRt,
      s.accuracy.toFixed(3),
      escapeCell(s.mutationsFaced.join(';')),
      s.mutationsSurvived,
      s.engineIntensity.toFixed(3),
      s.rtScore,
      s.wmScore,
      s.flexScore,
      s.decisionScore,
      JSON.stringify(s.engineLeverLog),
    ]
      .map(escapeCell)
      .join(',')
  );

  const csv = [CSV_HEADERS, ...rows].join('\n');
  const filename = `pulse_sessions_${Date.now()}.csv`;
  const path = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Pulse Session Data',
    UTI: 'public.comma-separated-values-text',
  });
}
