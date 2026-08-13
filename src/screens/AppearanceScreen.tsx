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
  type LanguagePreference,
  useLocalization,
} from '../localization';
import { isPublicDemoEnabled } from '../demo';
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
  icon: AppIconName;
};

const APPEARANCE_OPTIONS: readonly AppearanceOption[] = [
  {
    value: 'system',
    icon: 'system',
  },
  {
    value: 'light',
    icon: 'light',
  },
  {
    value: 'dark',
    icon: 'dark',
  },
];

type LanguageOption = {
  value: LanguagePreference;
  code: string;
};

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: 'system', code: 'AUTO' },
  { value: 'mk', code: 'MK' },
  { value: 'en', code: 'EN' },
];

export function AppearanceScreen({ onBack }: AppearanceScreenProps) {
  const {
    hasHydrated: themeHasHydrated,
    preference,
    setPreference,
    systemMode,
    theme,
  } = useAppTheme();
  const {
    hasHydrated: languageHasHydrated,
    language,
    preference: languagePreference,
    setPreference: setLanguagePreference,
    systemLanguage,
    t,
  } = useLocalization();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(theme, isCompact),
    [isCompact, theme],
  );
  const systemModeLabel = systemMode === 'dark' ? t('Dark') : t('Light');
  const selectedThemeLabel = preference === 'dark' ? t('Dark') : t('Light');
  const systemLanguageLabel =
    systemLanguage === 'mk' ? t('Macedonian') : t('English');
  const selectedLanguageLabel =
    language === 'mk' ? t('Macedonian') : t('English');

  const getAppearanceLabel = (value: ThemePreference) => {
    if (value === 'dark') {
      return t('Dark');
    }

    if (value === 'light') {
      return t('Light');
    }

    return t('System');
  };

  const getAppearanceDescription = (value: ThemePreference) => {
    if (value === 'dark') {
      return t('Use the low-light appearance.');
    }

    if (value === 'light') {
      return t('Use the bright, warm appearance.');
    }

    return `${t('Automatically match your device setting.')} ${t(
      'Currently {mode}.',
      { mode: systemModeLabel.toLocaleLowerCase() },
    )}`;
  };

  const getLanguageLabel = (value: LanguagePreference) => {
    if (value === 'mk') {
      return t('Macedonian');
    }

    if (value === 'en') {
      return t('English');
    }

    return t('System');
  };

  const getLanguageDescription = (value: LanguagePreference) => {
    if (value === 'mk') {
      return t('Use Macedonian throughout the app.');
    }

    if (value === 'en') {
      return t('Use English throughout the app.');
    }

    return `${t('Use your device language when it is supported.')} ${t(
      'Your device language is currently {language}.',
      { language: systemLanguageLabel },
    )}`;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.content}>
        <AppHeader
          backLabel={t('Parking')}
          onBack={onBack}
          subtitle={t(
            'Choose what feels most comfortable. Changes apply immediately.',
          )}
          title={t('Appearance')}
          variant="back"
        />

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{t('Theme')}</Text>
          <StatusBadge
            label={
              themeHasHydrated
                ? isPublicDemoEnabled
                  ? t('Temporary demo setting')
                  : t('Saved on this device')
                : t('Restoring preference')
            }
            tone={themeHasHydrated ? 'success' : 'neutral'}
          />
        </View>

        <Card padding="none" style={styles.optionsCard}>
          <View
            accessibilityLabel={t('Theme')}
            accessibilityRole="radiogroup"
          >
            {APPEARANCE_OPTIONS.map((option, index) => {
              const isSelected = preference === option.value;
              const label = getAppearanceLabel(option.value);
              const description = getAppearanceDescription(option.value);

              return (
                <View key={option.value}>
                  {index > 0 ? <View style={styles.separator} /> : null}
                  <Pressable
                    accessibilityHint={description}
                    accessibilityLabel={t('{label} appearance', {
                      label,
                    })}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: isSelected,
                      disabled: !themeHasHydrated,
                    }}
                    disabled={!themeHasHydrated}
                    onPress={() => setPreference(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                      !themeHasHydrated && styles.optionDisabled,
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
                        <Text style={styles.optionTitle}>{label}</Text>
                        {isSelected ? (
                          <Text style={styles.selectedText}>{t('Selected')}</Text>
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
              ? t(
                  'Following device appearance. Your device is currently using {mode} mode.',
                  { mode: systemModeLabel },
                )
              : t('{mode} appearance selected.', {
                  mode: selectedThemeLabel,
                })
          }
          padding="compact"
          tone={preference === 'system' ? 'accent' : 'default'}
        >
          <Text style={styles.statusTitle}>
            {preference === 'system'
              ? t('Following your device')
              : t('{mode} is selected', {
                  mode: selectedThemeLabel,
                })}
          </Text>
          <Text style={styles.statusDescription}>
            {preference === 'system'
              ? t(
                  'Your device is currently using {mode} mode. Parking Bitola will update automatically when that changes.',
                  { mode: systemModeLabel },
                )
              : t(
                  'Parking Bitola will keep this appearance until you choose another option. No restart is needed.',
                )}
          </Text>
        </Card>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{t('Language')}</Text>
          <StatusBadge
            label={
              languageHasHydrated
                ? isPublicDemoEnabled
                  ? t('Temporary demo setting')
                  : t('Saved on this device')
                : t('Restoring preference')
            }
            tone={languageHasHydrated ? 'success' : 'neutral'}
          />
        </View>

        <Card padding="none" style={styles.optionsCard}>
          <View
            accessibilityLabel={t('Language')}
            accessibilityRole="radiogroup"
          >
            {LANGUAGE_OPTIONS.map((option, index) => {
              const isSelected = languagePreference === option.value;
              const label = getLanguageLabel(option.value);
              const description = getLanguageDescription(option.value);

              return (
                <View key={option.value}>
                  {index > 0 ? <View style={styles.separator} /> : null}
                  <Pressable
                    accessibilityHint={description}
                    accessibilityLabel={t('{label} language', {
                      label,
                    })}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: isSelected,
                      disabled: !languageHasHydrated,
                    }}
                    disabled={!languageHasHydrated}
                    onPress={() => setLanguagePreference(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                      !languageHasHydrated && styles.optionDisabled,
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
                      {option.value === 'system' ? (
                        <AppIcon
                          color={
                            isSelected
                              ? theme.colors.accentText
                              : theme.colors.textSecondary
                          }
                          name="system"
                          size={21}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.languageCode,
                            isSelected && styles.languageCodeSelected,
                          ]}
                        >
                          {option.code}
                        </Text>
                      )}
                    </View>
                    <View style={styles.optionCopy}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>{label}</Text>
                        {isSelected ? (
                          <Text style={styles.selectedText}>{t('Selected')}</Text>
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
            languagePreference === 'system'
              ? `${t('Following device language')}. ${t(
                  'Your device language is currently {language}.',
                  { language: systemLanguageLabel },
                )}`
              : t('{language} is selected', {
                  language: selectedLanguageLabel,
                })
          }
          padding="compact"
          tone={languagePreference === 'system' ? 'accent' : 'default'}
        >
          <Text style={styles.statusTitle}>
            {languagePreference === 'system'
              ? t('Following your device language')
              : t('{language} is selected', {
                  language: selectedLanguageLabel,
                })}
          </Text>
          <Text style={styles.statusDescription}>
            {languagePreference === 'system'
              ? t('Your device language is currently {language}.', {
                  language: systemLanguageLabel,
                })
              : t(
                  'Parking Bitola will use {language} until you choose another language.',
                  { language: selectedLanguageLabel },
                )}
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
    languageCode: {
      ...theme.typography.overline,
      color: theme.colors.textSecondary,
    },
    languageCodeSelected: {
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
