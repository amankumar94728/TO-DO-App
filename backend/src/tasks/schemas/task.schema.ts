import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export type Priority = 'low' | 'medium' | 'high';

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop()
  dateTime: Date;

  @Prop()
  deadline: Date;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: Priority;

  @Prop({ default: '' })
  category: string;

  @Prop({ default: false })
  isCompleted: boolean;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
