import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { logoutUser } from '../store/auth.slice';
import { AppButton } from '../components/AppButton';
import { tasksApi, TaskStats } from '../api/tasks.api';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

export function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [stats, setStats] = useState<TaskStats | null>(null);

  useEffect(() => {
    // Fetch task stats when profile screen mounts
    tasksApi
      .getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {
        // Stats are non-critical — fail silently
      });
  }, []);

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => dispatch(logoutUser()),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* User email card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Email</Text>
        <Text style={styles.cardValue}>{user?.email || '—'}</Text>
      </View>

      {/* Task count stats */}
      {stats ? (
        <View style={styles.statsRow}>
          <StatChip label="Total" value={stats.total} color={Colors.primary} />
          <StatChip label="Done" value={stats.completed} color={Colors.success} />
          <StatChip label="Pending" value={stats.pending} color={Colors.warning} />
        </View>
      ) : null}

      <AppButton
        label="Sign Out"
        variant="danger"
        onPress={handleLogout}
        style={{ marginTop: Spacing.xl }}
      />
    </View>
  );
}

/** Small colored stat card used in the stats row */
function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statChip, { borderColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardValue: { ...Typography.body, color: Colors.textPrimary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { ...Typography.h2 },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
