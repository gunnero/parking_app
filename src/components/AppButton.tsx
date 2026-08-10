import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
}: AppButtonProps) {
  const selectedVariant = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selectedVariant.button,
        pressed && selectedVariant.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Loading"
            color={selectedVariant.spinner}
            size="small"
          />
        ) : null}
        <Text style={[styles.label, selectedVariant.text]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#176B49',
    borderColor: '#176B49',
  },
  primaryPressed: {
    backgroundColor: '#10563A',
    borderColor: '#10563A',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#AFC3D6',
  },
  secondaryPressed: {
    backgroundColor: '#EDF4FA',
  },
  secondaryText: {
    color: '#194F82',
  },
  dangerButton: {
    backgroundColor: '#FFF5F4',
    borderColor: '#F6C7C3',
  },
  dangerPressed: {
    backgroundColor: '#FEE4E2',
  },
  dangerText: {
    color: '#B42318',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  ghostPressed: {
    backgroundColor: '#E7EEF5',
  },
  ghostText: {
    color: '#475467',
  },
  disabled: {
    opacity: 0.55,
  },
});

const variantStyles = {
  primary: {
    button: styles.primaryButton,
    pressed: styles.primaryPressed,
    text: styles.primaryText,
    spinner: '#FFFFFF',
  },
  secondary: {
    button: styles.secondaryButton,
    pressed: styles.secondaryPressed,
    text: styles.secondaryText,
    spinner: '#194F82',
  },
  danger: {
    button: styles.dangerButton,
    pressed: styles.dangerPressed,
    text: styles.dangerText,
    spinner: '#B42318',
  },
  ghost: {
    button: styles.ghostButton,
    pressed: styles.ghostPressed,
    text: styles.ghostText,
    spinner: '#475467',
  },
} as const;
