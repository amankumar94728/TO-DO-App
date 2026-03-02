import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { AppDispatch, RootState } from '../store';
import { fetchTasks, updateTask, deleteTask, setFilters } from '../store/tasks.slice';
import { TaskCard } from '../components/TaskCard';
import { FilterTabs } from '../components/FilterTabs';
import { EmptyState } from '../components/EmptyState';
import { Colors, Typography, Spacing } from '../theme';
import { Task } from '../api/tasks.api';
import { TasksStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TaskList'>;

export function TaskListScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<Nav>();
  const { items, filters, isLoading } = useSelector(
    (state: RootState) => state.tasks,
  );

  /** Reload task list whenever filters change */
  useEffect(() => {
    dispatch(fetchTasks(filters));
  }, [filters, dispatch]);

  const handleToggleComplete = useCallback(
    (task: Task) => {
      dispatch(updateTask({ id: task._id, data: { isCompleted: !task.isCompleted } }));
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (task: Task) => {
      dispatch(deleteTask(task._id));
    },
    [dispatch],
  );

  const handlePress = useCallback(
    (task: Task) => {
      navigation.push('TaskDetail', { taskId: task._id });
    },
    [navigation],
  );

  /** Cycle through sort modes: smart → deadline → priority → smart */
  function cycleSortMode() {
    const next =
      filters.sort === 'smart'
        ? 'deadline'
        : filters.sort === 'deadline'
        ? 'priority'
        : 'smart';
    dispatch(setFilters({ sort: next }));
  }

  return (
    <View style={styles.container}>
      {/* Screen header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Tasks</Text>
        <TouchableOpacity onPress={cycleSortMode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="sliders" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Status filter tabs */}
      <FilterTabs
        value={filters.status}
        onChange={(status) => dispatch(setFilters({ status }))}
      />

      {/* Task list */}
      {isLoading && items.length === 0 ? (
        <ActivityIndicator
          color={Colors.primary}
          style={{ marginTop: Spacing.xl }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDelete}
              onPress={handlePress}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={
            items.length === 0 ? styles.emptyList : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => dispatch(fetchTasks(filters))}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  screenTitle: { ...Typography.h2, color: Colors.textPrimary },
  list: { paddingTop: Spacing.xs, paddingBottom: 80 },
  emptyList: { flex: 1 },
});
