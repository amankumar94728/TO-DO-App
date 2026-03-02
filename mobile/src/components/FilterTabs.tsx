import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

type FilterStatus = 'all' | 'active' | 'completed';

const TABS: FilterStatus[] = ['all', 'active', 'completed'];

interface FilterTabsProps {
  value: FilterStatus;
  onChange: (status: FilterStatus) => void;
}

/** Segmented control for filtering tasks by status */
export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = value === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onChange(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { ...Typography.label, color: Colors.textSecondary },
  activeTabText: { color: Colors.textPrimary, fontWeight: '600' },
});
