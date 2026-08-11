import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  AppButton,
  AppHeader,
  Card,
  EmptyState,
  StatusBadge,
} from '../components';
import { useVehicleStore } from '../stores/vehicleStore';
import { type AppTheme, useAppTheme } from '../theme';
import type { Vehicle } from '../types/vehicle';

type VehicleManagementScreenProps = {
  onBack: () => void;
};

export function VehicleManagementScreen({
  onBack,
}: VehicleManagementScreenProps) {
  const vehicles = useVehicleStore((state) => state.vehicles);
  const hasHydrated = useVehicleStore((state) => state.hasHydrated);
  const addVehicle = useVehicleStore((state) => state.addVehicle);
  const updateVehicle = useVehicleStore((state) => state.updateVehicle);
  const deleteVehicle = useVehicleStore((state) => state.deleteVehicle);
  const setDefaultVehicle = useVehicleStore(
    (state) => state.setDefaultVehicle,
  );
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(theme, isCompact),
    [isCompact, theme],
  );

  const [plate, setPlate] = useState('');
  const [nickname, setNickname] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setPlate('');
    setNickname('');
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = () => {
    if (!hasHydrated) {
      setFormError('Saved vehicles are still loading. Please try again.');
      return;
    }

    const result = editingId
      ? updateVehicle(editingId, { plate, nickname })
      : addVehicle({ plate, nickname });

    if (!result.success) {
      setFormError(result.error ?? 'Unable to save this vehicle.');
      return;
    }

    resetForm();
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setPlate(vehicle.plate);
    setNickname(vehicle.nickname ?? '');
    setFormError(null);
  };

  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert(
      'Delete vehicle?',
      `${vehicle.plate} will be removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteVehicle(vehicle.id);

            if (!result.success) {
              setFormError(result.error ?? 'Unable to delete this vehicle.');
              return;
            }

            if (editingId === vehicle.id) {
              resetForm();
            }
          },
        },
      ],
    );
  };

  const handleSetDefault = (vehicle: Vehicle) => {
    const result = setDefaultVehicle(vehicle.id);

    if (!result.success) {
      setFormError(result.error ?? 'Unable to select this vehicle.');
    } else {
      setFormError(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <AppHeader
            backLabel="Parking"
            onBack={onBack}
            subtitle="Keep the plate you park most often ready to use."
            title="Your vehicles"
            variant="back"
          />

          <Card elevated padding={isCompact ? 'compact' : 'regular'}>
            <View style={styles.formHeading}>
              <View style={styles.formHeadingCopy}>
                <Text style={styles.sectionTitle}>
                  {editingId ? 'Edit vehicle' : 'Add a vehicle'}
                </Text>
                <Text style={styles.sectionDetail}>
                  Stored privately on this device.
                </Text>
              </View>
              {editingId ? (
                <StatusBadge label="Editing" tone="accent" />
              ) : null}
            </View>

            <Text style={styles.inputLabel}>Registration plate</Text>
            <TextInput
              accessibilityLabel="Vehicle registration plate"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={hasHydrated}
              maxLength={18}
              onChangeText={(value) => {
                setPlate(value);
                setFormError(null);
              }}
              placeholder="BT7713AD"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="next"
              selectionColor={theme.colors.accent}
              style={[styles.input, styles.plateInput]}
              value={plate}
            />
            <Text style={styles.inputHelp}>
              Spaces and hyphens are removed when you save.
            </Text>

            <Text style={styles.inputLabel}>
              Nickname <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              accessibilityLabel="Vehicle nickname"
              autoCorrect={false}
              editable={hasHydrated}
              maxLength={40}
              onChangeText={(value) => {
                setNickname(value);
                setFormError(null);
              }}
              onSubmitEditing={handleSubmit}
              placeholder="Family car"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              selectionColor={theme.colors.accent}
              style={styles.input}
              value={nickname}
            />

            {formError ? (
              <View accessibilityRole="alert" style={styles.errorNotice}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.formActions}>
              <View style={styles.primaryFormAction}>
                <AppButton
                  disabled={!hasHydrated}
                  fullWidth
                  label={editingId ? 'Save changes' : 'Add vehicle'}
                  leadingIcon={editingId ? 'check' : 'add'}
                  onPress={handleSubmit}
                />
              </View>
              {editingId ? (
                <View style={styles.secondaryFormAction}>
                  <AppButton
                    fullWidth
                    label="Cancel"
                    leadingIcon="close"
                    onPress={resetForm}
                    variant="ghost"
                  />
                </View>
              ) : null}
            </View>
          </Card>

          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle}>Saved vehicles</Text>
            <StatusBadge
              label={`${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'}`}
              tone="neutral"
            />
          </View>

          {!hasHydrated ? (
            <Card padding="spacious">
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="progressbar"
                style={styles.loadingState}
              >
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.loadingText}>Loading saved vehicles…</Text>
              </View>
            </Card>
          ) : vehicles.length === 0 ? (
            <EmptyState
              description="Add a registration plate above. Your first vehicle becomes the default."
              icon="car"
              title="No vehicles saved"
            />
          ) : (
            <View style={styles.vehicleList}>
              {vehicles.map((vehicle) => (
                <Card
                  elevated={vehicle.isDefault}
                  key={vehicle.id}
                  padding={isCompact ? 'compact' : 'regular'}
                  tone={vehicle.isDefault ? 'accent' : 'default'}
                >
                  <View style={styles.vehicleHeading}>
                    <View style={styles.vehicleIdentity}>
                      <Text selectable style={styles.plate}>
                        {vehicle.plate}
                      </Text>
                      <Text style={styles.nickname}>
                        {vehicle.nickname ?? 'No nickname'}
                      </Text>
                    </View>
                    {vehicle.isDefault ? (
                      <StatusBadge label="Default" tone="success" />
                    ) : null}
                  </View>

                  <View style={styles.vehicleActions}>
                    {!vehicle.isDefault ? (
                      <View style={styles.vehicleAction}>
                        <AppButton
                          accessibilityLabel={`Set ${vehicle.plate} as default vehicle`}
                          compact
                          fullWidth
                          label="Set default"
                          leadingIcon="selected"
                          onPress={() => handleSetDefault(vehicle)}
                          variant="secondary"
                        />
                      </View>
                    ) : null}
                    <View style={styles.vehicleAction}>
                      <AppButton
                        accessibilityLabel={`Edit ${vehicle.plate}`}
                        compact
                        fullWidth
                        label="Edit"
                        leadingIcon="edit"
                        onPress={() => handleEdit(vehicle)}
                        variant="ghost"
                      />
                    </View>
                    <View style={styles.vehicleAction}>
                      <AppButton
                        accessibilityLabel={`Delete ${vehicle.plate}`}
                        compact
                        fullWidth
                        label="Delete"
                        leadingIcon="delete"
                        onPress={() => handleDelete(vehicle)}
                        variant="danger"
                      />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme, isCompact: boolean) {
  return StyleSheet.create({
    flex: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      alignSelf: 'center',
      gap: theme.spacing.lg,
      maxWidth: theme.layout.maxContentWidth,
      paddingBottom: theme.spacing.xxxl,
      paddingHorizontal: isCompact
        ? theme.layout.compactScreenPadding
        : theme.layout.screenPadding,
      paddingTop: theme.spacing.sm,
      width: '100%',
    },
    formHeading: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    formHeadingCopy: {
      flex: 1,
    },
    sectionTitle: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    sectionDetail: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    inputLabel: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.lg,
    },
    optional: {
      color: theme.colors.textMuted,
      fontWeight: '400',
    },
    input: {
      ...theme.typography.body,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      color: theme.colors.text,
      minHeight: theme.touchTargets.comfortable,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    plateInput: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    inputHelp: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },
    errorNotice: {
      backgroundColor: theme.colors.dangerSurface,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.dangerText,
    },
    formActions: {
      alignItems: 'stretch',
      flexDirection: isCompact ? 'column' : 'row',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.lg,
    },
    primaryFormAction: {
      flex: isCompact ? undefined : 1,
    },
    secondaryFormAction: {
      minWidth: isCompact ? undefined : 96,
    },
    listHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      justifyContent: 'space-between',
      marginTop: theme.spacing.xxs,
    },
    loadingState: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    vehicleList: {
      gap: theme.spacing.sm,
    },
    vehicleHeading: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    vehicleIdentity: {
      flex: 1,
      minWidth: 0,
    },
    plate: {
      color: theme.colors.text,
      fontSize: isCompact ? 21 : 23,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      letterSpacing: 1,
      lineHeight: isCompact ? 27 : 30,
    },
    nickname: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    vehicleActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.md,
    },
    vehicleAction: {
      flexGrow: 1,
      minWidth: isCompact ? 112 : 104,
    },
  });
}
