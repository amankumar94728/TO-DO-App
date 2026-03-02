import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { AppDispatch } from '../store';
import { createTask } from '../store/tasks.slice';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { PrioritySelector } from '../components/PrioritySelector';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Priority } from '../api/tasks.api';

export function AddTaskScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dateTime, setDateTime] = useState<Date | undefined>(undefined);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [showPicker, setShowPicker] = useState<'dateTime' | 'deadline' | null>(null);
  const [titleError, setTitleError] = useState('');

  function formatDate(date?: Date): string {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    setIsSubmitting(true);

    const result = await dispatch(
      createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        priority,
        dateTime: dateTime?.toISOString(),
        deadline: deadline?.toISOString(),
      }),
    );

    setIsSubmitting(false);

    if (createTask.fulfilled.match(result)) {
      setTitle('');
      setDescription('');
      setCategory('');
      setPriority('medium');
      setDateTime(undefined);
      setDeadline(undefined);
      navigation.navigate('Tasks' as never);
    } else {
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>New Task</Text>

        <AppInput
          label="Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="What needs to be done?"
          error={titleError}
        />

        <AppInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Add details (optional)"
          multiline
          numberOfLines={3}
        />

        <AppInput
          label="Category / Tag"
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. work, personal"
          autoCapitalize="none"
        />

        {/* Priority selection */}
        <Text style={styles.sectionLabel}>Priority</Text>
        <PrioritySelector value={priority} onChange={setPriority} />

        {/* Task date/time picker */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>
          Task Date & Time
        </Text>
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setShowPicker('dateTime')}
        >
          <Icon name="clock" size={16} color={Colors.textSecondary} />
          <Text style={styles.dateText}>{formatDate(dateTime)}</Text>
        </TouchableOpacity>

        {/* Deadline picker */}
        <Text style={styles.sectionLabel}>Deadline</Text>
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setShowPicker('deadline')}
        >
          <Icon name="flag" size={16} color={Colors.textSecondary} />
          <Text style={styles.dateText}>{formatDate(deadline)}</Text>
        </TouchableOpacity>

        {/* Native date/time picker — conditionally rendered */}
        {showPicker ? (
          <DateTimePicker
            value={
              showPicker === 'dateTime'
                ? dateTime ?? new Date()
                : deadline ?? new Date()
            }
            mode="datetime"
            display="default"
            onChange={(_, selected) => {
              // On Android, pressing Cancel fires onChange with selected = undefined
              // Guard against this to avoid clearing a previously set date
              if (selected !== undefined) {
                if (showPicker === 'dateTime') setDateTime(selected);
                else setDeadline(selected);
              }
              setShowPicker(null);
            }}
          />
        ) : null}

        <AppButton
          label="Add Task"
          onPress={handleSubmit}
          isLoading={isSubmitting}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingTop: Spacing.xl },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: { ...Typography.body, color: Colors.textPrimary },
});
