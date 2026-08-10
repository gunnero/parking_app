import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, InfoCard } from '../components';
import { TEST_PARKING_ZONES } from '../data/testParkingZones';
import {
  runStartParkingSmsFlow,
  type ParkingSessionSmsFlowResult,
} from '../services/parkingSessionSmsFlow';
import { useLocationStore } from '../stores/locationStore';
import { useParkingSessionStore } from '../stores/parkingSessionStore';
import {
  selectDefaultVehicle,
  useVehicleStore,
} from '../stores/vehicleStore';
import { buildStartParkingMessage } from '../utils/parkingSms';
import { detectParkingZone } from '../utils/zoneDetection';

type HomeScreenProps = {
  onManageVehicles: () => void;
};

export function HomeScreen({ onManageVehicles }: HomeScreenProps) {
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
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

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

  let gpsValue = 'Waiting to request location';
  let gpsDetail = 'Only foreground location is used.';
  let gpsTone: 'neutral' | 'warning' | 'error' = 'neutral';

  if (isRequestingPermission) {
    gpsValue = 'Requesting permission…';
    gpsDetail = 'Respond to the location prompt to continue.';
    gpsTone = 'warning';
  } else if (isPermissionDenied) {
    gpsValue = 'Permission denied';
    gpsDetail =
      locationError?.message ??
      'Enable foreground location access in your device settings.';
    gpsTone = 'error';
  } else if (isLoading) {
    gpsValue = 'Finding your position…';
    gpsDetail = 'Waiting for a current high-accuracy GPS fix.';
    gpsTone = 'warning';
  } else if (locationError) {
    gpsValue = 'GPS unavailable';
    gpsDetail = locationError.message;
    gpsTone = 'error';
  } else if (hasCoordinates) {
    gpsValue = `${latitude.toFixed(6)} / ${longitude.toFixed(6)}`;
    gpsDetail =
      accuracy === null
        ? 'Accuracy is not available on this device.'
        : `Accuracy: approximately ${Math.round(accuracy)} m`;
  }

  const zoneLabel = detectedZone ? 'Development zone' : 'Parking zone';
  const zoneValue = !hasCoordinates
    ? 'Waiting for GPS'
    : detectedZone?.code ?? 'Parking zone not yet identified';
  const zoneDetail = hasCoordinates
    ? detectedZone
      ? `${detectedZone.name}. Synthetic development data only — not an official Bitola parking zone.`
      : 'Official Bitola parking-zone mapping awaits verification.'
    : 'A zone will be checked after a location is available.';

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

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>FOREGROUND GPS · TEST ZONES</Text>
          </View>
          <Text style={styles.title}>Parking Bitola</Text>
          <Text style={styles.subtitle}>
            Your vehicle, current GPS position, and development-zone check.
          </Text>
        </View>

        <View style={styles.cards}>
          <InfoCard
            label="Current vehicle"
            value={
              hasHydrated
                ? defaultVehicle?.plate ?? 'No default vehicle'
                : 'Loading vehicle…'
            }
            detail={
              !hasHydrated
                ? 'Reading local vehicle data.'
                : defaultVehicle?.nickname
                  ? `${defaultVehicle.nickname} · Default vehicle`
                  : defaultVehicle
                    ? 'Default vehicle'
                    : 'Add or select a default vehicle to continue.'
            }
          />

          <InfoCard
            label="Current GPS"
            value={gpsValue}
            detail={gpsDetail}
            tone={gpsTone}
          />

          <InfoCard
            label={zoneLabel}
            value={zoneValue}
            detail={zoneDetail}
            tone={detectedZone ? 'warning' : 'neutral'}
          />
        </View>

        <View style={styles.startCard}>
          <Text style={styles.startTitle}>Start parking</Text>

          {!hasHydrated ? (
            <Text style={styles.startUnavailable}>
              Loading the saved vehicle before parking can start.
            </Text>
          ) : !defaultVehicle ? (
            <Text style={styles.startUnavailable}>
              No default vehicle. Add or select a vehicle first.
            </Text>
          ) : !detectedZone ? (
            <Text style={styles.startUnavailable}>
              {hasCoordinates
                ? 'Parking zone not yet identified. Official Bitola mapping awaits verification.'
                : 'A current GPS position is needed to identify a supported zone.'}
            </Text>
          ) : (
            <>
              <View style={styles.simulationBanner}>
                <Text style={styles.simulationTitle}>
                  DEVELOPMENT / SIMULATED PARKING
                </Text>
                <Text style={styles.simulationText}>
                  TEST zones never open or send a real SMS.
                </Text>
              </View>
              <View style={styles.previewRows}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Development zone</Text>
                  <Text style={styles.previewValue}>{detectedZone.code}</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Vehicle</Text>
                  <Text style={styles.previewValue}>
                    {defaultVehicle.plate}
                  </Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>SMS</Text>
                  <Text selectable style={styles.previewValue}>
                    {smsPreview}
                  </Text>
                </View>
              </View>
            </>
          )}

          {startError ? (
            <Text accessibilityRole="alert" style={styles.startError}>
              {startError}
            </Text>
          ) : null}

          <View style={styles.startAction}>
            <AppButton
              accessibilityHint="Prepares a simulated parking session for the detected development zone"
              disabled={!canPrepareSession}
              label="START PARKING"
              loading={isStarting}
              onPress={() => void handleStartParking()}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            accessibilityHint="Requests foreground permission if needed and reads the current GPS position"
            label="Refresh location"
            loading={isRefreshing}
            onPress={() => void refreshLocation()}
          />
          <AppButton
            accessibilityHint="Opens the local vehicle list"
            label="Manage vehicles"
            onPress={onManageVehicles}
            variant="secondary"
          />
        </View>

        <View style={styles.testNotice}>
          <Text style={styles.testNoticeTitle}>Test data notice</Text>
          <Text style={styles.testNoticeText}>
            TEST-A1 and TEST-A2 are synthetic development polygons. They are not
            verified or official Bitola parking-zone boundaries.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 680,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    width: '100%',
  },
  header: {
    marginBottom: 24,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  liveDot: {
    backgroundColor: '#2E9D6D',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  eyebrow: {
    color: '#52697F',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#132E47',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 40,
  },
  subtitle: {
    color: '#52697F',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  cards: {
    gap: 12,
  },
  startCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 17,
  },
  startTitle: {
    color: '#17324D',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 14,
  },
  startUnavailable: {
    color: '#52697F',
    fontSize: 15,
    lineHeight: 22,
  },
  simulationBanner: {
    backgroundColor: '#FFF4D6',
    borderColor: '#E6A817',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  simulationTitle: {
    color: '#6D4A00',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  simulationText: {
    color: '#765D27',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  previewRows: {
    borderColor: '#E2E8EE',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 50,
    paddingVertical: 9,
  },
  previewLabel: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  previewValue: {
    color: '#17324D',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  previewDivider: {
    backgroundColor: '#E8EDF2',
    height: 1,
  },
  startError: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  startAction: {
    marginTop: 16,
  },
  actions: {
    gap: 10,
    marginTop: 20,
  },
  testNotice: {
    backgroundColor: '#EAF3F0',
    borderColor: '#C4DDD4',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 15,
  },
  testNoticeTitle: {
    color: '#1E6047',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  testNoticeText: {
    color: '#3F6255',
    fontSize: 13,
    lineHeight: 19,
  },
});
