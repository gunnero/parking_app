import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';
import { AppIcon, type AppIconName } from './AppIcon';

export type StatusBadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'development';

export type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  icon?: AppIconName;
};

export function StatusBadge({
  label,
  tone = 'neutral',
  icon,
}: StatusBadgeProps) {
  const { theme } = useAppTheme();
  const colors = getToneColors(tone, theme.colors);

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.badge,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: theme.radii.full,
          gap: theme.spacing.xxs,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xxs,
        },
      ]}
    >
      {icon ? <AppIcon color={colors.foreground} name={icon} size={15} /> : null}
      <Text
        style={[
          styles.label,
          theme.typography.caption,
          { color: colors.foreground },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function getToneColors(
  tone: StatusBadgeTone,
  colors: ReturnType<typeof useAppTheme>['theme']['colors'],
) {
  switch (tone) {
    case 'accent':
      return {
        background: colors.accentSurface,
        border: colors.accent,
        foreground: colors.accentText,
      };
    case 'success':
      return {
        background: colors.successSurface,
        border: colors.success,
        foreground: colors.successText,
      };
    case 'warning':
      return {
        background: colors.warningSurface,
        border: colors.warning,
        foreground: colors.warningText,
      };
    case 'danger':
      return {
        background: colors.dangerSurface,
        border: colors.danger,
        foreground: colors.dangerText,
      };
    case 'info':
      return {
        background: colors.infoSurface,
        border: colors.info,
        foreground: colors.infoText,
      };
    case 'development':
      return {
        background: colors.development,
        border: colors.development,
        foreground: colors.onDevelopment,
      };
    case 'neutral':
    default:
      return {
        background: colors.surfaceMuted,
        border: colors.border,
        foreground: colors.textSecondary,
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: '100%',
  },
  label: {
    flexShrink: 1,
    minWidth: 0,
  },
});
