import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';

export type InfoCardTone = 'neutral' | 'success' | 'warning' | 'error';

export type InfoCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: InfoCardTone;
  leading?: ReactNode;
};

export function InfoCard({
  label,
  value,
  detail,
  tone = 'neutral',
  leading,
}: InfoCardProps) {
  const { theme } = useAppTheme();
  const selectedTone = getToneColors(tone, theme.colors);

  return (
    <View
      accessible
      accessibilityLabel={[label, value, detail].filter(Boolean).join('. ')}
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: selectedTone.accent }]} />
      <View
        style={[
          styles.content,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
          },
        ]}
      >
        <Text
          style={[theme.typography.overline, { color: theme.colors.textMuted }]}
        >
          {label}
        </Text>
        <View style={styles.valueRow}>
          {leading}
          <Text
            selectable
            style={[
              styles.value,
              theme.typography.title,
              { color: selectedTone.value },
            ]}
          >
            {value}
          </Text>
        </View>
        {detail ? (
          <Text
            style={[
              styles.detail,
              theme.typography.caption,
              { color: theme.colors.textSecondary },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function getToneColors(
  tone: InfoCardTone,
  colors: ReturnType<typeof useAppTheme>['theme']['colors'],
) {
  switch (tone) {
    case 'success':
      return { accent: colors.success, value: colors.successText };
    case 'warning':
      return { accent: colors.warning, value: colors.warningText };
    case 'error':
      return { accent: colors.danger, value: colors.dangerText };
    case 'neutral':
    default:
      return { accent: colors.accent, value: colors.text };
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 112,
    overflow: 'hidden',
  },
  accent: {
    width: 5,
  },
  content: {
    flex: 1,
  },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  value: {
    flexShrink: 1,
  },
  detail: {
    marginTop: 5,
  },
});
