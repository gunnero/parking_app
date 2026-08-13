import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocalization } from '../localization';
import { useAppTheme } from '../theme';
import { AppIcon, type AppIconName } from './AppIcon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  leadingIcon?: AppIconName;
  compact?: boolean;
  fullWidth?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
  accessibilityLabel,
  leadingIcon,
  compact = false,
  fullWidth = true,
}: AppButtonProps) {
  const { t } = useLocalization();
  const { theme } = useAppTheme();
  const isDisabled = disabled || loading;
  const selectedVariant = getVariantColors(variant, theme.colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed
            ? selectedVariant.pressedBackground
            : selectedVariant.background,
          borderRadius: theme.radii.md,
          borderColor: pressed
            ? selectedVariant.pressedBorder
            : selectedVariant.border,
          minHeight: compact
            ? theme.touchTargets.minimum
            : theme.touchTargets.primary,
          paddingHorizontal: compact ? theme.spacing.sm : theme.spacing.lg,
          paddingVertical: compact ? theme.spacing.xs : theme.spacing.sm,
        },
        fullWidth ? styles.fullWidth : styles.fitContent,
        disabled && {
          backgroundColor: theme.colors.disabled,
          borderColor: theme.colors.disabled,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel={t('Loading')}
            color={
              disabled ? theme.colors.onDisabled : selectedVariant.foreground
            }
            size="small"
          />
        ) : null}
        {!loading && leadingIcon ? (
          <AppIcon
            color={
              disabled ? theme.colors.onDisabled : selectedVariant.foreground
            }
            name={leadingIcon}
            size={compact ? 18 : 20}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            theme.typography.bodyMedium,
            {
              color: disabled
                ? theme.colors.onDisabled
                : selectedVariant.foreground,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function getVariantColors(
  variant: ButtonVariant,
  colors: ReturnType<typeof useAppTheme>['theme']['colors'],
) {
  switch (variant) {
    case 'secondary':
      return {
        background: colors.surface,
        border: colors.borderStrong,
        foreground: colors.accentText,
        pressedBackground: colors.surfacePressed,
        pressedBorder: colors.accent,
      };
    case 'danger':
      return {
        background: colors.danger,
        border: colors.danger,
        foreground: colors.onDanger,
        pressedBackground: colors.dangerPressed,
        pressedBorder: colors.dangerPressed,
      };
    case 'ghost':
      return {
        background: 'transparent',
        border: 'transparent',
        foreground: colors.textSecondary,
        pressedBackground: colors.surfacePressed,
        pressedBorder: colors.surfacePressed,
      };
    case 'primary':
    default:
      return {
        background: colors.accent,
        border: colors.accent,
        foreground: colors.onAccent,
        pressedBackground: colors.accentPressed,
        pressedBorder: colors.accentPressed,
      };
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  fitContent: {
    alignSelf: 'flex-start',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
