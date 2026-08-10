import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '../components';
import { useVehicleStore } from '../stores/vehicleStore';
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
          <Pressable
            accessibilityHint="Returns to the parking overview"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Manage vehicles</Text>
            <Text style={styles.subtitle}>
              Vehicle profiles are stored locally on this device.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              {editingId ? 'Edit vehicle' : 'Add a vehicle'}
            </Text>

            <Text style={styles.inputLabel}>Plate</Text>
            <TextInput
              accessibilityLabel="Vehicle plate"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={hasHydrated}
              maxLength={18}
              onChangeText={(value) => {
                setPlate(value);
                setFormError(null);
              }}
              placeholder="BT7713AD"
              placeholderTextColor="#8A9AA9"
              returnKeyType="next"
              style={styles.input}
              value={plate}
            />
            <Text style={styles.inputHelp}>
              Spaces and hyphens are removed automatically.
            </Text>

            <Text style={[styles.inputLabel, styles.nicknameLabel]}>
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
              placeholderTextColor="#8A9AA9"
              returnKeyType="done"
              style={styles.input}
              value={nickname}
            />

            {formError ? (
              <Text accessibilityRole="alert" style={styles.formError}>
                {formError}
              </Text>
            ) : null}

            <View style={styles.formActions}>
              <View style={styles.formActionPrimary}>
                <AppButton
                  disabled={!hasHydrated}
                  label={editingId ? 'Save changes' : 'Add vehicle'}
                  onPress={handleSubmit}
                />
              </View>
              {editingId ? (
                <View style={styles.formActionSecondary}>
                  <AppButton
                    label="Cancel"
                    onPress={resetForm}
                    variant="ghost"
                  />
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Your vehicles</Text>
            <Text style={styles.count}>{vehicles.length}</Text>
          </View>

          {!hasHydrated ? (
            <Text style={styles.emptyText}>Loading saved vehicles…</Text>
          ) : vehicles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No vehicles yet</Text>
              <Text style={styles.emptyText}>
                Add a plate above. The first vehicle becomes the default.
              </Text>
            </View>
          ) : (
            <View style={styles.vehicleList}>
              {vehicles.map((vehicle) => (
                <View key={vehicle.id} style={styles.vehicleCard}>
                  <View style={styles.vehicleHeading}>
                    <View style={styles.vehicleIdentity}>
                      <Text style={styles.plate}>{vehicle.plate}</Text>
                      {vehicle.nickname ? (
                        <Text style={styles.nickname}>{vehicle.nickname}</Text>
                      ) : null}
                    </View>
                    {vehicle.isDefault ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.vehicleActions}>
                    {!vehicle.isDefault ? (
                      <VehicleAction
                        accessibilityLabel={`Set ${vehicle.plate} as default vehicle`}
                        label="Set default"
                        onPress={() => handleSetDefault(vehicle)}
                      />
                    ) : null}
                    <VehicleAction
                      accessibilityLabel={`Edit ${vehicle.plate}`}
                      label="Edit"
                      onPress={() => handleEdit(vehicle)}
                    />
                    <VehicleAction
                      accessibilityLabel={`Delete ${vehicle.plate}`}
                      danger
                      label="Delete"
                      onPress={() => handleDelete(vehicle)}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type VehicleActionProps = {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

function VehicleAction({
  accessibilityLabel,
  label,
  onPress,
  danger = false,
}: VehicleActionProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.vehicleAction,
        danger && styles.vehicleActionDanger,
        pressed && styles.vehicleActionPressed,
      ]}
    >
      <Text
        style={[
          styles.vehicleActionText,
          danger && styles.vehicleActionTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 680,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 14,
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    marginBottom: 16,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backButtonPressed: {
    backgroundColor: '#E7EEF5',
  },
  backButtonText: {
    color: '#194F82',
    fontSize: 16,
    fontWeight: '800',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#132E47',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#52697F',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 16,
    borderWidth: 1,
    padding: 17,
  },
  sectionTitle: {
    color: '#17324D',
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#344C62',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 18,
  },
  nicknameLabel: {
    marginTop: 15,
  },
  optional: {
    color: '#718294',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9FBFC',
    borderColor: '#B8C7D4',
    borderRadius: 12,
    borderWidth: 1,
    color: '#132E47',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputHelp: {
    color: '#718294',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  formError: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 12,
  },
  formActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  formActionPrimary: {
    flex: 1,
  },
  formActionSecondary: {
    minWidth: 88,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 11,
    marginTop: 26,
  },
  count: {
    backgroundColor: '#DDE9F2',
    borderRadius: 12,
    color: '#355A79',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 24,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    textAlign: 'center',
  },
  vehicleList: {
    gap: 10,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 15,
    borderWidth: 1,
    padding: 16,
  },
  vehicleHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  vehicleIdentity: {
    flex: 1,
  },
  plate: {
    color: '#132E47',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nickname: {
    color: '#607487',
    fontSize: 14,
    marginTop: 3,
  },
  defaultBadge: {
    backgroundColor: '#DDF3E9',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  defaultBadgeText: {
    color: '#176B49',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  vehicleActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  vehicleAction: {
    backgroundColor: '#F1F6FA',
    borderColor: '#D3E0E9',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  vehicleActionDanger: {
    backgroundColor: '#FFF5F4',
    borderColor: '#F6C7C3',
  },
  vehicleActionPressed: {
    opacity: 0.65,
  },
  vehicleActionText: {
    color: '#24577F',
    fontSize: 13,
    fontWeight: '800',
  },
  vehicleActionTextDanger: {
    color: '#B42318',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5EC',
    borderRadius: 15,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: {
    color: '#17324D',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    color: '#607487',
    fontSize: 14,
    lineHeight: 20,
  },
});
