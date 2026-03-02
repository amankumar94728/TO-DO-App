import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors, Typography, Spacing } from '../theme';

/** Shown when the task list is empty */
export function EmptyState() {
  return (
    <View style={styles.container}>
      <Icon name="clipboard" size={64} color={Colors.textSecondary} />
      <Text style={styles.title}>No tasks yet</Text>
      <Text style={styles.subtitle}>
        Tap the + tab to add your first task
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    ...Typography.h3,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    opacity: 0.6,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
