import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { tasksApi, Task, CreateTaskData, UpdateTaskData } from '../api/tasks.api';

type FilterStatus = 'all' | 'active' | 'completed';
type SortMode = 'smart' | 'deadline' | 'priority';

interface TaskFilters {
  status: FilterStatus;
  sort: SortMode;
  category: string;
}

interface TasksState {
  items: Task[];
  filters: TaskFilters;
  isLoading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  filters: { status: 'all', sort: 'smart', category: '' },
  isLoading: false,
  error: null,
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async (filters: Partial<TaskFilters>, { rejectWithValue }) => {
    try {
      const { data } = await tasksApi.getAll(filters);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to load tasks');
    }
  },
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (data: CreateTaskData, { rejectWithValue }) => {
    try {
      const { data: task } = await tasksApi.create(data);
      return task;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to create task');
    }
  },
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, data }: { id: string; data: UpdateTaskData }, { rejectWithValue }) => {
    try {
      const { data: task } = await tasksApi.update(id, data);
      return task;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to update task');
    }
  },
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await tasksApi.delete(id);
      return id; // Return the id so the slice can remove it from state
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to delete task');
    }
  },
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<TaskFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchTasks.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create — prepend to list so new task appears at top
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      // Update — replace the matching item in place
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.items.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      // Delete — filter the item out
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
      });
  },
});

export const { setFilters, clearError } = tasksSlice.actions;
export default tasksSlice.reducer;
