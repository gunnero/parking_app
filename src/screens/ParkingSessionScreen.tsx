import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AppButton,
  AppHeader,
  Card,
  InfoRow,
  StatusBadge,
} from '../components';
import {
  runStartParkingSmsFlow,
  runStopParkingSmsFlow,
  type ParkingSessionSmsFlowResult,
} from '../services/parkingSessionSmsFlow';
import type { ParkingReminderRuntimeStatus } from '../services/parkingReminderController';
import { useParkingReminderStore } from '../stores/parkingReminderStore';
import { useParkingSessionStore } from '../stores/parkingSessionStore';
import { type AppTheme, useAppTheme } from '../theme';
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

type SessionStyles = ReturnType<typeof createStyles>;
type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'development';

function SessionSnapshot({
  includeRequest = false,
  session,
  styles,
}: {
  includeRequest?: boolean;
  session: ParkingSession;
  styles: SessionStyles;
}) {
  return (
    <Card padding="none">
      <View style={styles.infoRow}>
        <InfoRow icon="parking" label="Zone" value={session.zoneCode} />
      </View>
      <View style={styles.divider} />
      <View style={styles.infoRow}>
        <InfoRow icon="car" label="Vehicle" value={session.plate} />
      </View>
      {includeRequest ? (
        <>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <InfoRow
              icon={session.deliveryMode === 'simulation' ? 'shield' : 'sms'}
              label={
                session.deliveryMode === 'simulation'
                  ? 'Simulated request'
                  : 'SMS preview'
              }
              tone={
                session.deliveryMode === 'simulation'
                  ? 'development'
                  : 'accent'
              }
              value={session.startMessage}
            />
          </View>
        </>
      ) : null}
    </Card>
  );
}

function SimulationBanner({
  session,
  styles,
}: {
  session: ParkingSession;
  styles: SessionStyles;
}) {
  return (
    <Card
      accessibilityLabel={`Development mode. ${session.zoneCode} is a simulated test zone. No SMS will be opened or sent.`}
      padding="compact"
      tone="development"
    >
      <View style={styles.simulationHeading}>
        <StatusBadge label="DEVELOPMENT MODE" tone="development" />
      </View>
      <Text style={styles.simulationTitle}>Simulated parking session</Text>
      <Text style={styles.simulationText}>
        {session.zoneCode} uses synthetic test data. It is not an official
        Bitola parking zone, and no SMS will be opened or sent.
      </Text>
    </Card>
  );
}

function ErrorNotice({
  message,
  styles,
}: {
  message: string;
  styles: SessionStyles;
}) {
  return (
    <View accessibilityLiveRegion="assertive">
      <Card padding="compact" tone="danger">
        <Text accessibilityRole="alert" style={styles.errorTitle}>
          Action needs attention
        </Text>
        <Text style={styles.errorText}>{message}</Text>
      </Card>
    </View>
  );
}

function StateIntro({
  badge,
  badgeTone,
  description,
  styles,
  title,
}: {
  badge: string;
  badgeTone: BadgeTone;
  description: string;
  styles: SessionStyles;
  title: string;
}) {
  return (
    <View style={styles.stateIntro}>
      <View style={styles.badgeRow}>
        <StatusBadge label={badge} tone={badgeTone} />
      </View>
      <Text accessibilityRole="header" style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateDescription}>{description}</Text>
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

function reminderBadgeTone(tone: ReminderStatusTone): BadgeTone {
  switch (tone) {
    case 'positive':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    case 'neutral':
      return 'neutral';
  }
}

function ParkingReminderCard({
  session,
  styles,
  theme,
}: {
  session: ParkingSession;
  styles: SessionStyles;
  theme: AppTheme;
}) {
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
  const showReason =
    reminderError !== null ||
    (runtime.status !== 'monitoring' && runtime.status !== 'disabled');

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
    <Card padding="compact">
      <View style={styles.reminderHeader}>
        <View style={styles.reminderHeadingGroup}>
          <Text accessibilityRole="header" style={styles.reminderTitle}>
            Parking reminder
          </Text>
          <View
            accessibilityLiveRegion="polite"
            style={styles.reminderStatusRow}
          >
            {isBusy ? (
              <ActivityIndicator color={theme.colors.accent} size="small" />
            ) : null}
            <StatusBadge
              label={presentation.label}
              tone={reminderBadgeTone(presentation.tone)}
            />
          </View>
        </View>
        <Switch
          accessibilityHint="Controls background departure monitoring for the active parking session."
          accessibilityLabel="Parking departure reminders"
          disabled={isBusy}
          hitSlop={{ bottom: 8, left: 6, right: 6, top: 8 }}
          ios_backgroundColor={theme.colors.borderStrong}
          onValueChange={(nextEnabled) =>
            void setEnabled(nextEnabled, session)
          }
          thumbColor={theme.colors.surfaceRaised}
          trackColor={{
            false: theme.colors.borderStrong,
            true: theme.colors.success,
          }}
          value={enabled}
        />
      </View>
      {showReason ? (
        <Text style={styles.reminderReason}>{reason}</Text>
      ) : null}
      {enabled && (canRequestLocation || canRequestNotifications) ? (
        <View style={styles.reminderAction}>
          <AppButton
            compact
            disabled={isBusy}
            label={
              canRequestNotifications
                ? 'Enable notifications'
                : 'Set up reminder'
            }
            leadingIcon={
              canRequestNotifications ? 'notification' : 'reminder'
            }
            onPress={explainAndSetUp}
            variant="secondary"
          />
        </View>
      ) : null}
      {canRetry ? (
        <View style={styles.reminderAction}>
          <AppButton
            compact
            disabled={isBusy}
            label="Retry reminder check"
            leadingIcon="refresh"
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
            compact
            disabled={isBusy}
            label="Open settings"
            onPress={openSettings}
            variant="ghost"
          />
        </View>
      ) : null}
    </Card>
  );
}

