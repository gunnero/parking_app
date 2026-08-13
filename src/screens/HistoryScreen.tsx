import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  AppButton,
  AppHeader,
  AppIcon,
  Card,
  EmptyState,
  StatusBadge,
} from '../components';
import { isPublicDemoEnabled } from '../demo';
import { useLocalization } from '../localization';
import { requestConfirmation } from '../services/confirmationService';
import { useParkingHistoryStore } from '../stores/parkingHistoryStore';
import { type AppTheme, useAppTheme } from '../theme';
import type { ParkingHistoryRecord } from '../types/parkingHistory';
import {
  formatParkingDate,
  formatParkingDuration,
  formatParkingDurationAccessible,
  formatParkingTime,
} from '../utils/dateTime';
import { getTrustedParkingHistoryFinalCost } from '../utils/parkingHistory';

export type HistoryScreenProps = {
  onBack: () => void;
  onSelectRecord: (recordId: string) => void;
  protectedSessionId?: string;
};

function formatTrustedCost(
  record: ParkingHistoryRecord,
  locale: string,
): string | null {
  const cost = getTrustedParkingHistoryFinalCost(record);

  if (!cost) {
    return null;
  }

  try {
    return new Intl.NumberFormat(locale, {
      currency: cost.currency,
      style: 'currency',
    }).format(cost.amount);
  } catch {
    return `${cost.amount.toLocaleString(locale)} ${cost.currency}`;
  }
}

