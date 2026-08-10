import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../components';
import {
  runStartParkingSmsFlow,
  runStopParkingSmsFlow,
  type ParkingSessionSmsFlowResult,
} from '../services/parkingSessionSmsFlow';
import type { ParkingReminderRuntimeStatus } from '../services/parkingReminderController';
import { useParkingReminderStore } from '../stores/parkingReminderStore';
import { useParkingSessionStore } from '../stores/parkingSessionStore';
import type { ParkingSession } from '../types/parkingSession';
import { getParkingSessionElapsedDisplay } from '../utils/parkingSessionState';

function formatClockTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function requestFailureMessage(
  result: ParkingSessionSmsFlowResult,
  action: 'start' | 'stop',
): string {
  if ('reason' in result) {
    return result.reason;
  }

  if (result.outcome === 'cancelled') {
    return `The SMS composer was cancelled. The parking ${action} request was not prepared.`;
  }

  return `The parking ${action} request could not be prepared.`;
}

function SessionSnapshot({
  session,
  includeRequest = false,
}: {
  session: ParkingSession;
  includeRequest?: boolean;
}) {
  return (
    <View style={styles.snapshotCard}>
      <SnapshotRow label="Zone" value={session.zoneCode} />
      <View style={styles.divider} />
      <SnapshotRow label="Vehicle" value={session.plate} />
      {includeRequest ? (
        <>
          <View style={styles.divider} />
          <SnapshotRow
            label={session.deliveryMode === 'simulation' ? 'Simulation' : 'SMS'}
            value={session.startMessage}
          />
        </>
      ) : null}
    </View>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.snapshotRow}>
      <Text style={styles.snapshotLabel}>{label}</Text>
      <Text selectable style={styles.snapshotValue}>
        {value}
      </Text>
    </View>
  );
}

