import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

/** All routes require a valid JWT — @UseGuards applied at controller level */
@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  create(@Request() req: Express.Request & { user: { userId: string } }, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.userId, dto);
  }

  @Get()
  findAll(
    @Request() req: Express.Request & { user: { userId: string } },
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('category') category?: string,
  ) {
    return this.tasksService.findAll(req.user.userId, status, sort, category);
  }

  /** Must come before :id route to avoid being matched as a task id */
  @Get('stats')
  getStats(@Request() req: Express.Request & { user: { userId: string } }) {
    return this.tasksService.getStats(req.user.userId);
  }

  @Patch(':id')
  update(
    @Request() req: Express.Request & { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: Express.Request & { user: { userId: string } }, @Param('id') id: string) {
    return this.tasksService.remove(req.user.userId, id);
  }
}
