import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme';

export type AppIconName =
  | 'add'
  | 'appearance'
  | 'back'
  | 'car'
  | 'check'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'dark'
  | 'delete'
  | 'development'
  | 'edit'
  | 'error'
  | 'info'
  | 'light'
  | 'location'
  | 'location-off'
  | 'navigation'
  | 'notification'
  | 'notification-active'
  | 'parking'
  | 'refresh'
  | 'reminder'
  | 'selected'
  | 'shield'
  | 'sms'
  | 'stop'
  | 'success'
  | 'system'
  | 'timer'
  | 'unselected'
  | 'warning';

type CrossPlatformSymbol = {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
};

const iconNames = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  appearance: { ios: 'paintpalette', android: 'palette', web: 'palette' },
  back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  car: {
    ios: 'car.fill',
    android: 'directions_car',
    web: 'directions_car',
  },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  'chevron-right': {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
  },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  dark: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  development: { ios: 'flask.fill', android: 'science', web: 'science' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  error: {
    ios: 'xmark.octagon.fill',
    android: 'error',
    web: 'error',
  },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  light: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  location: {
    ios: 'location.fill',
    android: 'location_on',
    web: 'location_on',
  },
  'location-off': {
    ios: 'location.slash',
    android: 'location_disabled',
    web: 'location_disabled',
  },
  navigation: {
    ios: 'location.north.fill',
    android: 'navigation',
    web: 'navigation',
  },
  notification: {
    ios: 'bell',
    android: 'notifications',
    web: 'notifications',
  },
  'notification-active': {
    ios: 'bell.badge.fill',
    android: 'notifications_active',
    web: 'notifications_active',
  },
  parking: {
    ios: 'parkingsign',
    android: 'local_parking',
    web: 'local_parking',
  },
  refresh: {
    ios: 'arrow.clockwise',
    android: 'refresh',
    web: 'refresh',
  },
  reminder: {
    ios: 'bell.and.waves.left.and.right.fill',
    android: 'notification_important',
    web: 'notification_important',
  },
  selected: {
    ios: 'circle.inset.filled',
    android: 'radio_button_checked',
    web: 'radio_button_checked',
  },
  shield: {
    ios: 'shield.checkered',
    android: 'verified_user',
    web: 'verified_user',
  },
  sms: { ios: 'message.fill', android: 'sms', web: 'sms' },
  stop: {
    ios: 'stop.circle.fill',
    android: 'stop_circle',
    web: 'stop_circle',
  },
  success: {
    ios: 'checkmark.circle.fill',
    android: 'check_circle',
    web: 'check_circle',
  },
  system: {
    ios: 'desktopcomputer',
    android: 'desktop_windows',
    web: 'desktop_windows',
  },
  timer: { ios: 'timer', android: 'timer', web: 'timer' },
  unselected: {
    ios: 'circle',
    android: 'radio_button_unchecked',
    web: 'radio_button_unchecked',
  },
  warning: {
    ios: 'exclamationmark.triangle.fill',
    android: 'warning',
    web: 'warning',
  },
} satisfies Record<AppIconName, CrossPlatformSymbol>;

export type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({
  name,
  size = 22,
  color,
  accessibilityLabel,
  style,
}: AppIconProps) {
  const { theme } = useAppTheme();

  return (
    <SymbolView
      accessibilityElementsHidden={!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      importantForAccessibility={
        accessibilityLabel ? 'auto' : 'no-hide-descendants'
      }
      name={iconNames[name]}
      size={size}
      tintColor={color ?? theme.colors.text}
      type="monochrome"
      style={[{ height: size, width: size }, style]}
    />
  );
}
