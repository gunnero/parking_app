import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { ParkingSessionScreen } from './src/screens/ParkingSessionScreen';
import { VehicleManagementScreen } from './src/screens/VehicleManagementScreen';
import { useParkingReminderStore } from './src/stores/parkingReminderStore';
import { useParkingSessionStore } from './src/stores/parkingSessionStore';

type AppScreen = 'home' | 'vehicles';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const session = useParkingSessionStore((state) => state.session);
  const sessionHasHydrated = useParkingSessionStore(
    (state) => state.hasHydrated,
  );
  const reminderEnabled = useParkingReminderStore((state) => state.enabled);
  const reminderHasHydrated = useParkingReminderStore(
    (state) => state.hasHydrated,
  );
  const reminderUserActionBusy = useParkingReminderStore(
    (state) => state.isUserActionBusy,
  );
  const hydrateReminder = useParkingReminderStore((state) => state.hydrate);
  const refreshReminder = useParkingReminderStore(
    (state) => state.refreshFromStorage,
  );
  const reconcileReminder = useParkingReminderStore(
    (state) => state.reconcile,
  );

  useEffect(() => {
    void hydrateReminder();
  }, [hydrateReminder]);

  useEffect(() => {
    if (session) {
      setScreen('home');
    }
  }, [session]);

  useEffect(() => {
    if (session || screen !== 'vehicles') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setScreen('home');
        return true;
      },
    );

    return () => subscription.remove();
  }, [screen, session]);

  useEffect(() => {
    if (
      !sessionHasHydrated ||
      !reminderHasHydrated ||
      reminderUserActionBusy
    ) {
      return;
    }

    void reconcileReminder(session);
  }, [
    reconcileReminder,
    reminderEnabled,
    reminderHasHydrated,
    reminderUserActionBusy,
    session?.id,
    session?.startLocation?.accuracy,
    session?.startLocation?.latitude,
    session?.startLocation?.longitude,
    session?.status,
    sessionHasHydrated,
  ]);

  useEffect(() => {
    if (!sessionHasHydrated || !reminderHasHydrated) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      if (useParkingReminderStore.getState().isUserActionBusy) {
        return;
      }

      void (async () => {
        await refreshReminder();
        await reconcileReminder(
          useParkingSessionStore.getState().session,
        );
      })();
    });

    return () => subscription.remove();
  }, [
    reconcileReminder,
    refreshReminder,
    reminderHasHydrated,
    sessionHasHydrated,
  ]);

  let content;

  if (!sessionHasHydrated || !reminderHasHydrated) {
    content = (
      <View
        accessibilityLiveRegion="polite"
        style={styles.restorationContainer}
      >
        <ActivityIndicator color="#176B49" size="large" />
        <Text style={styles.restorationTitle}>Restoring parking data…</Text>
        <Text style={styles.restorationText}>
          Checking this device for a parking session and reminder settings.
        </Text>
      </View>
    );
  } else if (session) {
    content = <ParkingSessionScreen />;
  } else if (screen === 'home') {
    content = <HomeScreen onManageVehicles={() => setScreen('vehicles')} />;
  } else {
    content = <VehicleManagementScreen onBack={() => setScreen('home')} />;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {content}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
  restorationContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  restorationTitle: {
    color: '#17324D',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  restorationText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
});
