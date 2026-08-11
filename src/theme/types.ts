import type { TextStyle, ViewStyle } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ThemeMode = Exclude<ThemePreference, "system">;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfacePressed: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentPressed: string;
  accentSurface: string;
  accentText: string;
  onAccent: string;
  success: string;
  successPressed: string;
  successSurface: string;
  successText: string;
  onSuccess: string;
  warning: string;
  warningPressed: string;
  warningSurface: string;
  warningText: string;
  onWarning: string;
  danger: string;
  dangerPressed: string;
  dangerSurface: string;
  dangerText: string;
  onDanger: string;
  info: string;
  infoSurface: string;
  infoText: string;
  development: string;
  developmentSurface: string;
  developmentText: string;
  onDevelopment: string;
  disabled: string;
  onDisabled: string;
  focusRing: string;
  overlay: string;
  shadow: string;
}

export interface SpacingTokens {
  none: number;
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  huge: number;
}

export interface RadiusTokens {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  full: number;
}

export interface TypographyTokens {
  display: Readonly<TextStyle>;
  titleLarge: Readonly<TextStyle>;
  title: Readonly<TextStyle>;
  heading: Readonly<TextStyle>;
  body: Readonly<TextStyle>;
  bodyMedium: Readonly<TextStyle>;
  label: Readonly<TextStyle>;
  caption: Readonly<TextStyle>;
  overline: Readonly<TextStyle>;
  number: Readonly<TextStyle>;
}

export interface ShadowTokens {
  none: Readonly<ViewStyle>;
  low: Readonly<ViewStyle>;
  medium: Readonly<ViewStyle>;
}

export interface TouchTargetTokens {
  minimum: number;
  comfortable: number;
  primary: number;
}

export interface LayoutTokens {
  screenPadding: number;
  compactScreenPadding: number;
  sectionGap: number;
  maxContentWidth: number;
}

export interface AppTheme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  spacing: SpacingTokens;
  radii: RadiusTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  touchTargets: TouchTargetTokens;
  layout: LayoutTokens;
}
