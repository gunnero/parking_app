import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';
import { AppIcon, type AppIconName } from './AppIcon';
import type { StatusBadgeTone } from './StatusBadge';

export type InfoRowProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: AppIconName;
  tone?: StatusBadgeTone;
  trailing?: ReactNode;
};

export function InfoRow({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
  trailing,
}: InfoRowProps) {
  const { theme } = useAppTheme();
  const accent = getToneColor(tone, theme.colors);

  return (
    <View
      accessible={!trailing}
      accessibilityLabel={[label, value, detail].filter(Boolean).join('. ')}
      style={[
        styles.row,
        {
          gap: theme.spacing.sm,
          minHeight: theme.touchTargets.minimum,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: accent.background,
              borderRadius: theme.radii.md,
              minHeight: theme.touchTargets.minimum,
              minWidth: theme.touchTargets.minimum,
            },
          ]}
        >
          <AppIcon color={accent.foreground} name={icon} size={21} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text
          style={[theme.typography.caption, { color: theme.colors.textMuted }]}
        >
          {label}
        </Text>
        <Text
          selectable
          style={[theme.typography.bodyMedium, { color: theme.colors.text }]}
        >
          {value}
        </Text>
        {detail ? (
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textSecondary },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

function getToneColor(
  tone: StatusBadgeTone,
  colors: ReturnType<typeof useAppTheme>['theme']['colors'],
) {
  switch (tone) {
    case 'accent':
      return { background: colors.accentSurface, foreground: colors.accentText };
    case 'success':
      return {
        background: colors.successSurface,
        foreground: colors.successText,
      };
    case 'warning':
      return {
        background: colors.warningSurface,
        foreground: colors.warningText,
      };
    case 'danger':
      return { background: colors.dangerSurface, foreground: colors.dangerText };
    case 'info':
      return { background: colors.infoSurface, foreground: colors.infoText };
    case 'development':
      return {
        background: colors.developmentSurface,
        foreground: colors.developmentText,
      };
    case 'neutral':
    default:
      return { background: colors.surfaceMuted, foreground: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
  },
});
