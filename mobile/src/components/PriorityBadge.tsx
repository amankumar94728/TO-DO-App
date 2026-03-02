import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography } from '../theme';
import { Priority } from '../api/tasks.api';

interface PriorityBadgeProps {
  priority: Priority;
}

/** Colored pill badge showing task priority level */
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = Colors.priority[priority];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '22', borderColor: color },
      ]}
    >
      <Text style={[styles.text, { color }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  text: { ...Typography.caption, fontWeight: '600' },
});
