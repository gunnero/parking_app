import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';
import { AppButton } from './AppButton';
import { AppIcon, type AppIconName } from './AppIcon';
import { Card } from './Card';

export type EmptyStateProps = {
  title: string;
  description: string;
  icon?: AppIconName;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  icon = 'info',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useAppTheme();

  return (
    <Card padding="spacious">
      <View style={[styles.content, { gap: theme.spacing.sm }]}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderRadius: theme.radii.full,
              minHeight: theme.touchTargets.comfortable,
              minWidth: theme.touchTargets.comfortable,
            },
          ]}
        >
          <AppIcon color={theme.colors.textSecondary} name={icon} size={24} />
        </View>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.text }]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.description,
            theme.typography.body,
            { color: theme.colors.textSecondary },
          ]}
        >
          {description}
        </Text>
        {actionLabel && onAction ? (
          <View style={[styles.action, { marginTop: theme.spacing.xs }]}>
            <AppButton
              label={actionLabel}
              onPress={onAction}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
  },
});
