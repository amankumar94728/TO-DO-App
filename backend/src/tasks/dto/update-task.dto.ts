import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => value ?? undefined)
  dateTime?: string | null;

  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => value ?? undefined)
  deadline?: string | null;

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
