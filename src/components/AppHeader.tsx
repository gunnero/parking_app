import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocalization } from '../localization';
import { useAppTheme } from '../theme';
import { AppIcon } from './AppIcon';

export type AppHeaderVariant = 'product' | 'back' | 'appearance';

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  variant?: AppHeaderVariant;
  onBack?: () => void;
  onAppearance?: () => void;
  backLabel?: string;
  appearanceLabel?: string;
};

export function AppHeader({
  title,
  subtitle,
  variant = 'product',
  onBack,
  onAppearance,
  backLabel,
  appearanceLabel,
}: AppHeaderProps) {
  const { t } = useLocalization();
  const { theme } = useAppTheme();
  const showBack = variant === 'back';
  const showAppearance = variant === 'appearance';
  const resolvedBackLabel = backLabel ?? t('Back');
  const resolvedAppearanceLabel = appearanceLabel ?? t('Appearance');

  return (
    <View style={[styles.header, { gap: theme.spacing.sm }]}>
      {showBack && onBack ? (
        <HeaderAction
          icon="back"
          label={resolvedBackLabel}
          onPress={onBack}
          align="left"
        />
      ) : null}
      <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
        {!showBack ? (
          <View
            style={[
              styles.productMark,
              {
                backgroundColor: theme.colors.accent,
                borderColor: theme.colors.accent,
                borderRadius: theme.radii.md,
                minHeight: theme.touchTargets.minimum,
                minWidth: theme.touchTargets.minimum,
              },
            ]}
          >
            <AppIcon color={theme.colors.onAccent} name="parking" size={23} />
          </View>
        ) : null}
        <View style={styles.copy}>
          <Text
            accessibilityRole="header"
            style={[
              showBack ? theme.typography.titleLarge : theme.typography.title,
              { color: theme.colors.text },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {showAppearance && onAppearance ? (
          <HeaderAction
            icon="appearance"
            label={resolvedAppearanceLabel}
            onPress={onAppearance}
            align="right"
          />
        ) : null}
      </View>
    </View>
  );
}

type HeaderActionProps = {
  icon: 'appearance' | 'back';
  label: string;
  onPress: () => void;
  align: 'left' | 'right';
};

function HeaderAction({ icon, label, onPress, align }: HeaderActionProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        align === 'left' ? styles.actionLeft : styles.actionRight,
        {
          backgroundColor: pressed
            ? theme.colors.surfacePressed
            : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.full,
          minHeight: theme.touchTargets.minimum,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
        },
      ]}
    >
      <AppIcon
        color={theme.colors.accentText}
        name={icon}
        size={18}
        style={styles.actionIcon}
      />
      <Text
        style={[
          styles.actionLabel,
          theme.typography.label,
          { color: theme.colors.accentText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  productMark: {
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    justifyContent: 'center',
    maxWidth: '100%',
    minWidth: 0,
  },
  actionLeft: {
    alignSelf: 'flex-start',
  },
  actionRight: {
    maxWidth: '45%',
  },
  actionIcon: {
    flexShrink: 0,
  },
  actionLabel: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
  },
});
