import type {
  AppTheme,
  LayoutTokens,
  RadiusTokens,
  ShadowTokens,
  SpacingTokens,
  ThemeColors,
  ThemeMode,
  TouchTargetTokens,
  TypographyTokens,
} from "./types";

export const spacing: SpacingTokens = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
};

export const radii: RadiusTokens = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const typography: TypographyTokens = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  titleLarge: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.45,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  number: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "700",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
};

export const touchTargets: TouchTargetTokens = {
  minimum: 44,
  comfortable: 48,
  primary: 56,
};

export const layout: LayoutTokens = {
  screenPadding: 20,
  compactScreenPadding: 16,
  sectionGap: 24,
  maxContentWidth: 560,
};

const lightColors: ThemeColors = {
  background: "#F5F3EE",
  surface: "#FFFEFB",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#ECE9E2",
  surfacePressed: "#E5E1D8",
  text: "#171A1F",
  textSecondary: "#505761",
  textMuted: "#626A75",
  textInverse: "#FFFFFF",
  border: "#D8D4CB",
  borderStrong: "#817C74",
  accent: "#1246A0",
  accentPressed: "#0C357C",
  accentSurface: "#E6EDF9",
  accentText: "#0D3B88",
  onAccent: "#FFFFFF",
  success: "#196B4A",
  successPressed: "#105239",
  successSurface: "#E4F2EA",
  successText: "#115139",
  onSuccess: "#FFFFFF",
  warning: "#8A4E00",
  warningPressed: "#693B00",
  warningSurface: "#FFF0D2",
  warningText: "#693B00",
  onWarning: "#FFFFFF",
  danger: "#B42318",
  dangerPressed: "#8E1C13",
  dangerSurface: "#FCE8E5",
  dangerText: "#8D1D15",
  onDanger: "#FFFFFF",
  info: "#1246A0",
  infoSurface: "#E6EDF9",
  infoText: "#0D3B88",
  development: "#1246A0",
  developmentSurface: "#E6EDF9",
  developmentText: "#0D3B88",
  onDevelopment: "#FFFFFF",
  disabled: "#D7D4CD",
  onDisabled: "#6C7178",
  focusRing: "#2B6BD3",
  overlay: "rgba(17, 20, 25, 0.48)",
  shadow: "#13213A",
};

const darkColors: ThemeColors = {
  background: "#111419",
  surface: "#191D23",
  surfaceRaised: "#21262E",
  surfaceMuted: "#252B34",
  surfacePressed: "#2D343E",
  text: "#F5F2EA",
  textSecondary: "#C1C6CF",
  textMuted: "#9DA5B0",
  textInverse: "#111419",
  border: "#535D6B",
  borderStrong: "#77818F",
  accent: "#79A9F4",
  accentPressed: "#99BEF7",
  accentSurface: "#182B49",
  accentText: "#A8C8FA",
  onAccent: "#0B1D37",
  success: "#6CD0A1",
  successPressed: "#8BDEB7",
  successSurface: "#153528",
  successText: "#86DCB4",
  onSuccess: "#092218",
  warning: "#F0B860",
  warningPressed: "#F4C97F",
  warningSurface: "#3A2A12",
  warningText: "#F4C97F",
  onWarning: "#2A1A05",
  danger: "#FF928A",
  dangerPressed: "#FFAAA4",
  dangerSurface: "#441F20",
  dangerText: "#FFAAA4",
  onDanger: "#32100D",
  info: "#79A9F4",
  infoSurface: "#182B49",
  infoText: "#A8C8FA",
  development: "#79A9F4",
  developmentSurface: "#182B49",
  developmentText: "#A8C8FA",
  onDevelopment: "#0B1D37",
  disabled: "#303640",
  onDisabled: "#A8B0BB",
  focusRing: "#91B8F6",
  overlay: "rgba(5, 7, 10, 0.72)",
  shadow: "#000000",
};

function createShadows(mode: ThemeMode, shadowColor: string): ShadowTokens {
  const isDark = mode === "dark";

  return {
    none: {},
    low: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.38 : 0.12,
      shadowRadius: 18,
      elevation: 5,
    },
  };
}

function createTheme(mode: ThemeMode, colors: ThemeColors): AppTheme {
  return {
    mode,
    isDark: mode === "dark",
    colors,
    spacing,
    radii,
    typography,
    shadows: createShadows(mode, colors.shadow),
    touchTargets,
    layout,
  };
}

export const lightTheme = createTheme("light", lightColors);
export const darkTheme = createTheme("dark", darkColors);

export const theme: Readonly<Record<ThemeMode, AppTheme>> = {
  light: lightTheme,
  dark: darkTheme,
};
