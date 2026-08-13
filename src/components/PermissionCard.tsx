import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useLocalization } from '../localization';
import { useAppTheme } from '../theme';
import { AppButton } from './AppButton';
import { AppIcon, type AppIconName } from './AppIcon';
import { Card, type CardTone } from './Card';

export type PermissionCardState =
  | 'idle'
  | 'requesting'
  | 'denied'
  | 'unavailable'
  | 'error';

export type PermissionCardProps = {
  title: string;
  description: string;
  state?: PermissionCardState;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
};

export function PermissionCard({
  title,
  description,
  state = 'idle',
  actionLabel,
  onAction,
  loading = false,
}: PermissionCardProps) {
  const { t } = useLocalization();
  const { theme } = useAppTheme();
  const visual = getVisual(state, theme.colors);

  return (
    <Card tone={visual.cardTone}>
      <View style={[styles.content, { gap: theme.spacing.md }]}>
        <View style={[styles.copyRow, { gap: theme.spacing.sm }]}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: visual.iconBackground,
                borderRadius: theme.radii.md,
                minHeight: theme.touchTargets.comfortable,
                minWidth: theme.touchTargets.comfortable,
              },
            ]}
          >
            {loading || state === 'requesting' ? (
              <ActivityIndicator
                accessibilityLabel={t('Requesting permission')}
                color={visual.foreground}
                size="small"
              />
            ) : (
              <AppIcon
                color={visual.foreground}
                name={visual.icon}
                size={23}
              />
            )}
          </View>
          <View style={styles.copy}>
            <Text
              accessibilityRole="header"
              style={[theme.typography.heading, { color: theme.colors.text }]}
            >
              {title}
            </Text>
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.textSecondary },
              ]}
            >
              {description}
            </Text>
          </View>
        </View>
        {actionLabel && onAction ? (
          <AppButton
            disabled={loading || state === 'requesting'}
            label={actionLabel}
            onPress={onAction}
            variant="secondary"
          />
        ) : null}
      </View>
    </Card>
  );
}

type PermissionVisual = {
  cardTone: CardTone;
  foreground: string;
  iconBackground: string;
  icon: AppIconName;
};

function getVisual(
  state: PermissionCardState,
  colors: ReturnType<typeof useAppTheme>['theme']['colors'],
): PermissionVisual {
  switch (state) {
    case 'denied':
      return {
        cardTone: 'warning',
        foreground: colors.warningText,
        iconBackground: colors.warningSurface,
        icon: 'location-off',
      };
    case 'unavailable':
      return {
        cardTone: 'warning',
        foreground: colors.warningText,
        iconBackground: colors.warningSurface,
        icon: 'location-off',
      };
    case 'error':
      return {
        cardTone: 'danger',
        foreground: colors.dangerText,
        iconBackground: colors.dangerSurface,
        icon: 'error',
      };
    case 'idle':
      return {
        cardTone: 'accent',
        foreground: colors.accentText,
        iconBackground: colors.accentSurface,
        icon: 'location',
      };
    case 'requesting':
    default:
      return {
        cardTone: 'accent',
        foreground: colors.accentText,
        iconBackground: colors.accentSurface,
        icon: 'location',
      };
  }
}

const styles = StyleSheet.create({
  content: {
    minWidth: 0,
  },
  copyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  iconContainer: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
});
