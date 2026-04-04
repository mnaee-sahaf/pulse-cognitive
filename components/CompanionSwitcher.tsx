import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import {
  COMPANIONS,
  getCurrentStage,
  xpForLevel,
  type CompanionId,
  type CompanionState,
} from '../db/companion';

interface Props {
  visible: boolean;
  companions: CompanionState[];
  onSelect: (id: CompanionId) => void;
  onClose: () => void;
}

export function CompanionSwitcher({ visible, companions, onSelect, onClose }: Props) {
  const orderedIds: CompanionId[] = ['arc', 'tide', 'ember'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose Training Companion</Text>
        <Text style={styles.subtitle}>Each companion unlocks a different cognitive challenge</Text>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {orderedIds.map((id) => {
            const state = companions.find((c) => c.companionId === id);
            if (!state) return null;
            return (
              <CompanionInfoCard
                key={id}
                state={state}
                onPress={() => onSelect(id)}
              />
            );
          })}
        </ScrollView>

        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function CompanionInfoCard({ state, onPress }: { state: CompanionState; onPress: () => void }) {
  const def = COMPANIONS[state.companionId];
  const stage = getCurrentStage(def, state.level);
  const xpPercent = Math.min(1, state.xp / xpForLevel(state.level));
  const isActive = state.isActive === true;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isActive && { borderColor: stage.primaryColor + '99', backgroundColor: stage.primaryColor + '0D' },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Top row: shape + name block + active badge */}
      <View style={styles.cardHeader}>
        <ShapeIcon shape={stage.shape} color={stage.primaryColor} size={48} />
        <View style={styles.cardTitleBlock}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{def.name}</Text>
            <Text style={[styles.cardStage, { color: stage.primaryColor }]}>{stage.label}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.modeBadge, { backgroundColor: stage.primaryColor + '22', borderColor: stage.primaryColor + '55' }]}>
              <Text style={[styles.modeText, { color: stage.primaryColor }]}>{def.modeLabel}</Text>
            </View>
            <View style={[styles.focusBadge, { borderColor: Colors.border }]}>
              <Text style={styles.focusText}>{def.trainingFocus}</Text>
            </View>
          </View>
        </View>
        {isActive && (
          <View style={[styles.activePip, { backgroundColor: stage.primaryColor }]} />
        )}
      </View>

      {/* Description */}
      <Text style={styles.cardDescription}>{def.description}</Text>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: isActive ? stage.primaryColor + '33' : Colors.border }]} />

      {/* Level + XP row */}
      <View style={styles.progressRow}>
        <Text style={[styles.levelBadge, { color: stage.primaryColor }]}>LV {state.level}</Text>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpPercent * 100}%`, backgroundColor: stage.primaryColor }]} />
        </View>
        <Text style={styles.xpLabel}>{state.xp} / {xpForLevel(state.level)} XP</Text>
      </View>
    </Pressable>
  );
}

type ShapeType = 'circle' | 'triangle' | 'diamond' | 'hexagon';

function ShapeIcon({ shape, color, size }: { shape: ShapeType; color: string; size: number }) {
  if (shape === 'circle') {
    return (
      <View style={[styles.shapeContainer, { width: size, height: size }]}>
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      </View>
    );
  }

  if (shape === 'hexagon') {
    const w = size * 0.866;
    const capH = size * 0.25;
    const midH = size * 0.5;
    return (
      <View style={[styles.shapeContainer, { width: size, height: size }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: capH, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
          <View style={{ width: w, height: midH, backgroundColor: color }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderTopWidth: capH, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
        </View>
      </View>
    );
  }

  if (shape === 'triangle') {
    const w = size * 0.85;
    return (
      <View style={[styles.shapeContainer, { width: size, height: size }]}>
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderBottomWidth: w * 0.866,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }} />
      </View>
    );
  }

  // Diamond
  const d = size * 0.68;
  return (
    <View style={[styles.shapeContainer, { width: size, height: size }]}>
      <View style={{ width: d, height: d, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: Spacing.pagePadding,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  list: {
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  cardPressed: { opacity: 0.82 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shapeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 5,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  cardStage: {
    fontSize: FontSize.label,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  modeBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  focusBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  focusText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  activePip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cardDescription: {
    fontSize: FontSize.label + 1,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    fontSize: FontSize.label,
    fontWeight: '700',
    letterSpacing: 0.5,
    minWidth: 36,
  },
  xpTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpLabel: {
    fontSize: FontSize.label - 1,
    color: Colors.textTertiary,
    minWidth: 80,
    textAlign: 'right',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