function HistoryRecordCard({
  isCompact,
  onPress,
  record,
  styles,
  t,
  theme,
  locale,
}: {
  isCompact: boolean;
  onPress: () => void;
  record: ParkingHistoryRecord;
  styles: HistoryStyles;
  t: ReturnType<typeof useLocalization>['t'];
  theme: AppTheme;
  locale: string;
}) {
  const date = formatParkingDate(record.startedAt, locale);
  const started = formatParkingTime(record.startedAt, locale);
  const stopped = formatParkingTime(record.stoppedAt, locale);
  const duration = formatParkingDuration(record.durationSeconds, locale);
  const durationAccessible = formatParkingDurationAccessible(
    record.durationSeconds,
    locale,
  );
  const finalCost = formatTrustedCost(record, locale);
  const accessibilityLabel = [
    record.simulation
      ? t('Simulated parking session')
      : t('Completed parking session'),
    t('Zone {code}', { code: record.zoneCode }),
    record.zoneName ? t(record.zoneName) : null,
    t('Vehicle {plate}', { plate: record.plate }),
    record.vehicleNickname,
    date,
    t('Started {time}', { time: started }),
    t('Stopped {time}', { time: stopped }),
    durationAccessible,
    finalCost ? t('Final cost {cost}', { cost: finalCost }) : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityHint={t('Opens the completed parking session details.')}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.recordPressable,
        pressed ? styles.recordPressed : null,
      ]}
    >
      <Card
        elevated
        padding={isCompact ? 'compact' : 'regular'}
        style={styles.recordCard}
      >
        <View style={styles.recordHeader}>
          <View style={styles.zoneIdentity}>
            <Text style={styles.overline}>{t('Zone')}</Text>
            <Text selectable style={styles.zoneCode}>
              {record.zoneCode}
            </Text>
            {record.zoneName ? (
              <Text style={styles.zoneName}>{t(record.zoneName)}</Text>
            ) : null}
          </View>
          {record.simulation ? (
            <StatusBadge
              icon="development"
              label={t('SIMULATED SESSION')}
              tone="development"
            />
          ) : null}
        </View>

        <View style={styles.vehicleRow}>
          <View style={styles.vehicleIcon}>
            <AppIcon
              color={theme.colors.accentText}
              name="car"
              size={20}
            />
          </View>
          <View style={styles.vehicleCopy}>
            <Text selectable style={styles.plate}>
              {record.plate}
            </Text>
            {record.vehicleNickname ? (
              <Text style={styles.nickname}>{record.vehicleNickname}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.recordDivider} />

        <View style={styles.dateDurationRow}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.time}>
            {started} → {stopped}
          </Text>
          <AppIcon
            color={theme.colors.textMuted}
            name="chevron-right"
            size={20}
          />
        </View>

        {finalCost ? (
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('Final cost')}</Text>
            <Text style={styles.costValue}>{finalCost}</Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

type HistoryStyles = ReturnType<typeof createStyles>;

export function HistoryScreen({
  onBack,
  onSelectRecord,
  protectedSessionId,
}: HistoryScreenProps) {
  const records = useParkingHistoryStore((state) => state.records);
  const hasHydrated = useParkingHistoryStore((state) => state.hasHydrated);
  const hydrationError = useParkingHistoryStore(
    (state) => state.hydrationError,
  );
  const operationError = useParkingHistoryStore(
    (state) => state.operationError,
  );
  const isReadOnly = useParkingHistoryStore((state) => state.isReadOnly);
  const clearHistory = useParkingHistoryStore((state) => state.clearHistory);
  const clearOperationError = useParkingHistoryStore(
    (state) => state.clearOperationError,
  );
  const { locale, t, translateMessage } = useLocalization();
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(theme, isCompact),
    [isCompact, theme],
  );
  const [isClearing, setIsClearing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const hasProtectedRecord = Boolean(protectedSessionId);
  const visibleError = localError ?? operationError ?? hydrationError;

  const confirmClearHistory = () => {
    if (hasProtectedRecord || isReadOnly || isClearing) {
      return;
    }

    requestConfirmation({
      title: t('Clear parking history?'),
      message: t(
        'Every completed parking record will be permanently removed from this device. This cannot be undone.',
      ),
      cancelLabel: t('Cancel'),
      confirmLabel: t('Clear history'),
      destructive: true,
      onConfirm: () => {
        void (async () => {
          clearOperationError();
          setLocalError(null);
          setIsClearing(true);

          try {
            const result = await clearHistory();

            if (!result.success) {
              setLocalError(result.error);
            }
          } catch {
            setLocalError(
              'Parking history could not be cleared. Please try again.',
            );
          } finally {
            setIsClearing(false);
          }
        })();
      },
    });
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
          subtitle={
            isPublicDemoEnabled
              ? t('Temporary demo history · Resets on reload')
              : t('Completed sessions saved only on this device.')
          }
          title={t('Parking history')}
          variant="back"
        />

        {visibleError ? (
          <View accessibilityLiveRegion="assertive">
            <Card padding="compact" tone="danger">
              <Text accessibilityRole="alert" style={styles.errorTitle}>
                {t('History needs attention')}
              </Text>
              <Text style={styles.errorText}>
                {translateMessage(visibleError)}
              </Text>
            </Card>
          </View>
        ) : null}

        {!hasHydrated ? (
          <Card padding="spacious">
            <View
              accessibilityLiveRegion="polite"
              style={styles.loadingState}
            >
              <ActivityIndicator color={theme.colors.accent} size="large" />
              <Text style={styles.loadingTitle}>
                {t('Restoring parking history')}
              </Text>
              <Text style={styles.loadingText}>
                {t('Loading completed sessions from this device.')}
              </Text>
            </View>
          </Card>
        ) : records.length === 0 ? (
          <EmptyState
            description={t('Completed parking sessions will appear here.')}
            icon="clock"
            title={t('No parking history yet')}
          />
        ) : (
          <>
            <View style={styles.listHeading}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {t('Completed sessions')}
              </Text>
              <StatusBadge
                label={t(
                  records.length === 1 ? '{count} session' : '{count} sessions',
                  { count: records.length },
                )}
                tone="neutral"
              />
            </View>

            <View style={styles.recordList}>
              {records.map((record) => (
                <HistoryRecordCard
                  isCompact={isCompact}
                  key={record.id}
                  onPress={() => onSelectRecord(record.id)}
                  record={record}
                  styles={styles}
                  t={t}
                  theme={theme}
                  locale={locale}
                />
              ))}
            </View>

            <View style={styles.clearSection}>
              {hasProtectedRecord || isReadOnly ? (
                <Text style={styles.protectedText}>
                  {hasProtectedRecord
                    ? t(
                        'Finish the current parking receipt before clearing history.',
                      )
                    : t(
                        'History is read-only, so stored records were left unchanged.',
                      )}
                </Text>
              ) : null}
              <AppButton
                accessibilityHint={t(
                  'Permanently removes every completed parking record from this device after confirmation.',
                )}
                disabled={hasProtectedRecord || isReadOnly}
                label={t('Clear history')}
                leadingIcon="delete"
                loading={isClearing}
                onPress={confirmClearHistory}
                variant="danger"
              />
            </View>

            <Text style={styles.privacyNote}>
              {isPublicDemoEnabled
                ? t('Temporary demo history · Resets when this page reloads.')
                : t(
                    'Parking history stays on this device until you delete it.',
                  )}
            </Text>
          </>
        )}
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
    errorTitle: {
      ...theme.typography.label,
      color: theme.colors.dangerText,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.dangerText,
      marginTop: theme.spacing.xxs,
    },
    loadingState: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    loadingTitle: {
      ...theme.typography.heading,
      color: theme.colors.text,
      marginTop: theme.spacing.xxs,
      textAlign: 'center',
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    listHeading: {
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
    recordList: {
      gap: theme.spacing.sm,
    },
    recordPressable: {
      borderRadius: theme.radii.lg,
      minHeight: theme.touchTargets.minimum,
    },
    recordPressed: {
      opacity: 0.78,
    },
    recordCard: {
      overflow: 'hidden',
    },
    recordHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    zoneIdentity: {
      flex: 1,
      minWidth: 128,
    },
    overline: {
      ...theme.typography.overline,
      color: theme.colors.textMuted,
    },
    zoneCode: {
      ...theme.typography.titleLarge,
      color: theme.colors.accentText,
      flexShrink: 1,
      marginTop: theme.spacing.xxs,
    },
    zoneName: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    vehicleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      minWidth: 0,
    },
    vehicleIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSurface,
      borderRadius: theme.radii.md,
      height: theme.touchTargets.minimum,
      justifyContent: 'center',
      width: theme.touchTargets.minimum,
    },
    vehicleCopy: {
      flex: 1,
      minWidth: 0,
    },
    plate: {
      ...theme.typography.heading,
      color: theme.colors.text,
      flexShrink: 1,
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.7,
    },
    nickname: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      flexShrink: 1,
      marginTop: theme.spacing.xxs,
    },
    recordDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginVertical: theme.spacing.md,
    },
    dateDurationRow: {
      alignItems: 'baseline',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      justifyContent: 'space-between',
    },
    date: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
      flexShrink: 1,
    },
    duration: {
      ...theme.typography.bodyMedium,
      color: theme.colors.accentText,
      flexShrink: 0,
      fontVariant: ['tabular-nums'],
    },
    timeRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.xs,
      justifyContent: 'space-between',
      marginTop: theme.spacing.xs,
    },
    time: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      flex: 1,
      fontVariant: ['tabular-nums'],
      minWidth: 0,
    },
    costRow: {
      alignItems: 'center',
      backgroundColor: theme.colors.successSurface,
      borderRadius: theme.radii.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      justifyContent: 'space-between',
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    costLabel: {
      ...theme.typography.caption,
      color: theme.colors.successText,
    },
    costValue: {
      ...theme.typography.bodyMedium,
      color: theme.colors.successText,
      fontVariant: ['tabular-nums'],
    },
    clearSection: {
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    protectedText: {
      ...theme.typography.caption,
      color: theme.colors.warningText,
      textAlign: 'center',
    },
    privacyNote: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });
}
