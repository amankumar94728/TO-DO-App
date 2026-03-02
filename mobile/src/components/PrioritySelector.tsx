import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography, Spacing } from '../theme';
import { Priority } from '../api/tasks.api';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

/** Row of three pill buttons for selecting task priority */
export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <View style={styles.row}>
      {PRIORITIES.map((p) => {
        const isSelected = value === p;
        const color = Colors.priority[p];
        return (
          <TouchableOpacity
            key={p}
            style={[
              styles.pill,
              { borderColor: color },
              isSelected ? { backgroundColor: color } : null,
            ]}
            onPress={() => onChange(p)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.pillText,
                { color: isSelected ? '#fff' : color },
              ]}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  pillText: { ...Typography.label, fontWeight: '600' },
});
