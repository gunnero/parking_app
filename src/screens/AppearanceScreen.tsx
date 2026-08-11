import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  AppHeader,
  AppIcon,
  Card,
  StatusBadge,
  type AppIconName,
} from '../components';
import {
  type AppTheme,
  type ThemePreference,
  useAppTheme,
} from '../theme';

type AppearanceScreenProps = {
  onBack: () => void;
};

type AppearanceOption = {
  value: ThemePreference;
  label: string;
  description: string;
  icon: AppIconName;
};

const APPEARANCE_OPTIONS: readonly AppearanceOption[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Automatically match your device setting.',
    icon: 'system',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Use the bright, warm appearance.',
    icon: 'light',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use the low-light appearance.',
    icon: 'dark',
  },
];

export function AppearanceScreen({ onBack }: AppearanceScreenProps) {
  const {
    hasHydrated,
    preference,
    setPreference,
    systemMode,
    theme,
  } = useAppTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(theme, isCompact),
    [isCompact, theme],
  );
  const systemModeLabel = systemMode === 'dark' ? 'Dark' : 'Light';

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.content}>
        <AppHeader
          backLabel="Parking"
          onBack={onBack}
          subtitle="Choose what feels most comfortable. Changes apply immediately."
          title="Appearance"
          variant="back"
        />

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <StatusBadge
            label={hasHydrated ? 'Saved on this device' : 'Restoring preference'}
            tone={hasHydrated ? 'success' : 'neutral'}
          />
        </View>

        <Card padding="none" style={styles.optionsCard}>
          <View accessibilityRole="radiogroup">
            {APPEARANCE_OPTIONS.map((option, index) => {
              const isSelected = preference === option.value;
              const description =
                option.value === 'system'
                  ? `${option.description} Currently ${systemModeLabel.toLowerCase()}.`
                  : option.description;

              return (
                <View key={option.value}>
                  {index > 0 ? <View style={styles.separator} /> : null}
                  <Pressable
                    accessibilityHint={description}
                    accessibilityLabel={`${option.label} appearance`}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: isSelected,
                      disabled: !hasHydrated,
                    }}
                    disabled={!hasHydrated}
                    onPress={() => setPreference(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                      !hasHydrated && styles.optionDisabled,
                    ]}
                  >
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[
                        styles.optionIcon,
                        isSelected && styles.optionIconSelected,
                      ]}
                    >
                      <AppIcon
                        color={
                          isSelected
                            ? theme.colors.accentText
                            : theme.colors.textSecondary
                        }
                        name={option.icon}
                        size={21}
                      />
                    </View>
                    <View style={styles.optionCopy}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>{option.label}</Text>
                        {isSelected ? (
                          <Text style={styles.selectedText}>Selected</Text>
                        ) : null}
                      </View>
                      <Text style={styles.optionDescription}>{description}</Text>
                    </View>
                    <AppIcon
                      color={
                        isSelected
                          ? theme.colors.accent
                          : theme.colors.borderStrong
                      }
                      name={isSelected ? 'selected' : 'unselected'}
                      size={24}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>

        <Card
          accessibilityLabel={
            preference === 'system'
              ? `Following device appearance. Your device is currently using ${systemModeLabel} mode.`
              : `${preference === 'dark' ? 'Dark' : 'Light'} appearance selected.`
          }
          padding="compact"
          tone={preference === 'system' ? 'accent' : 'default'}
        >
          <Text style={styles.statusTitle}>
            {preference === 'system'
              ? 'Following your device'
              : `${preference === 'dark' ? 'Dark' : 'Light'} is selected`}
          </Text>
          <Text style={styles.statusDescription}>
            {preference === 'system'
              ? `Your device is currently using ${systemModeLabel} mode. Parking Bitola will update automatically when that changes.`
              : 'Parking Bitola will keep this appearance until you choose another option. No restart is needed.'}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme, isCompact: boolean) {
  return StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      alignSelf: 'center',
      gap: theme.spacing.lg,
      maxWidth: theme.layout.maxContentWidth,
      paddingBottom: theme.spacing.xxxl,
      paddingHorizontal: isCompact
        ? theme.layout.compactScreenPadding
        : theme.layout.screenPadding,
      paddingTop: theme.spacing.sm,
      width: '100%',
    },
    sectionHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      justifyContent: 'space-between',
    },
    sectionTitle: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    optionsCard: {
      overflow: 'hidden',
    },
    separator: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginHorizontal: theme.spacing.md,
    },
    option: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.md,
      minHeight: isCompact ? 72 : 78,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    optionSelected: {
      backgroundColor: theme.colors.accentSurface,
    },
    optionPressed: {
      backgroundColor: theme.colors.surfacePressed,
    },
    optionDisabled: {
      opacity: 0.6,
    },
    optionCopy: {
      flex: 1,
      minWidth: 0,
    },
    optionIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      height: theme.touchTargets.minimum,
      justifyContent: 'center',
      width: theme.touchTargets.minimum,
    },
    optionIconSelected: {
      backgroundColor: theme.colors.surface,
    },
    optionTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    optionTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
    },
    optionDescription: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    selectedText: {
      ...theme.typography.overline,
      color: theme.colors.accentText,
    },
    statusTitle: {
      ...theme.typography.label,
      color: theme.colors.text,
    },
    statusDescription: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
  });
}
