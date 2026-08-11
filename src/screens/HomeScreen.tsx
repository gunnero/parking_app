import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AppButton,
  AppHeader,
  AppIcon,
  Card,
  InfoRow,
  PermissionCard,
  StatusBadge,
} from '../components';
import { TEST_PARKING_ZONES } from '../data/testParkingZones';
import {
  runStartParkingSmsFlow,
  type ParkingSessionSmsFlowResult,
} from '../services/parkingSessionSmsFlow';
import { useLocationStore } from '../stores/locationStore';
import { useParkingReminderStore } from '../stores/parkingReminderStore';
import { useParkingSessionStore } from '../stores/parkingSessionStore';
import {
  selectDefaultVehicle,
  useVehicleStore,
} from '../stores/vehicleStore';
import { useAppTheme, type AppTheme } from '../theme';
import { buildStartParkingMessage } from '../utils/parkingSms';
import { detectParkingZone } from '../utils/zoneDetection';

type HomeScreenProps = {
  onManageVehicles: () => void;
  onOpenAppearance: () => void;
};

export function HomeScreen({
  onManageVehicles,
  onOpenAppearance,
}: HomeScreenProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const shouldStackStatus = width < 360;
  const styles = useMemo(
    () => createStyles(theme, isCompact),
    [isCompact, theme],
  );
  const defaultVehicle = useVehicleStore(selectDefaultVehicle);
  const hasHydrated = useVehicleStore((state) => state.hasHydrated);
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);
  const accuracy = useLocationStore((state) => state.accuracy);
  const isLoading = useLocationStore((state) => state.isLoading);
  const permissionState = useLocationStore((state) => state.permissionState);
  const locationError = useLocationStore((state) => state.error);
  const refreshLocation = useLocationStore((state) => state.refreshLocation);
  const prepareSession = useParkingSessionStore(
    (state) => state.prepareSession,
  );
  const markStartRequestPrepared = useParkingSessionStore(
    (state) => state.markStartRequestPrepared,
  );
  const setOperationError = useParkingSessionStore(
    (state) => state.setOperationError,
  );
  const clearOperationError = useParkingSessionStore(
    (state) => state.clearOperationError,
  );
  const isStarting = useParkingSessionStore(
    (state) => state.smsFlowInFlight,
  );
  const beginSmsFlow = useParkingSessionStore(
    (state) => state.beginSmsFlow,
  );
  const finishSmsFlow = useParkingSessionStore(
    (state) => state.finishSmsFlow,
  );
  const reminderEnabled = useParkingReminderStore((state) => state.enabled);
  const reminderHasHydrated = useParkingReminderStore(
    (state) => state.hasHydrated,
  );
  const [startError, setStartError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const hasCoordinates = latitude !== null && longitude !== null;
  const detectedZone = useMemo(
    () =>
      hasCoordinates
        ? detectParkingZone(latitude, longitude, TEST_PARKING_ZONES)
        : null,
    [hasCoordinates, latitude, longitude],
  );

  const isRequestingPermission = permissionState === 'requesting';
  const isPermissionDenied = permissionState === 'denied';
  const isRefreshing = isRequestingPermission || isLoading;

  let gpsValue = 'Not checked';
  let gpsDetail = 'Use your location when you are ready.';
  let gpsTone:
    | 'neutral'
    | 'accent'
    | 'success'
    | 'warning'
    | 'danger' = 'neutral';

  if (isRequestingPermission) {
    gpsValue = 'Requesting access';
    gpsDetail = 'Choose whether to share your foreground location.';
    gpsTone = 'warning';
  } else if (isPermissionDenied) {
    gpsValue = 'Location access off';
    gpsDetail = 'Open Settings to allow foreground location.';
    gpsTone = 'danger';
  } else if (isLoading) {
    gpsValue = 'Finding location';
    gpsDetail = 'This can take a moment outdoors or near a window.';
    gpsTone = 'warning';
  } else if (locationError) {
    gpsValue = 'GPS unavailable';
    gpsDetail =
      locationError.code === 'LOCATION_SERVICES_DISABLED'
        ? 'Turn on Location Services, then try again.'
        : 'We could not get a current location. Try again.';
    gpsTone = 'danger';
  } else if (hasCoordinates) {
    gpsValue = 'GPS ready';
    gpsDetail =
      accuracy === null
        ? 'Current location is available.'
        : `Accurate to about ${Math.max(1, Math.round(accuracy))} m.`;
    gpsTone = 'success';
  }

  const reminderValue = !reminderHasHydrated
    ? 'Checking'
    : reminderEnabled
      ? 'On for sessions'
      : 'Off';
  const reminderTone = !reminderHasHydrated
    ? 'neutral'
    : reminderEnabled
      ? 'success'
      : 'neutral';

  const handleRefreshLocation = () => {
    setSettingsError(null);
    void refreshLocation();
  };

  const handleOpenSettings = async () => {
    setSettingsError(null);

    try {
      await Linking.openSettings();
    } catch {
      setSettingsError(
        'Device settings could not be opened. Open Settings manually and allow foreground location.',
      );
    }
  };

  const smsPreview = useMemo(() => {
    if (!detectedZone || !defaultVehicle) {
      return null;
    }

    try {
      return buildStartParkingMessage(
        detectedZone.code,
        defaultVehicle.plate,
      );
    } catch {
      return null;
    }
  }, [defaultVehicle, detectedZone]);

  const canPrepareSession =
    hasHydrated &&
    Boolean(defaultVehicle) &&
    Boolean(detectedZone) &&
    Boolean(smsPreview);

  const startFlowError = (result: ParkingSessionSmsFlowResult): string => {
    if ('reason' in result) {
      return result.reason;
    }

    return result.outcome === 'cancelled'
      ? 'The SMS composer was cancelled. No parking start request was prepared.'
      : 'The parking start request could not be prepared.';
  };

  const handleStartParking = async () => {
    setStartError(null);

    if (!hasHydrated) {
      setStartError('Saved vehicles are still loading. Please try again.');
      return;
    }

    if (!defaultVehicle) {
      setStartError('Add or select a default vehicle before parking.');
      return;
    }

    if (!detectedZone) {
      setStartError('A supported parking zone has not been identified.');
      return;
    }

    if (!smsPreview) {
      setStartError('The parking request preview is invalid.');
      return;
    }

    if (!beginSmsFlow()) {
      return;
    }

    clearOperationError();

    try {
      const result = prepareSession({
        zone: detectedZone,
        vehicle: defaultVehicle,
        startLocation: hasCoordinates
          ? { latitude, longitude, accuracy }
          : null,
        explicitUserAction: true,
      });

      if (!result.success) {
        setStartError(result.error);
        return;
      }

      if (!result.session) {
        setStartError('The parking session could not be prepared.');
        return;
      }

      const flowResult = await runStartParkingSmsFlow(result.session, true);

      if (flowResult.requestResult === null) {
        setOperationError(startFlowError(flowResult));
        return;
      }

      const transition = markStartRequestPrepared(flowResult.requestResult);

      if (!transition.success) {
        setOperationError(transition.error);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'The parking start request could not be prepared.';

      if (useParkingSessionStore.getState().session) {
        setOperationError(message);
      } else {
        setStartError(message);
      }
    } finally {
      finishSmsFlow();
    }
  };

  let startUnavailable: string | null = null;

  if (!hasHydrated) {
    startUnavailable = 'Loading your saved vehicle…';
  } else if (!defaultVehicle) {
    startUnavailable = 'Add or select a default vehicle before parking.';
  } else if (!detectedZone) {
    startUnavailable = hasCoordinates
      ? 'Parking cannot start until a supported zone is identified.'
      : 'Use your location to identify a supported parking zone.';
  } else if (!smsPreview) {
    startUnavailable = 'The parking request preview is unavailable.';
  }

  return (
    <ScrollView
      accessibilityLabel="Parking home"
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.content,
          isCompact && styles.contentCompact,
        ]}
      >
        <AppHeader
          appearanceLabel={isCompact ? 'Theme' : 'Appearance'}
          onAppearance={onOpenAppearance}
          title="Parking Bitola"
          variant="appearance"
        />

        <Card elevated padding="spacious">
          <View accessibilityLiveRegion="polite" style={styles.zoneHero}>
            {detectedZone ? (
              <>
                <View style={styles.zoneBadgeWrap}>
                  <StatusBadge
                    icon="development"
                    label="DEVELOPMENT MODE"
                    tone="development"
                  />
                </View>
                <Text
                  accessibilityRole="header"
                  style={styles.zoneTitle}
                >
                  Simulated zone
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.68}
                  numberOfLines={1}
                  selectable
                  style={styles.zoneCode}
                >
                  {detectedZone.code}
                </Text>
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={styles.zoneDivider}
                >
                  <View style={styles.zoneRule} />
                  <View style={styles.zoneParkingMark}>
                    <AppIcon
                      color={theme.colors.developmentText}
                      name="parking"
                      size={24}
                    />
                  </View>
                  <View style={styles.zoneRule} />
                </View>
                <Text style={styles.zoneDescription}>
                  You are in a simulated zone. No real parking request will be
                  sent to an operator.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.zoneBadgeWrap}>
                  <StatusBadge
                    icon={hasCoordinates ? 'location-off' : 'location'}
                    label="CURRENT PARKING ZONE"
                    tone={locationError ? 'warning' : 'neutral'}
                  />
                </View>
                {isRefreshing ? (
                  <ActivityIndicator
                    accessibilityLabel="Finding parking zone"
                    color={theme.colors.accent}
                    size="large"
                  />
                ) : null}
                <Text
                  accessibilityRole="header"
                  style={styles.zoneEmptyTitle}
                >
                  {isRefreshing
                    ? 'Finding your parking zone'
                    : hasCoordinates
                      ? 'Parking zone not identified'
                      : isPermissionDenied
                        ? 'Location access needed'
                        : locationError
                          ? 'Location unavailable'
                          : 'Find your parking zone'}
                </Text>
                <Text style={styles.zoneDescription}>
                  {isRefreshing
                    ? 'Getting a current foreground location. This can take a moment.'
                    : hasCoordinates
                      ? 'We know your location, but verified parking-zone mapping is not available here yet.'
                      : isPermissionDenied
                        ? 'Allow foreground location in Settings so the app can identify your parking zone.'
                        : locationError
                          ? 'Check Location Services and try again when you are ready.'
                          : 'Your foreground location is used only when you choose to identify a parking zone.'}
                </Text>
                {hasCoordinates && !isRefreshing ? (
                  <AppButton
                    compact
                    fullWidth={false}
                    label="Refresh location"
                    leadingIcon="refresh"
                    onPress={handleRefreshLocation}
                    variant="secondary"
                  />
                ) : null}
              </>
            )}
          </View>
        </Card>

        {!hasCoordinates && !isLoading ? (
          isRequestingPermission ? (
            <PermissionCard
              description="Choose whether to share your foreground location so we can identify your parking zone."
              loading
              state="requesting"
              title="Location access"
            />
          ) : isPermissionDenied ? (
            <PermissionCard
              actionLabel="Open Settings"
              description="Enable foreground location for Parking Bitola, then return and refresh your location."
              onAction={() => void handleOpenSettings()}
              state="denied"
              title="Location access is off"
            />
          ) : locationError ? (
            <PermissionCard
              actionLabel="Try again"
              description={
                locationError.code === 'LOCATION_SERVICES_DISABLED'
                  ? 'Turn on Location Services to identify your parking zone.'
                  : 'Your current location could not be read. Check your signal and try again.'
              }
              onAction={handleRefreshLocation}
              state={
                locationError.code === 'LOCATION_SERVICES_DISABLED'
                  ? 'unavailable'
                  : 'error'
              }
              title={
                locationError.code === 'LOCATION_SERVICES_DISABLED'
                  ? 'Location Services are off'
                  : 'Location is unavailable'
              }
            />
          ) : (
            <PermissionCard
              actionLabel="Use my location"
              description="Location is used to identify your parking zone. Permission is requested only after you continue."
              onAction={handleRefreshLocation}
              state="idle"
              title="Find your parking zone"
            />
          )
        ) : null}

        {settingsError ? (
          <Card padding="compact" tone="danger">
            <Text accessibilityRole="alert" style={styles.errorText}>
              {settingsError}
            </Text>
          </Card>
        ) : null}

        <Card elevated>
          <View
            accessibilityLabel={
              hasHydrated
                ? defaultVehicle
                  ? `Current vehicle ${defaultVehicle.plate}${defaultVehicle.nickname ? `, ${defaultVehicle.nickname}` : ''}. Default vehicle.`
                  : 'No default vehicle selected.'
                : 'Loading current vehicle.'
            }
            accessible
            style={styles.vehicleRow}
          >
            <View style={styles.vehicleIcon}>
              <AppIcon color={theme.colors.accentText} name="car" size={28} />
            </View>
            <View style={styles.vehicleCopy}>
              <Text style={styles.overline}>Current vehicle</Text>
              <Text selectable style={styles.vehiclePlate}>
                {hasHydrated
                  ? defaultVehicle?.plate ?? 'No vehicle selected'
                  : 'Loading vehicle…'}
              </Text>
              <Text style={styles.vehicleNickname}>
                {!hasHydrated
                  ? 'Reading saved vehicle data.'
                  : defaultVehicle?.nickname ??
                    (defaultVehicle
                      ? 'Ready for parking'
                      : 'Add a vehicle to continue.')}
              </Text>
            </View>
            {hasHydrated && defaultVehicle ? (
              <View style={styles.vehicleBadge}>
                <StatusBadge label="DEFAULT" tone="accent" />
              </View>
            ) : null}
          </View>
        </Card>

        <Card padding="none">
          <View
            style={[
              styles.statusGrid,
              shouldStackStatus && styles.statusGridCompact,
            ]}
          >
            <View style={styles.statusBlock}>
              <View style={styles.statusHeading}>
                <AppIcon
                  color={theme.colors.accentText}
                  name="navigation"
                  size={20}
                />
                <Text style={styles.statusLabel}>GPS status</Text>
              </View>
              <StatusBadge label={gpsValue} tone={gpsTone} />
              <Text style={styles.statusDetail}>{gpsDetail}</Text>
            </View>
            <View
              style={[
                styles.statusDivider,
                shouldStackStatus && styles.statusDividerCompact,
              ]}
            />
            <View style={styles.statusBlock}>
              <View style={styles.statusHeading}>
                <AppIcon
                  color={theme.colors.accentText}
                  name="notification-active"
                  size={20}
                />
                <Text style={styles.statusLabel}>Parking reminder</Text>
              </View>
              <StatusBadge label={reminderValue} tone={reminderTone} />
              <Text style={styles.statusDetail}>
                {reminderHasHydrated
                  ? reminderEnabled
                    ? 'Enabled for active parking sessions.'
                    : 'Disabled in reminder settings.'
                  : 'Reading your saved preference.'}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.primaryAction}>
          <AppButton
            accessibilityHint="Prepares a simulated parking session for the detected development zone"
            disabled={!canPrepareSession}
            label="START PARKING"
            leadingIcon="parking"
            loading={isStarting}
            onPress={() => void handleStartParking()}
          />

          {startUnavailable ? (
            <Text style={styles.startUnavailable}>{startUnavailable}</Text>
          ) : null}

          {startError ? (
            <Card padding="compact" tone="danger">
              <Text accessibilityRole="alert" style={styles.errorText}>
                {startError}
              </Text>
            </Card>
          ) : null}

          {detectedZone ? (
            <View style={styles.simulationNote}>
              <AppIcon
                color={theme.colors.developmentText}
                name="shield"
                size={19}
              />
              <Text style={styles.simulationText}>
                Simulation only · TEST zones never open or send a real SMS.
              </Text>
            </View>
          ) : null}

          {detectedZone && defaultVehicle && smsPreview ? (
            <Card padding="compact" tone="development">
              <InfoRow
                detail="Generated for the simulated parking-session flow."
                icon="sms"
                label="SMS preview"
                tone="development"
                value={smsPreview}
              />
            </Card>
          ) : null}
        </View>

        <View style={styles.actions}>
          {!hasCoordinates || detectedZone ? (
            <AppButton
              accessibilityHint="Requests foreground permission if needed and reads the current GPS position"
              compact
              label="Refresh location"
              leadingIcon="refresh"
              loading={isRefreshing}
              onPress={handleRefreshLocation}
              variant="secondary"
            />
          ) : null}
          <AppButton
            accessibilityHint="Opens the local vehicle list"
            compact
            label="Manage vehicles"
            leadingIcon="car"
            onPress={onManageVehicles}
            variant="ghost"
          />
        </View>

        <Text style={styles.dataNotice}>
          TEST-A1 and TEST-A2 use synthetic development boundaries. They are
          not verified or official Bitola parking zones.
        </Text>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme, isCompact: boolean) {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      alignSelf: 'center',
      gap: theme.spacing.xl,
      maxWidth: theme.layout.maxContentWidth,
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.layout.screenPadding,
      paddingTop: theme.spacing.md,
      width: '100%',
    },
    contentCompact: {
      paddingHorizontal: theme.layout.compactScreenPadding,
    },
    zoneHero: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    zoneBadgeWrap: {
      alignItems: 'center',
      width: '100%',
    },
    zoneTitle: {
      ...theme.typography.title,
      color: theme.colors.text,
      marginTop: theme.spacing.xxs,
      textAlign: 'center',
    },
    zoneCode: {
      ...theme.typography.number,
      color: theme.colors.developmentText,
      fontSize: isCompact ? 56 : 64,
      lineHeight: isCompact ? 64 : 72,
      textAlign: 'center',
      width: '100%',
    },
    zoneEmptyTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.text,
      textAlign: 'center',
    },
    zoneDescription: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      maxWidth: '92%',
      textAlign: 'center',
    },
    zoneDivider: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      maxWidth: '88%',
      width: '100%',
    },
    zoneRule: {
      backgroundColor: theme.colors.development,
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
    zoneParkingMark: {
      alignItems: 'center',
      borderColor: theme.colors.development,
      borderRadius: theme.radii.full,
      borderWidth: 1,
      height: theme.touchTargets.minimum,
      justifyContent: 'center',
      width: theme.touchTargets.minimum,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.dangerText,
    },
    vehicleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    vehicleIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSurface,
      borderRadius: theme.radii.md,
      height: theme.touchTargets.primary,
      justifyContent: 'center',
      width: theme.touchTargets.primary,
    },
    vehicleCopy: {
      flex: 1,
      minWidth: 128,
    },
    overline: {
      ...theme.typography.overline,
      color: theme.colors.textMuted,
    },
    vehiclePlate: {
      ...theme.typography.title,
      color: theme.colors.text,
      marginTop: theme.spacing.xxs,
    },
    vehicleNickname: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    vehicleBadge: {
      flexShrink: 1,
    },
    statusGrid: {
      flexDirection: 'row',
      minWidth: 0,
    },
    statusGridCompact: {
      flexDirection: 'column',
    },
    statusBlock: {
      flex: 1,
      gap: theme.spacing.xs,
      minWidth: 0,
      padding: theme.spacing.md,
    },
    statusHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    statusLabel: {
      ...theme.typography.label,
      color: theme.colors.text,
      flex: 1,
    },
    statusDetail: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    statusDivider: {
      alignSelf: 'stretch',
      backgroundColor: theme.colors.border,
      width: StyleSheet.hairlineWidth,
    },
    statusDividerCompact: {
      height: StyleSheet.hairlineWidth,
      width: '100%',
    },
    primaryAction: {
      gap: theme.spacing.sm,
    },
    startUnavailable: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      paddingHorizontal: theme.spacing.sm,
      textAlign: 'center',
    },
    simulationNote: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.xs,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    simulationText: {
      ...theme.typography.caption,
      color: theme.colors.developmentText,
      flexShrink: 1,
      textAlign: 'center',
    },
    actions: {
      gap: theme.spacing.xs,
    },
    dataNotice: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      paddingHorizontal: theme.spacing.md,
      textAlign: 'center',
    },
  });
}
