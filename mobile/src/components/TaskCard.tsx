import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors, BorderRadius, Typography, Spacing } from '../theme';
import { Task } from '../api/tasks.api';
import { PriorityBadge } from './PriorityBadge';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onPress: (task: Task) => void;
}

export function TaskCard({ task, onToggleComplete, onDelete, onPress }: TaskCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const priorityColor = Colors.priority[task.priority];

  /** Swipe left to reveal delete — threshold is 80px */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task?',
            [
              {
                text: 'Cancel',
                onPress: () =>
                  Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                  }).start(),
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  // Reset card position before deleting — if delete fails, card is still visible
                  Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                  }).start();
                  onDelete(task);
                },
              },
            ],
          );
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const isOverdue =
    task.deadline && !task.isCompleted && new Date(task.deadline) < new Date();

  return (
    <Animated.View
      style={[styles.card, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {/* Left border color indicates priority */}
      <View style={[styles.priorityStripe, { backgroundColor: priorityColor }]} />

      <TouchableOpacity
        style={styles.content}
        onPress={() => onPress(task)}
        activeOpacity={0.8}
      >
        {/* Complete/incomplete toggle */}
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onToggleComplete(task)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            name={task.isCompleted ? 'check-circle' : 'circle'}
            size={22}
            color={task.isCompleted ? Colors.success : Colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.textBlock}>
          <Text
            style={[styles.title, task.isCompleted && styles.completedTitle]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {task.description}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <PriorityBadge priority={task.priority} />
            {formattedDeadline ? (
              <View style={styles.deadlineChip}>
                <Icon
                  name="calendar"
                  size={11}
                  color={isOverdue ? Colors.error : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.deadlineText,
                    isOverdue ? { color: Colors.error } : null,
                  ]}
                >
                  {' '}
                  {formattedDeadline}
                </Text>
              </View>
            ) : null}
            {task.category ? (
              <Text style={styles.categoryTag}>#{task.category}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  priorityStripe: { width: 4 },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
  },
  checkbox: { marginRight: Spacing.sm },
  textBlock: { flex: 1 },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
    opacity: 0.6,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  deadlineChip: { flexDirection: 'row', alignItems: 'center' },
  deadlineText: { ...Typography.caption, color: Colors.textSecondary },
  categoryTag: { ...Typography.caption, color: Colors.primary },
});