function SimulationBanner() {
  return (
    <View
      accessible
      accessibilityLabel="Development simulated parking. No SMS will be opened or sent."
      style={styles.simulationBanner}
    >
      <Text style={styles.simulationTitle}>
        DEVELOPMENT / SIMULATED PARKING
      </Text>
      <Text style={styles.simulationText}>
        No SMS will be opened or sent for this TEST session.
      </Text>
    </View>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <View accessibilityLiveRegion="assertive" style={styles.errorNotice}>
      <Text accessibilityRole="alert" style={styles.errorTitle}>
        Request not prepared
      </Text>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

type ReminderStatusTone = 'positive' | 'neutral' | 'warning' | 'error';

function getReminderStatusPresentation(
  enabled: boolean,
  status: ParkingReminderRuntimeStatus,
): { label: string; tone: ReminderStatusTone } {
  if (
    (!enabled && status !== 'error' && status !== 'storage-error') ||
    status === 'disabled'
  ) {
    return { label: 'OFF', tone: 'neutral' };
  }

  switch (status) {
    case 'monitoring':
      return { label: 'ON', tone: 'positive' };
    case 'monitoring-without-notifications':
      return { label: 'UNAVAILABLE', tone: 'warning' };
    case 'reminder-sent':
      return { label: 'SENT', tone: 'positive' };
    case 'idle':
      return { label: 'CHECKING', tone: 'neutral' };
    case 'inactive':
      return { label: 'PAUSED', tone: 'neutral' };
    case 'missing-start-location':
    case 'permission-required':
    case 'unsupported':
      return { label: 'UNAVAILABLE', tone: 'warning' };
    case 'error':
    case 'reminder-failed':
    case 'storage-error':
      return { label: 'ERROR', tone: 'error' };
  }
}

function reminderStatusStyle(tone: ReminderStatusTone) {
  switch (tone) {
    case 'positive':
      return styles.reminderStatusPositive;
    case 'warning':
      return styles.reminderStatusWarning;
    case 'error':
      return styles.reminderStatusError;
    case 'neutral':
      return styles.reminderStatusNeutral;
  }
}

function ParkingReminderCard({ session }: { session: ParkingSession }) {
  const enabled = useParkingReminderStore((state) => state.enabled);
  const isBusy = useParkingReminderStore((state) => state.isBusy);
  const runtime = useParkingReminderStore((state) => state.runtime);
  const reminderError = useParkingReminderStore((state) => state.error);
  const setEnabled = useParkingReminderStore((state) => state.setEnabled);
  const setupPermissions = useParkingReminderStore(
    (state) => state.setupPermissions,
  );
  const reconcile = useParkingReminderStore((state) => state.reconcile);

  const presentation = getReminderStatusPresentation(
    enabled,
    reminderError ? 'error' : runtime.status,
  );
  const canRequestLocation =
    runtime.status === 'permission-required' &&
    runtime.canAskLocationAgain;
  const canRequestNotifications =
    runtime.status === 'monitoring-without-notifications' &&
    runtime.canAskNotificationAgain;
  const needsSettings =
    enabled &&
    ((runtime.status === 'permission-required' &&
      !runtime.canAskLocationAgain) ||
      (runtime.status === 'monitoring-without-notifications' &&
        !runtime.canAskNotificationAgain));
  const canRetry =
    runtime.status === 'error' ||
    runtime.status === 'storage-error' ||
    reminderError !== null;
  const reason = reminderError
    ? reminderError
    : enabled ||
        runtime.status === 'error' ||
        runtime.status === 'storage-error'
      ? runtime.reason
      : 'Departure reminders are off.';

  const explainAndSetUp = () => {
    Alert.alert(
      'Set up parking reminders',
      'Allow background location so Parking can remind you if you leave while a parking session is still active. Parking is never stopped automatically, and no route history is stored.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => void setupPermissions(session),
        },
      ],
    );
  };

  const openSettings = () => {
    void Linking.openSettings();
  };

  return (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderHeadingGroup}>
          <Text style={styles.reminderTitle}>Parking reminder</Text>
          <View style={styles.reminderStatusRow}>
            {isBusy ? (
              <ActivityIndicator color="#176B49" size="small" />
            ) : null}
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.reminderStatus,
                reminderStatusStyle(presentation.tone),
              ]}
            >
              {presentation.label}
            </Text>
          </View>
        </View>
        <Switch
          accessibilityHint="Controls background departure monitoring for the active parking session."
          accessibilityLabel="Parking departure reminders"
          disabled={isBusy}
          onValueChange={(nextEnabled) =>
            void setEnabled(nextEnabled, session)
          }
          thumbColor="#FFFFFF"
          trackColor={{ false: '#AAB7C4', true: '#55A184' }}
          value={enabled}
        />
      </View>
      <Text style={styles.reminderReason}>{reason}</Text>
      {enabled && (canRequestLocation || canRequestNotifications) ? (
        <View style={styles.reminderAction}>
          <AppButton
            disabled={isBusy}
            label={
              canRequestNotifications
                ? 'ENABLE NOTIFICATIONS'
                : 'SET UP REMINDER'
            }
            onPress={explainAndSetUp}
            variant="secondary"
          />
        </View>
      ) : null}
      {canRetry ? (
        <View style={styles.reminderAction}>
          <AppButton
            disabled={isBusy}
            label="RETRY REMINDER CHECK"
            onPress={() =>
              void (enabled
                ? reconcile(session)
                : setEnabled(false, session))
            }
            variant="secondary"
          />
        </View>
      ) : null}
      {needsSettings ? (
        <View style={styles.reminderAction}>
          <AppButton
            disabled={isBusy}
            label="OPEN SETTINGS"
            onPress={openSettings}
            variant="ghost"
          />
        </View>
      ) : null}
    </View>
  );
}

