import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../theme';

export type CardTone =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'development';

export type CardPadding = 'none' | 'compact' | 'regular' | 'spacious';

export type CardProps = {
  children: ReactNode;
  tone?: CardTone;
  padding?: CardPadding;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({
  children,
  tone = 'default',
  padding = 'regular',
  elevated = false,
  style,
  accessibilityLabel,
}: CardProps) {
  const { theme } = useAppTheme();
  const selectedTone = getToneColors(tone, theme.colors);
  const paddingValue = {
    none: theme.spacing.none,
    compact: theme.spacing.sm,
    regular: theme.spacing.md,
    spacious: theme.spacing.xl,
  }[padding];

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        {
          backgroundColor: selectedTone.background,
          borderColor: selectedTone.border,
          borderRadius: theme.radii.lg,
          padding: paddingValue,
        },
        elevated && theme.shadows.low,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function getToneColors(
  tone: CardTone,
  colors: ReturnType<typeof useAppTheme>['theme']['colors'],
) {
  switch (tone) {
    case 'accent':
      return { background: colors.accentSurface, border: colors.accent };
    case 'success':
      return { background: colors.successSurface, border: colors.success };
    case 'warning':
      return { background: colors.warningSurface, border: colors.warning };
    case 'danger':
      return { background: colors.dangerSurface, border: colors.danger };
    case 'development':
      return {
        background: colors.developmentSurface,
        border: colors.development,
      };
    case 'default':
    default:
      return { background: colors.surface, border: colors.border };
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minWidth: 0,
  },
});
