import { IsString, IsOptional, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  @IsString()
  @IsOptional()
  category?: string;
}
