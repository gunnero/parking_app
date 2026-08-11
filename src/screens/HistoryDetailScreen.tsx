import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  InfoRow,
  StatusBadge,
} from '../components';
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

export type HistoryDetailScreenProps = {
  onBack: () => void;
  protectedSessionId?: string;
  recordId: string;
};

function formatTrustedCost(record: ParkingHistoryRecord): string | null {
  const cost = getTrustedParkingHistoryFinalCost(record);

  if (!cost) {
    return null;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      currency: cost.currency,
      style: 'currency',
    }).format(cost.amount);
  } catch {
    return `${cost.amount.toLocaleString()} ${cost.currency}`;
  }
}

export function HistoryDetailScreen({
  onBack,
  protectedSessionId,
  recordId,
}: HistoryDetailScreenProps) {
  const record = useParkingHistoryStore(
    (state) => state.records.find((item) => item.id === recordId) ?? null,
  );
  const hasHydrated = useParkingHistoryStore((state) => state.hasHydrated);
  const hydrationError = useParkingHistoryStore(
    (state) => state.hydrationError,
  );
  const operationError = useParkingHistoryStore(
    (state) => state.operationError,
  );
  const isReadOnly = useParkingHistoryStore((state) => state.isReadOnly);
  const deleteRecord = useParkingHistoryStore((state) => state.deleteRecord);
  const clearOperationError = useParkingHistoryStore(
    (state) => state.clearOperationError,
  );
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(theme, isCompact),
    [isCompact, theme],
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = localError ?? operationError ?? hydrationError;
  const isProtected = Boolean(
    record && protectedSessionId === record.sessionId,
  );

  const confirmDeleteRecord = () => {
    if (!record || isProtected || isReadOnly || isDeleting) {
      return;
    }

    Alert.alert(
      'Delete parking record?',
      `${record.zoneCode} · ${record.plate} will be permanently removed from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete record',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              clearOperationError();
              setLocalError(null);
              setIsDeleting(true);

              try {
                const result = await deleteRecord(record.id);

                if (result.success) {
                  onBack();
                } else {
                  setLocalError(result.error);
                }
              } catch {
                setLocalError(
                  'This parking record could not be deleted. Please try again.',
                );
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  let body;

  if (!hasHydrated) {
    body = (
      <Card padding="spacious">
        <View accessibilityLiveRegion="polite" style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
          <Text style={styles.loadingTitle}>Restoring parking details</Text>
          <Text style={styles.loadingText}>
            Loading this completed session from your device.
          </Text>
        </View>
      </Card>
    );
  } else if (!record) {
    body = (
      <EmptyState
        actionLabel="Back to history"
        description="This completed session may have been deleted from this device."
        icon="info"
        onAction={onBack}
        title="Parking record not found"
      />
    );
  } else {
    const date = formatParkingDate(record.startedAt);
    const started = formatParkingTime(record.startedAt);
    const stopped = formatParkingTime(record.stoppedAt);
    const duration = formatParkingDuration(record.durationSeconds);
    const durationAccessible = formatParkingDurationAccessible(
      record.durationSeconds,
    );
    const finalCost = formatTrustedCost(record);

    body = (
      <>
        <Card elevated padding={isCompact ? 'regular' : 'spacious'}>
          <View style={styles.summaryStatusRow}>
            <StatusBadge
              icon={record.simulation ? 'development' : 'success'}
              label={record.simulation ? 'SIMULATED SESSION' : 'COMPLETED'}
              tone={record.simulation ? 'development' : 'success'}
            />
          </View>
          <Text style={styles.summaryLabel}>Zone</Text>
          <Text selectable style={styles.summaryZone}>
            {record.zoneCode}
          </Text>
          {record.zoneName ? (
            <Text style={styles.summaryZoneName}>{record.zoneName}</Text>
          ) : null}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryVehicleRow}>
            <View style={styles.summaryVehicleIcon}>
              <AppIcon
                color={theme.colors.accentText}
                name="car"
                size={22}
              />
            </View>
            <View style={styles.summaryVehicleCopy}>
              <Text style={styles.summaryLabel}>Vehicle</Text>
              <Text selectable style={styles.summaryPlate}>
                {record.plate}
              </Text>
              {record.vehicleNickname ? (
                <Text style={styles.summaryNickname}>
                  {record.vehicleNickname}
                </Text>
              ) : null}
            </View>
          </View>

          {record.simulation ? (
            <Text style={styles.simulationText}>
              Development record. No real parking SMS was opened or sent.
            </Text>
          ) : null}
        </Card>

        <View style={styles.sectionHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Session summary
          </Text>
        </View>

        <Card padding="none">
          <InfoRow icon="clock" label="Date" value={date} />
          <View style={styles.rowDivider} />
          <InfoRow icon="clock" label="Started" value={started} />
          <View style={styles.rowDivider} />
          <InfoRow icon="success" label="Stopped" value={stopped} />
          <View style={styles.rowDivider} />
          <InfoRow
            detail={durationAccessible}
            icon="timer"
            label="Duration"
            value={duration}
          />
          {finalCost ? (
            <>
              <View style={styles.rowDivider} />
              <InfoRow
                detail="Confirmed by the parking operator"
                icon="check"
                label="Final cost"
                tone="success"
                value={finalCost}
              />
            </>
          ) : null}
          <View style={styles.rowDivider} />
          <InfoRow
            detail={
              record.simulation
                ? 'Clearly separated from a real operator-confirmed session.'
                : undefined
            }
            icon={record.simulation ? 'development' : 'parking'}
            label="Session type"
            tone={record.simulation ? 'development' : 'neutral'}
            value={
              record.simulation
                ? 'Simulated development session'
                : 'Parking session'
            }
          />
        </Card>

        <Card
          accessibilityLabel={
            record.startLocation
              ? 'Parked location saved. Only the start location snapshot is stored. No route history is kept.'
              : 'No parked location saved for this session.'
          }
          padding="regular"
          tone={record.startLocation ? 'success' : 'default'}
        >
          <View style={styles.locationRow}>
            <View
              style={[
                styles.locationIcon,
                record.startLocation
                  ? styles.locationIconSaved
                  : styles.locationIconMissing,
              ]}
            >
              <AppIcon
                color={
                  record.startLocation
                    ? theme.colors.successText
                    : theme.colors.textMuted
                }
                name={record.startLocation ? 'location' : 'location-off'}
                size={22}
              />
            </View>
            <View style={styles.locationCopy}>
              <Text
                style={
                  record.startLocation
                    ? styles.locationTitleSaved
                    : styles.locationTitle
                }
              >
                {record.startLocation
                  ? 'Parked location saved'
                  : 'No parked location saved'}
              </Text>
              <Text style={styles.locationText}>
                {record.startLocation
                  ? 'Only the parked start location is stored. No route history is kept.'
                  : 'This completed session does not include a start-location snapshot.'}
              </Text>
            </View>
          </View>
        </Card>

        {isProtected || isReadOnly ? (
          <Card padding="compact" tone="warning">
            <Text style={styles.protectedTitle}>
              {isProtected ? 'Current receipt protected' : 'History is read-only'}
            </Text>
            <Text style={styles.protectedText}>
              {isProtected
                ? 'Finish this parking receipt with Done before deleting its history record.'
                : 'This record was left unchanged because parking history could not be loaded safely.'}
            </Text>
          </Card>
        ) : (
          <View style={styles.deleteSection}>
            <AppButton
              accessibilityHint="Permanently removes this completed parking record from this device after confirmation."
              label="Delete record"
              leadingIcon="delete"
              loading={isDeleting}
              onPress={confirmDeleteRecord}
              variant="danger"
            />
          </View>
        )}

        <Text style={styles.privacyNote}>
          This receipt is stored locally on this device.
        </Text>
      </>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.content}>
        <AppHeader
          backLabel="History"
          onBack={onBack}
          subtitle="Completed parking session summary."
          title="Parking details"
          variant="back"
        />

        {visibleError ? (
          <View accessibilityLiveRegion="assertive">
            <Card padding="compact" tone="danger">
              <Text accessibilityRole="alert" style={styles.errorTitle}>
                History needs attention
              </Text>
              <Text style={styles.errorText}>{visibleError}</Text>
            </Card>
          </View>
        ) : null}

        {body}
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
    summaryStatusRow: {
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    summaryLabel: {
      ...theme.typography.overline,
      color: theme.colors.textMuted,
    },
    summaryZone: {
      ...theme.typography.display,
      color: theme.colors.accentText,
      flexShrink: 1,
      marginTop: theme.spacing.xxs,
    },
    summaryZoneName: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    summaryDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginVertical: theme.spacing.lg,
    },
    summaryVehicleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    summaryVehicleIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSurface,
      borderRadius: theme.radii.md,
      height: theme.touchTargets.comfortable,
      justifyContent: 'center',
      width: theme.touchTargets.comfortable,
    },
    summaryVehicleCopy: {
      flex: 1,
      minWidth: 0,
    },
    summaryPlate: {
      ...theme.typography.title,
      color: theme.colors.text,
      flexShrink: 1,
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.8,
      marginTop: theme.spacing.xxs,
    },
    summaryNickname: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      flexShrink: 1,
      marginTop: theme.spacing.xxs,
    },
    simulationText: {
      ...theme.typography.caption,
      color: theme.colors.developmentText,
      marginTop: theme.spacing.md,
    },
    sectionHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    rowDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginHorizontal: theme.spacing.md,
    },
    locationRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    locationIcon: {
      alignItems: 'center',
      borderRadius: theme.radii.md,
      height: theme.touchTargets.minimum,
      justifyContent: 'center',
      width: theme.touchTargets.minimum,
    },
    locationIconSaved: {
      backgroundColor: theme.colors.successSurface,
    },
    locationIconMissing: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    locationCopy: {
      flex: 1,
      minWidth: 0,
    },
    locationTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
    },
    locationTitleSaved: {
      ...theme.typography.bodyMedium,
      color: theme.colors.successText,
    },
    locationText: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    protectedTitle: {
      ...theme.typography.label,
      color: theme.colors.warningText,
    },
    protectedText: {
      ...theme.typography.caption,
      color: theme.colors.warningText,
      marginTop: theme.spacing.xxs,
    },
    deleteSection: {
      marginTop: theme.spacing.xxs,
    },
    privacyNote: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });
}
