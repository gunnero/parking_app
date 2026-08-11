import { useEffect, useMemo, useState } from 'react';
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

import { AppIcon } from './src/components';
import {
  applyVisualPreviewScenario,
  isVisualPreviewEnabled,
} from './src/dev';
import { AppearanceScreen } from './src/screens/AppearanceScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ParkingSessionScreen } from './src/screens/ParkingSessionScreen';
import { VehicleManagementScreen } from './src/screens/VehicleManagementScreen';
import { useParkingReminderStore } from './src/stores/parkingReminderStore';
import { useParkingSessionStore } from './src/stores/parkingSessionStore';
import { ThemeProvider, useAppTheme, type AppTheme } from './src/theme';

type AppScreen = 'home' | 'vehicles' | 'appearance';

const visualPreview = isVisualPreviewEnabled
  ? applyVisualPreviewScenario()
  : null;

function ParkingApp() {
  const [screen, setScreen] = useState<AppScreen>(
    visualPreview?.route ?? 'home',
  );
  const { theme, hasHydrated: themeHasHydrated } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    if (isVisualPreviewEnabled) {
      return;
    }

    void hydrateReminder();
  }, [hydrateReminder]);

  useEffect(() => {
    if (session) {
      setScreen('home');
    }
  }, [session]);

  useEffect(() => {
    if (session || screen === 'home') {
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
    if (isVisualPreviewEnabled) {
      return;
    }

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
    if (isVisualPreviewEnabled) {
      return undefined;
    }

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

  const isRestoring =
    !themeHasHydrated || !sessionHasHydrated || !reminderHasHydrated;

  let content;

  if (isRestoring) {
    content = (
      <View
        accessibilityLiveRegion="polite"
        style={styles.restorationContainer}
      >
        <View style={styles.restorationMark}>
          <AppIcon
            color={theme.colors.onAccent}
            name="parking"
            size={29}
          />
        </View>
        <ActivityIndicator
          color={theme.colors.accent}
          size="large"
          style={styles.restorationSpinner}
        />
        <Text style={styles.restorationTitle}>Getting parking ready</Text>
        <Text style={styles.restorationText}>
          Restoring your vehicle, parking session, and reminder preference.
        </Text>
      </View>
    );
  } else if (session) {
    content = <ParkingSessionScreen />;
  } else if (screen === 'home') {
    content = (
      <HomeScreen
        onManageVehicles={() => setScreen('vehicles')}
        onOpenAppearance={() => setScreen('appearance')}
      />
    );
  } else if (screen === 'vehicles') {
    content = <VehicleManagementScreen onBack={() => setScreen('home')} />;
  } else {
    content = <AppearanceScreen onBack={() => setScreen('home')} />;
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <ParkingApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    restorationContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xxl,
    },
    restorationMark: {
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      height: 54,
      justifyContent: 'center',
      width: 54,
    },
    restorationSpinner: {
      marginTop: theme.spacing.xl,
    },
    restorationTitle: {
      ...theme.typography.title,
      color: theme.colors.text,
      marginTop: theme.spacing.lg,
      textAlign: 'center',
    },
    restorationText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      maxWidth: 340,
      textAlign: 'center',
    },
  });
}