function ActiveSessionHero({
  nowMs,
  session,
  styles,
}: {
  nowMs: number;
  session: ParkingSession;
  styles: SessionStyles;
}) {
  const isSimulation = session.deliveryMode === 'simulation';
  const elapsed = getParkingSessionElapsedDisplay(session, nowMs);

  return (
    <Card elevated padding="regular">
      <View style={styles.activeStatusRow}>
        <StatusBadge label="PARKING ACTIVE" tone="success" />
        {isSimulation ? (
          <StatusBadge label="DEVELOPMENT MODE" tone="development" />
        ) : null}
      </View>
      <View style={styles.activeContext}>
        <View style={styles.activeFact}>
          <Text style={styles.activeFactLabel}>Zone</Text>
          <Text style={styles.activeFactValue}>{session.zoneCode}</Text>
        </View>
        <View style={styles.activeFact}>
          <Text style={styles.activeFactLabel}>Vehicle</Text>
          <Text style={styles.activeFactValue}>{session.plate}</Text>
        </View>
      </View>
      <View style={styles.activeDivider} />
      <Text style={styles.elapsedLabel}>Elapsed time</Text>
      <Text
        accessibilityLabel={`Elapsed time ${elapsed}`}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        numberOfLines={1}
        style={styles.elapsedValue}
      >
        {elapsed}
      </Text>
      <View style={styles.activeDivider} />
      <View style={styles.activeStarted}>
        <Text style={styles.activeFactLabel}>Started</Text>
        <Text style={styles.activeStartedValue}>
          {formatClockTime(session.startedAt)}
        </Text>
      </View>
      {isSimulation ? (
        <Text style={styles.activeSimulationText}>
          Simulated test session. {session.zoneCode} is not an official Bitola
          parking zone, and no SMS was opened or sent.
        </Text>
      ) : null}
    </Card>
  );
}

