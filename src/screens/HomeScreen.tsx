import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, InfoCard } from '../components';
import { TEST_PARKING_ZONES } from '../data/testParkingZones';
import { useLocationStore } from '../stores/locationStore';
import {
  selectDefaultVehicle,
  useVehicleStore,
} from '../stores/vehicleStore';
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
