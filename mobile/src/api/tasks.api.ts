import { apiClient } from './client';

export type Priority = 'low' | 'medium' | 'high';

/** Shape of a task returned from the backend */
export interface Task {
  _id: string;
  title: string;
  description: string;
  dateTime?: string;
  deadline?: string;
  priority: Priority;
  category: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Data sent when creating a new task */
export interface CreateTaskData {
  title: string;
  description?: string;
  dateTime?: string;
  deadline?: string;
  priority?: Priority;
  category?: string;
}

/** Data sent when updating a task — all fields optional */
export interface UpdateTaskData extends Partial<CreateTaskData> {
  isCompleted?: boolean;
}

/** Task count summary for the profile screen */
export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
}

/** Typed wrappers around the /tasks endpoints */
export const tasksApi = {
  getAll: (params?: { status?: string; sort?: string; category?: string }) =>
    apiClient.get<Task[]>('/tasks', { params }),

  create: (data: CreateTaskData) =>
    apiClient.post<Task>('/tasks', data),

  update: (id: string, data: UpdateTaskData) =>
    apiClient.patch<Task>(`/tasks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/tasks/${id}`),

  getStats: () =>
    apiClient.get<TaskStats>('/tasks/stats'),
};