export function ParkingSessionScreen() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
          <StateIntro
            badge="PREPARING"
            badgeTone="accent"
            description={
              showSimulation
                ? 'Prepare this development simulation. Nothing will be sent.'
                : 'Open the native SMS composer to prepare the parking request. Returning to the app does not confirm operator acceptance.'
            }
            styles={styles}
            title="Prepare parking request"
          />
          <SessionSnapshot
            includeRequest
            session={session}
            styles={styles}
          />
          {operationError ? (
            <ErrorNotice message={operationError} styles={styles} />
          ) : null}
          <View style={styles.actions}>
            <AppButton
              label={
                operationError
                  ? 'Try start request again'
                  : showSimulation
                    ? 'Prepare simulated request'
                    : 'Open SMS composer'
              }
              leadingIcon={showSimulation ? 'shield' : 'sms'}
              loading={isProcessing}
              onPress={() => void prepareStartRequest()}
            />
            <AppButton
              disabled={isProcessing}
              label="Cancel"
              leadingIcon="close"
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
          <StateIntro
            badge="CONFIRMATION NEEDED"
            badgeTone="warning"
            description={
              showSimulation
                ? 'The simulated request is prepared. Confirm it manually to activate this development session.'
                : 'The parking SMS is prepared, but parking is not active yet. Confirm only after you receive an activation response from ЈП Паркинзи.'
            }
            styles={styles}
            title={
              showSimulation
                ? 'Simulated request prepared'
                : 'Parking SMS prepared'
            }
          />
          <SessionSnapshot session={session} styles={styles} />
          <Card padding="compact" tone="warning">
            <Text style={styles.noticeTitle}>Not active yet</Text>
            <Text style={styles.noticeText}>
              Closing the SMS composer alone does not confirm that the operator
              accepted the request.
            </Text>
          </Card>
          {operationError ? (
            <ErrorNotice message={operationError} styles={styles} />
          ) : null}
          <View style={styles.actions}>
            <AppButton
              label={
                showSimulation
                  ? 'Confirm simulated start'
                  : 'Confirm parking started'
              }
              leadingIcon="check"
              onPress={() =>
                runTransition(
                  confirmSessionManually,
                  'The parking session could not be confirmed.',
                )
              }
            />
            <AppButton
              label="Cancel"
              leadingIcon="close"
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
          <ActiveSessionHero
            nowMs={nowMs}
            session={session}
            styles={styles}
          />
          <ParkingReminderCard
            session={session}
            styles={styles}
            theme={theme}
          />
          {operationError ? (
            <ErrorNotice message={operationError} styles={styles} />
          ) : null}
          <View style={styles.actions}>
            <AppButton
              accessibilityHint="Prepares a stop request using the saved parking session. GPS is not required."
              label="Stop parking"
              leadingIcon="stop"
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
          <StateIntro
            badge="PREPARING STOP"
            badgeTone="warning"
            description={
              showSimulation
                ? 'Preparing a simulated stop. This does not use SMS or GPS.'
                : 'Preparing the stop from the saved session details. A current GPS fix is not required.'
            }
            styles={styles}
            title="Stopping parking"
          />
          <SessionSnapshot session={session} styles={styles} />
          {isProcessing ? (
            <Card padding="compact" tone="accent">
              <View
                accessibilityLiveRegion="polite"
                style={styles.processingRow}
              >
                <ActivityIndicator color={theme.colors.accent} />
                <View style={styles.processingCopy}>
                  <Text style={styles.processingTitle}>
                    Preparing stop request
                  </Text>
                  <Text style={styles.processingText}>
                    Keep this screen open for a moment.
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}
          {operationError ? (
            <ErrorNotice message={operationError} styles={styles} />
          ) : null}
          <View style={styles.actions}>
            {!isProcessing ? (
              <AppButton
                label="Try stop request again"
                leadingIcon="refresh"
                onPress={() => void prepareStopRequest()}
              />
            ) : null}
            <AppButton
              disabled={isProcessing}
              label="Return to active parking"
              leadingIcon="back"
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
          <StateIntro
            badge="NOT STOPPED YET"
            badgeTone="warning"
            description={
              showSimulation
                ? 'The simulated stop is prepared. Confirm it manually to complete this development session.'
                : 'The stop SMS is prepared, but parking may still be active. Confirm only after you receive a stop response from ЈП Паркинзи.'
            }
            styles={styles}
            title={
              showSimulation ? 'Simulated stop prepared' : 'Stop SMS prepared'
            }
          />
          <SessionSnapshot session={session} styles={styles} />
          <Card padding="compact" tone="warning">
            <Text style={styles.noticeTitle}>Waiting for confirmation</Text>
            <Text style={styles.noticeText}>
              Closing the SMS composer alone does not prove that parking has
              stopped.
            </Text>
          </Card>
          {operationError ? (
            <ErrorNotice message={operationError} styles={styles} />
          ) : null}
          <View style={styles.actions}>
            <AppButton
              label={
                showSimulation
                  ? 'Confirm simulated stop'
                  : 'Confirm parking stopped'
              }
              leadingIcon="check"
              onPress={() =>
                runTransition(
                  completeSessionManually,
                  'The parking session could not be completed.',
                )
              }
            />
            <AppButton
              label="Return to active parking"
              leadingIcon="back"
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

    case 'completed':
      body = (
        <>
          <StateIntro
            badge="SESSION COMPLETE"
            badgeTone="success"
            description={
              showSimulation
                ? 'This simulated development session is complete.'
                : 'This parking session has been marked complete on this device.'
            }
            styles={styles}
            title="Parking completed"
          />
          <Card padding="none" tone="success">
            <InfoRow
              icon="parking"
              label="Zone"
              value={session.zoneCode}
            />
            <View style={styles.divider} />
            <InfoRow icon="car" label="Vehicle" value={session.plate} />
            <View style={styles.divider} />
            <InfoRow
              icon="clock"
              label="Started"
              value={formatClockTime(session.startedAt)}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="success"
              label="Stopped"
              tone="success"
              value={formatClockTime(session.stoppedAt)}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="timer"
              label="Duration"
              value={getParkingSessionElapsedDisplay(session, nowMs)}
            />
          </Card>
          {operationError ? (
            <ErrorNotice message={operationError} styles={styles} />
          ) : null}
          <View style={styles.actions}>
            <AppButton
              label="Done"
              leadingIcon="check"
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

    case 'failed':
      body = (
        <>
          <StateIntro
            badge="REQUEST FAILED"
            badgeTone="danger"
            description="No parking state was confirmed. Clear this request to return home."
            styles={styles}
            title="Parking request failed"
          />
          <SessionSnapshot session={session} styles={styles} />
          {operationError ? (
            <ErrorNotice message={operationError} styles={styles} />
          ) : null}
          <View style={styles.actions}>
            <AppButton
              label="Return home"
              leadingIcon="back"
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
      style={styles.scroll}
    >
      <View
        style={[
          styles.content,
          width <= 340 ? styles.contentCompact : null,
        ]}
      >
        <AppHeader
          subtitle="Parking session"
          title="Parking Bitola"
          variant="product"
        />
        {showSimulation && session.status !== 'active' ? (
          <SimulationBanner session={session} styles={styles} />
        ) : null}
        {body}
      </View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    scroll: {
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      alignSelf: 'center',
      gap: theme.spacing.lg,
      maxWidth: theme.layout.maxContentWidth,
      paddingBottom: theme.spacing.xxxl,
      paddingHorizontal: theme.layout.screenPadding,
      paddingTop: theme.spacing.md,
      width: '100%',
    },
    contentCompact: {
      paddingHorizontal: theme.layout.compactScreenPadding,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginHorizontal: theme.spacing.md,
    },
    infoRow: {
      justifyContent: 'center',
      minHeight: theme.touchTargets.comfortable,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    simulationHeading: {
      alignItems: 'flex-start',
    },
    simulationTitle: {
      ...theme.typography.heading,
      color: theme.colors.developmentText,
      marginTop: theme.spacing.sm,
    },
    simulationText: {
      ...theme.typography.caption,
      color: theme.colors.developmentText,
      marginTop: theme.spacing.xxs,
    },
    stateIntro: {
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
    },
    badgeRow: {
      alignItems: 'flex-start',
    },
    stateTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.text,
    },
    stateDescription: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    noticeTitle: {
      ...theme.typography.label,
      color: theme.colors.warningText,
    },
    noticeText: {
      ...theme.typography.caption,
      color: theme.colors.warningText,
      marginTop: theme.spacing.xxs,
    },
    errorTitle: {
      ...theme.typography.label,
      color: theme.colors.dangerText,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.dangerText,
      marginTop: theme.spacing.xxs,
    },
    actions: {
      gap: theme.spacing.xs,
    },
    activeStatusRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    activeContext: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
      marginTop: theme.spacing.lg,
    },
    elapsedLabel: {
      ...theme.typography.overline,
      color: theme.colors.successText,
    },
    elapsedValue: {
      ...theme.typography.number,
      alignSelf: 'stretch',
      color: theme.colors.successText,
      flexShrink: 1,
      marginTop: theme.spacing.xxs,
      minWidth: 0,
    },
    activeDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginVertical: theme.spacing.md,
    },
    activeFact: {
      flex: 1,
      minWidth: 0,
    },
    activeFactLabel: {
      ...theme.typography.overline,
      color: theme.colors.successText,
    },
    activeFactValue: {
      ...theme.typography.heading,
      color: theme.colors.text,
      flexShrink: 1,
      marginTop: theme.spacing.xxs,
    },
    activeStarted: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    activeStartedValue: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
    },
    activeSimulationText: {
      ...theme.typography.caption,
      color: theme.colors.developmentText,
      marginTop: theme.spacing.md,
    },
    reminderHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    reminderHeadingGroup: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      flexGrow: 1,
      gap: theme.spacing.xs,
      minWidth: 0,
    },
    reminderTitle: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    reminderStatusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    reminderReason: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    reminderAction: {
      marginTop: theme.spacing.sm,
    },
    processingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    processingCopy: {
      flex: 1,
      minWidth: 0,
    },
    processingTitle: {
      ...theme.typography.label,
      color: theme.colors.accentText,
    },
    processingText: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
  });
}
