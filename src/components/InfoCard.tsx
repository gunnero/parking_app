import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type InfoCardTone = 'neutral' | 'success' | 'warning' | 'error';

type InfoCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: InfoCardTone;
  leading?: ReactNode;
};

export function InfoCard({
  label,
  value,
  detail,
  tone = 'neutral',
  leading,
}: InfoCardProps) {
  const selectedTone = toneStyles[tone];

  return (
    <View
      accessible
      accessibilityLabel={[label, value, detail].filter(Boolean).join('. ')}
      accessibilityLiveRegion="polite"
      style={styles.card}
    >
      <View style={[styles.accent, selectedTone.accent]} />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          {leading}
          <Text selectable style={[styles.value, selectedTone.value]}>
            {value}
          </Text>
        </View>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 112,
    overflow: 'hidden',
  },
  accent: {
    width: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  label: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  value: {
    flexShrink: 1,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 27,
  },
  detail: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  neutralAccent: {
    backgroundColor: '#7E9BB6',
  },
  neutralValue: {
    color: '#17324D',
  },
  successAccent: {
    backgroundColor: '#2E9D6D',
  },
  successValue: {
    color: '#176B49',
  },
  warningAccent: {
    backgroundColor: '#E6A817',
  },
  warningValue: {
    color: '#7A5200',
  },
  errorAccent: {
    backgroundColor: '#D64545',
  },
  errorValue: {
    color: '#B42318',
  },
});

const toneStyles = {
  neutral: {
    accent: styles.neutralAccent,
    value: styles.neutralValue,
  },
  success: {
    accent: styles.successAccent,
    value: styles.successValue,
  },
  warning: {
    accent: styles.warningAccent,
    value: styles.warningValue,
  },
  error: {
    accent: styles.errorAccent,
    value: styles.errorValue,
  },
} as const;
