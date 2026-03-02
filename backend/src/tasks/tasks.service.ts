import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, Priority } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Weight map for the smart sort score calculation
const PRIORITY_WEIGHTS: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Compute urgency score: higher = more urgent. Overdue tasks get Infinity. */
function computeUrgencyScore(task: TaskDocument): number {
  // Default to medium weight if priority is somehow invalid
  const weight = PRIORITY_WEIGHTS[task.priority] ?? PRIORITY_WEIGHTS.medium;
  if (!task.deadline) {
    // No deadline: rank by priority weight only, below all tasks with deadlines
    return weight * 0.1;
  }
  const daysUntil = (task.deadline.getTime() - Date.now()) / 86_400_000;
  if (daysUntil < 0) return Infinity; // Overdue always sorted first
  return weight / Math.max(daysUntil, 0.1);
}

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  /** Create a new task owned by the authenticated user */
  async create(userId: string, dto: CreateTaskDto): Promise<TaskDocument> {
    const task = new this.taskModel({
      userId: new Types.ObjectId(userId),
      ...dto,
      dateTime: dto.dateTime ? new Date(dto.dateTime) : undefined,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });
    return task.save();
  }

  /** Get all tasks for user — supports status filter, sort mode, and category tag */
  async findAll(
    userId: string,
    status?: string,
    sort?: string,
    category?: string,
  ): Promise<TaskDocument[]> {
    const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

    if (status === 'active') query.isCompleted = false;
    else if (status === 'completed') query.isCompleted = true;

    if (category) query.category = category;

    let tasks = await this.taskModel.find(query).exec();

    if (sort === 'deadline') {
      tasks = tasks.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.getTime() - b.deadline.getTime();
      });
    } else if (sort === 'priority') {
      tasks = tasks.sort(
        (a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority],
      );
    } else {
      // Default: smart sort (priority × deadline urgency)
      tasks = tasks.sort((a, b) => computeUrgencyScore(b) - computeUrgencyScore(a));
    }

    return tasks;
  }

  /** Update a task — verifies ownership before applying changes */
  async update(userId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId.toString() !== userId) throw new ForbiddenException();

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.dateTime !== undefined) {
      updateData.dateTime = dto.dateTime ? new Date(dto.dateTime) : undefined;
    }
    if (dto.deadline !== undefined) {
      updateData.deadline = dto.deadline ? new Date(dto.deadline) : undefined;
    }
    Object.assign(task, updateData);
    return task.save();
  }

  /** Delete a task — verifies ownership before removing */
  async remove(userId: string, taskId: string): Promise<void> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId.toString() !== userId) throw new ForbiddenException();
    await task.deleteOne();
  }

  /** Get task count stats for the profile screen */
  async getStats(userId: string) {
    const total = await this.taskModel.countDocuments({ userId: new Types.ObjectId(userId) });
    const completed = await this.taskModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isCompleted: true,
    });
    return { total, completed, pending: total - completed };
  }
}
