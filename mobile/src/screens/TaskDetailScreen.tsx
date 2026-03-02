import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { AppDispatch, RootState } from '../store';
import { updateTask, deleteTask } from '../store/tasks.slice';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { PrioritySelector } from '../components/PrioritySelector';
import { PriorityBadge } from '../components/PriorityBadge';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { TasksStackParamList } from '../navigation/types';
import { Priority } from '../api/tasks.api';

type Route = RouteProp<TasksStackParamList, 'TaskDetail'>;

export function TaskDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

  const task = useSelector((state: RootState) =>
    state.tasks.items.find((t) => t._id === route.params.taskId),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');

  if (!task) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Task not found</Text>
      </View>
    );
  }

  async function handleSave() {
    await dispatch(updateTask({ id: task!._id, data: { title, description, priority } }));
    setIsEditing(false);
  }

  async function handleDelete() {
    Alert.alert('Delete Task', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deleteTask(task!._id));
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleToggleComplete() {
    await dispatch(
      updateTask({ id: task!._id, data: { isCompleted: !task!.isCompleted } }),
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header: back button + edit/delete actions */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setIsEditing((prev) => !prev)}
            style={styles.headerBtn}
          >
            <Icon
              name={isEditing ? 'x' : 'edit-2'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Icon name="trash-2" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {isEditing ? (
        /* Edit mode */
        <>
          <AppInput
            label="Title"
            value={title}
            onChangeText={setTitle}
          />
          <AppInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.sectionLabel}>Priority</Text>
          <PrioritySelector value={priority} onChange={setPriority} />
          <AppButton
            label="Save Changes"
            onPress={handleSave}
            style={{ marginTop: Spacing.lg }}
          />
        </>
      ) : (
        /* View mode */
        <>
          <Text
            style={[
              styles.taskTitle,
              task.isCompleted && styles.completedTitle,
            ]}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text style={styles.taskDescription}>{task.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <PriorityBadge priority={task.priority} />
            {task.category ? (
              <Text style={styles.category}>#{task.category}</Text>
            ) : null}
          </View>

          {task.deadline ? (
            <View style={styles.infoRow}>
              <Icon name="flag" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {' '}Deadline:{' '}
                {new Date(task.deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : null}

          {task.dateTime ? (
            <View style={styles.infoRow}>
              <Icon name="clock" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {' '}{new Date(task.dateTime).toLocaleString()}
              </Text>
            </View>
          ) : null}

          <AppButton
            label={task.isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
            onPress={handleToggleComplete}
            variant={task.isCompleted ? 'ghost' : 'primary'}
            style={{ marginTop: Spacing.xl }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: { padding: 4 },
  taskTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  completedTitle: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  taskDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  category: { ...Typography.caption, color: Colors.primary },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoText: { ...Typography.caption, color: Colors.textSecondary },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { ...Typography.body, color: Colors.textSecondary },
});
