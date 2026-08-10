import { registerRootComponent } from 'expo';

// Expo background tasks must be defined while the JavaScript bundle loads,
// before React mounts any views.
import './src/tasks/parkingDepartureTask';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