export function ParkingSessionScreen() {
  const session = useParkingSessionStore((state) => state.session);
  const operationError = useParkingSessionStore(
    (state) => state.operationError,
  );
  const markStartRequestPrepared = useParkingSessionStore(
    (state) => state.markStartRequestPrepared,
  );
  const confirmSessionManually = useParkingSessionStore(
    (state) => state.confirmSessionManually,
  );
  const beginStop = useParkingSessionStore((state) => state.beginStop);
  const markStopRequestPrepared = useParkingSessionStore(
    (state) => state.markStopRequestPrepared,
  );
  const returnToActiveSession = useParkingSessionStore(
    (state) => state.returnToActiveSession,
  );
  const completeSessionManually = useParkingSessionStore(
    (state) => state.completeSessionManually,
  );
  const cancelPendingSession = useParkingSessionStore(
    (state) => state.cancelPendingSession,
  );
  const resetSession = useParkingSessionStore((state) => state.resetSession);
  const setOperationError = useParkingSessionStore(
    (state) => state.setOperationError,
  );
  const clearOperationError = useParkingSessionStore(
    (state) => state.clearOperationError,
  );
  const isProcessing = useParkingSessionStore(
    (state) => state.smsFlowInFlight,
  );
  const beginSmsFlow = useParkingSessionStore(
    (state) => state.beginSmsFlow,
  );
  const finishSmsFlow = useParkingSessionStore(
    (state) => state.finishSmsFlow,
  );
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (session?.status !== 'active') {
      return undefined;
    }

    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1_000);

    return () => clearInterval(timer);
  }, [session?.id, session?.status]);

  if (!session) {
    return null;
  }

  const showSimulation = session.deliveryMode === 'simulation';

  const storeTransitionError = (
    result: { success: boolean; error?: string },
    fallback: string,
  ) => {
    if (!result.success) {
      setOperationError(result.error ?? fallback);
      return true;
    }

    return false;
  };

  const prepareStartRequest = async () => {
    if (!beginSmsFlow()) {
      return;
    }

    const currentSession = useParkingSessionStore.getState().session;

    if (!currentSession) {
      finishSmsFlow();
      return;
    }

    clearOperationError();

    try {
      const flowResult = await runStartParkingSmsFlow(currentSession, true);

      if (flowResult.requestResult === null) {
        setOperationError(requestFailureMessage(flowResult, 'start'));
        return;
      }

      storeTransitionError(
        markStartRequestPrepared(flowResult.requestResult),
        'The prepared start request could not be saved.',
      );
    } finally {
      finishSmsFlow();
    }
  };

  const prepareStopRequest = async () => {
    if (!beginSmsFlow()) {
      return;
    }

    const currentSession = useParkingSessionStore.getState().session;

    if (!currentSession) {
      finishSmsFlow();
      return;
    }

    clearOperationError();

    try {
      const flowResult = await runStopParkingSmsFlow(currentSession, true);

      if (flowResult.requestResult === null) {
        setOperationError(requestFailureMessage(flowResult, 'stop'));
        return;
      }

      storeTransitionError(
        markStopRequestPrepared(flowResult.requestResult),
        'The prepared stop request could not be saved.',
      );
    } finally {
      finishSmsFlow();
    }
  };

  const startStopFlow = async () => {
    clearOperationError();
    const transition = beginStop();

    if (
      storeTransitionError(
        transition,
        'The parking session could not begin stopping.',
      )
    ) {
      return;
    }

    await prepareStopRequest();
  };

  const runTransition = (
    transition: () => { success: boolean; error?: string },
    fallback: string,
  ) => {
    clearOperationError();
    storeTransitionError(transition(), fallback);
  };

  const cancelPendingAndReturnHome = () => {
    clearOperationError();
    storeTransitionError(
      cancelPendingSession(),
      'The pending parking session could not be cancelled.',
    );
  };

  let body: ReactNode;

  switch (session.status) {
    case 'preparing':
      body = (
        <>
          <Text style={styles.statusTitle}>Preparing parking request</Text>
          <Text style={styles.statusText}>
            {showSimulation
              ? 'Prepare the safe development simulation. Nothing will be sent.'
              : 'Continue to the native SMS composer. Returning from it will not prove operator acceptance.'}
          </Text>
          <SessionSnapshot includeRequest session={session} />
          {operationError ? <ErrorNotice message={operationError} /> : null}
          <View style={styles.actions}>
            <AppButton
              label={
                operationError ? 'RETRY START REQUEST' : 'PREPARE START REQUEST'
              }
              loading={isProcessing}
              onPress={() => void prepareStartRequest()}
            />
            <AppButton
              disabled={isProcessing}
              label="CANCEL"
              onPress={cancelPendingAndReturnHome}
              variant="ghost"
            />
          </View>
        </>
      );
      break;

    case 'awaiting_confirmation':
      body = (
        <>
          <Text style={styles.statusTitle}>Parking request prepared</Text>
          <Text style={styles.statusText}>
            {showSimulation
              ? 'The development request is ready for simulated confirmation.'
              : 'Waiting for confirmation from ЈП Паркинзи. A composer result alone is not operator acceptance.'}
          </Text>
          <SessionSnapshot session={session} />
          {operationError ? <ErrorNotice message={operationError} /> : null}
          <View style={styles.actions}>
            <AppButton
              label={
                showSimulation
                  ? 'SIMULATE CONFIRMATION'
                  : 'CONFIRM PARKING STARTED'
              }
              onPress={() =>
                runTransition(
                  confirmSessionManually,
                  'The parking session could not be confirmed.',
                )
              }
            />
            <AppButton
              label="CANCEL"
              onPress={cancelPendingAndReturnHome}
              variant="ghost"
            />
          </View>
        </>
      );
      break;

    case 'active':
      body = (
        <>
          <Text style={styles.activeEyebrow}>
            {showSimulation ? 'SIMULATED SESSION' : 'PARKING ACTIVE'}
          </Text>
          <Text style={styles.statusTitle}>Parking active</Text>
          <SessionSnapshot session={session} />
          <View style={styles.timeGrid}>
            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>Started</Text>
              <Text style={styles.timeValue}>
                {formatClockTime(session.startedAt)}
              </Text>
            </View>
            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>Elapsed</Text>
              <Text style={styles.timeValue}>
                {getParkingSessionElapsedDisplay(session, nowMs)}
              </Text>
            </View>
          </View>
          <ParkingReminderCard session={session} />
          {operationError ? <ErrorNotice message={operationError} /> : null}
          <View style={styles.actions}>
            <AppButton
              label="STOP PARKING"
              loading={isProcessing}
              onPress={() => void startStopFlow()}
              variant="danger"
            />
          </View>
        </>
      );
      break;

    case 'stopping':
      body = (
        <>
          <Text style={styles.statusTitle}>Preparing stop request</Text>
          <Text style={styles.statusText}>
            {showSimulation
              ? 'The stop request is simulated and does not use SMS or GPS.'
              : 'Stopping uses the saved session details and does not require GPS.'}
          </Text>
          <SessionSnapshot session={session} />
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#176B49" />
              <Text style={styles.processingText}>Preparing request…</Text>
            </View>
          ) : null}
          {operationError ? <ErrorNotice message={operationError} /> : null}
          <View style={styles.actions}>
            {!isProcessing ? (
              <AppButton
                label="RETRY STOP REQUEST"
                onPress={() => void prepareStopRequest()}
              />
            ) : null}
            <AppButton
              disabled={isProcessing}
              label="RETURN TO ACTIVE SESSION"
              onPress={() =>
                runTransition(
                  returnToActiveSession,
                  'The active parking session could not be restored.',
                )
              }
              variant="secondary"
            />
          </View>
        </>
      );
      break;

    case 'awaiting_stop_confirmation':
      body = (
        <>
          <Text style={styles.statusTitle}>Stop request prepared</Text>
          <Text style={styles.statusText}>
            {showSimulation
              ? 'Confirm the simulated stop to complete this development session.'
              : 'Waiting for confirmation from ЈП Паркинзи. The composer result does not prove the session stopped.'}
          </Text>
          <SessionSnapshot session={session} />
          {operationError ? <ErrorNotice message={operationError} /> : null}
          <View style={styles.actions}>
            <AppButton
              label={
                showSimulation
                  ? 'SIMULATE STOP CONFIRMATION'
                  : 'CONFIRM PARKING STOPPED'
              }
              onPress={() =>
                runTransition(
                  completeSessionManually,
                  'The parking session could not be completed.',
                )
              }
            />
            <AppButton
              label="RETURN TO ACTIVE SESSION"
              onPress={() =>
                runTransition(
                  returnToActiveSession,
                  'The active parking session could not be restored.',
                )
              }
              variant="secondary"
            />
          </View>
        </>
      );
      break;

    case 'completed': {
      body = (
        <>
          <Text style={styles.statusTitle}>Parking completed</Text>
          <Text style={styles.statusText}>
            {showSimulation
              ? 'The simulated development session is complete.'
              : 'This local session has been marked complete.'}
          </Text>
          <SessionSnapshot session={session} />
          <View style={styles.summaryCard}>
            <SnapshotRow
              label="Started"
              value={formatClockTime(session.startedAt)}
            />
            <View style={styles.divider} />
            <SnapshotRow
              label="Stopped"
              value={formatClockTime(session.stoppedAt)}
            />
            <View style={styles.divider} />
            <SnapshotRow
              label="Duration"
              value={getParkingSessionElapsedDisplay(session, nowMs)}
            />
          </View>
          {operationError ? <ErrorNotice message={operationError} /> : null}
          <View style={styles.actions}>
            <AppButton
              label="DONE"
              onPress={() =>
                runTransition(
                  resetSession,
                  'The completed session could not be cleared.',
                )
              }
            />
          </View>
        </>
      );
      break;
    }

    case 'failed':
      body = (
        <>
          <Text style={styles.statusTitle}>Parking request failed</Text>
          <Text style={styles.statusText}>
            No parking state was confirmed. Clear this request to return home.
          </Text>
          <SessionSnapshot session={session} />
          {operationError ? <ErrorNotice message={operationError} /> : null}
          <View style={styles.actions}>
            <AppButton
              label="RETURN HOME"
              onPress={() =>
                runTransition(
                  resetSession,
                  'The failed session could not be cleared.',
                )
              }
            />
          </View>
        </>
      );
      break;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        {showSimulation ? <SimulationBanner /> : null}
        {body}
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
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 24,
    width: '100%',
  },
  simulationBanner: {
    backgroundColor: '#FFF4D6',
    borderColor: '#E6A817',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 22,
    padding: 15,
  },
  simulationTitle: {
    color: '#6D4A00',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.55,
  },
  simulationText: {
    color: '#765D27',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  statusTitle: {
    color: '#132E47',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  statusText: {
    color: '#52697F',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 20,
    marginTop: 8,
  },
  activeEyebrow: {
    color: '#176B49',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  snapshotCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 17,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 17,
  },
  snapshotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    minHeight: 58,
    paddingVertical: 10,
  },
  snapshotLabel: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  snapshotValue: {
    color: '#17324D',
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },
  divider: {
    backgroundColor: '#E8EDF2',
    height: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  timeCard: {
    backgroundColor: '#EAF3F0',
    borderColor: '#C4DDD4',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 15,
  },
  timeLabel: {
    color: '#4C6A5F',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeValue: {
    color: '#176B49',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    marginTop: 5,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  reminderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  reminderHeadingGroup: {
    flex: 1,
  },
  reminderTitle: {
    color: '#17324D',
    fontSize: 16,
    fontWeight: '800',
  },
  reminderStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 4,
  },
  reminderStatus: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  reminderStatusPositive: {
    color: '#176B49',
  },
  reminderStatusNeutral: {
    color: '#667085',
  },
  reminderStatusWarning: {
    color: '#9A6700',
  },
  reminderStatusError: {
    color: '#B42318',
  },
  reminderReason: {
    color: '#52697F',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  reminderAction: {
    marginTop: 10,
  },
  errorNotice: {
    backgroundColor: '#FFF5F4',
    borderColor: '#F6C7C3',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  errorTitle: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#8A2E26',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  processingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  processingText: {
    color: '#52697F',
    fontSize: 14,
  },
  actions: {
    gap: 10,
    marginTop: 20,
  },
});
