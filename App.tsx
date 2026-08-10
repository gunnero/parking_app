import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, StyleSheet } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { VehicleManagementScreen } from './src/screens/VehicleManagementScreen';

type AppScreen = 'home' | 'vehicles';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');

  useEffect(() => {
    if (screen !== 'vehicles') {
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
  }, [screen]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {screen === 'home' ? (
          <HomeScreen onManageVehicles={() => setScreen('vehicles')} />
        ) : (
          <VehicleManagementScreen onBack={() => setScreen('home')} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
});
