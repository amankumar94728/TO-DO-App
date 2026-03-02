# Todo App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack React Native todo app with JWT authentication (NestJS + MongoDB backend) and a dark-themed mobile UI.

**Architecture:** NestJS REST API handles auth (bcrypt + JWT) and task CRUD with MongoDB via Mongoose. React Native CLI frontend uses Redux Toolkit + RTK Query for state/data fetching and React Navigation v6 for routing. JWT stored in device secure keychain.

**Tech Stack:** NestJS, MongoDB/Mongoose, bcrypt, passport-jwt | React Native CLI (TypeScript), Redux Toolkit, RTK Query, React Navigation v6 (Stack + Bottom Tabs), react-native-keychain, @react-native-community/datetimepicker, react-native-vector-icons, axios

**Design Reference:** `docs/plans/2026-02-28-todo-app-design.md`

---

## PHASE 1: Backend — NestJS + MongoDB

### Task 1: Scaffold NestJS backend project

**Files:**
- Create: `backend/` (NestJS project root)

**Step 1: Scaffold project**

```bash
cd "D:/React_Native Apps/todo-app"
npx @nestjs/cli new backend --package-manager npm --skip-git
```

**Step 2: Install required dependencies**

```bash
cd backend
npm install @nestjs/mongoose mongoose @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
npm install -D @types/passport-jwt @types/bcrypt
```

**Step 3: Remove boilerplate app service/controller test (we'll write our own)**

Delete: `src/app.controller.spec.ts`

**Step 4: Verify the app starts**

```bash
npm run start:dev
```
Expected: NestJS starts on port 3000 with no errors.

**Step 5: Commit**

```bash
cd ..
git init
git add backend/
git commit -m "chore: scaffold NestJS backend"
```

---

### Task 2: Connect MongoDB and configure environment

**Files:**
- Create: `backend/.env`
- Modify: `backend/src/app.module.ts`

**Step 1: Create .env file**

```
MONGODB_URI=mongodb://localhost:27017/todoapp
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d
PORT=3000
```

**Step 2: Install dotenv config support**

```bash
cd backend
npm install @nestjs/config
```

**Step 3: Update app.module.ts to connect Mongo and load config**

Replace the contents of `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    // Load .env globally across all modules
    ConfigModule.forRoot({ isGlobal: true }),

    // Connect to MongoDB using URI from .env
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
  ],
})
export class AppModule {}
```

**Step 4: Make sure MongoDB is running locally, then restart the app**

```bash
npm run start:dev
```
Expected: "Connected to MongoDB" or similar Mongoose connection log. No errors.

**Step 5: Commit**

```bash
git add backend/src/app.module.ts backend/.env
git commit -m "chore: connect MongoDB and configure environment"
```

---

### Task 3: Create User schema and module

**Files:**
- Create: `backend/src/users/schemas/user.schema.ts`
- Create: `backend/src/users/users.module.ts`
- Create: `backend/src/users/users.service.ts`

**Step 1: Create user schema**

Create `backend/src/users/schemas/user.schema.ts`:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

**Step 2: Create users service**

Create `backend/src/users/users.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /** Find a user by email address (used during login) */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /** Create a new user with a pre-hashed password */
  async create(email: string, passwordHash: string): Promise<UserDocument> {
    const user = new this.userModel({ email: email.toLowerCase(), passwordHash });
    return user.save();
  }
}
```

**Step 3: Create users module**

Create `backend/src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersService],
  exports: [UsersService], // AuthModule will import this
})
export class UsersModule {}
```

**Step 4: Commit**

```bash
git add backend/src/users/
git commit -m "feat: add User schema and UsersService"
```

---

### Task 4: Implement JWT authentication (register + login)

**Files:**
- Create: `backend/src/auth/dto/register.dto.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`

**Step 1: Create DTOs for validation**

Create `backend/src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

Create `backend/src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

**Step 2: Create JWT strategy (validates the token on protected routes)**

Create `backend/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// This payload shape is what we sign into the JWT
export interface JwtPayload {
  sub: string;  // user MongoDB _id
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  /** Called after token signature verified — return value is injected as req.user */
  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

**Step 3: Create auth service**

Create `backend/src/auth/auth.service.ts`:

```typescript
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /** Register a new user — throws ConflictException if email already taken */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create(dto.email, passwordHash);

    const token = this.jwtService.sign({ sub: user._id, email: user.email });
    return { token, user: { id: user._id, email: user.email } };
  }

  /** Login — throws UnauthorizedException on bad credentials */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user._id, email: user.email });
    return { token, user: { id: user._id, email: user.email } };
  }
}
```

**Step 4: Create auth controller**

Create `backend/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

**Step 5: Create auth module**

Create `backend/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRY') },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

**Step 6: Register AuthModule in app.module.ts**

Update `backend/src/app.module.ts` imports array:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
```

**Step 7: Enable validation pipe globally in main.ts**

Update `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for React Native dev client
  app.enableCors();

  // Validate all incoming request bodies against DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

**Step 8: Test auth endpoints manually**

```bash
npm run start:dev

# In another terminal:
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: { "token": "...", "user": { "id": "...", "email": "test@example.com" } }

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: same shape as register response
```

**Step 9: Commit**

```bash
git add backend/src/auth/ backend/src/app.module.ts backend/src/main.ts
git commit -m "feat: implement JWT authentication (register + login)"
```

---

### Task 5: Create Task schema, service and guarded CRUD controller

**Files:**
- Create: `backend/src/tasks/schemas/task.schema.ts`
- Create: `backend/src/tasks/dto/create-task.dto.ts`
- Create: `backend/src/tasks/dto/update-task.dto.ts`
- Create: `backend/src/tasks/tasks.service.ts`
- Create: `backend/src/tasks/tasks.controller.ts`
- Create: `backend/src/tasks/tasks.module.ts`
- Modify: `backend/src/app.module.ts`

**Step 1: Create Task schema**

Create `backend/src/tasks/schemas/task.schema.ts`:

```typescript
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
```

**Step 2: Create DTOs**

Create `backend/src/tasks/dto/create-task.dto.ts`:

```typescript
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
```

Create `backend/src/tasks/dto/update-task.dto.ts`:

```typescript
import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

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

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
```

**Step 3: Create tasks service with smart sorting**

Create `backend/src/tasks/tasks.service.ts`:

```typescript
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
  if (!task.deadline) {
    // No deadline: sort by priority weight only
    return PRIORITY_WEIGHTS[task.priority] * 0.1;
  }
  const daysUntil = (task.deadline.getTime() - Date.now()) / 86_400_000;
  if (daysUntil < 0) return Infinity; // Overdue always first
  return PRIORITY_WEIGHTS[task.priority] / Math.max(daysUntil, 0.1);
}

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  /** Create a new task for the authenticated user */
  async create(userId: string, dto: CreateTaskDto): Promise<TaskDocument> {
    const task = new this.taskModel({
      userId: new Types.ObjectId(userId),
      ...dto,
      dateTime: dto.dateTime ? new Date(dto.dateTime) : undefined,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });
    return task.save();
  }

  /** Get all tasks for user, with optional status filter and sort */
  async findAll(
    userId: string,
    status?: string,
    sort?: string,
    category?: string,
  ): Promise<TaskDocument[]> {
    const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

    // Filter by completion status
    if (status === 'active') query.isCompleted = false;
    else if (status === 'completed') query.isCompleted = true;

    // Filter by category tag
    if (category) query.category = category;

    let tasks = await this.taskModel.find(query).exec();

    // Apply sort
    if (sort === 'smart' || !sort) {
      tasks = tasks.sort((a, b) => computeUrgencyScore(b) - computeUrgencyScore(a));
    } else if (sort === 'deadline') {
      tasks = tasks.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.getTime() - b.deadline.getTime();
      });
    } else if (sort === 'priority') {
      tasks = tasks.sort(
        (a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority],
      );
    }

    return tasks;
  }

  /** Update a task — verifies ownership before updating */
  async update(userId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId.toString() !== userId) throw new ForbiddenException();

    Object.assign(task, {
      ...dto,
      dateTime: dto.dateTime ? new Date(dto.dateTime) : task.dateTime,
      deadline: dto.deadline ? new Date(dto.deadline) : task.deadline,
    });
    return task.save();
  }

  /** Delete a task — verifies ownership before deleting */
  async remove(userId: string, taskId: string): Promise<void> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId.toString() !== userId) throw new ForbiddenException();
    await task.deleteOne();
  }

  /** Get task stats summary for the profile screen */
  async getStats(userId: string) {
    const all = await this.taskModel.countDocuments({ userId: new Types.ObjectId(userId) });
    const completed = await this.taskModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isCompleted: true,
    });
    return { total: all, completed, pending: all - completed };
  }
}
```

**Step 4: Create tasks controller (JWT-protected)**

Create `backend/src/tasks/tasks.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// All routes in this controller require a valid JWT
@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.userId, dto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('category') category?: string,
  ) {
    return this.tasksService.findAll(req.user.userId, status, sort, category);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.tasksService.getStats(req.user.userId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req, @Param('id') id: string) {
    return this.tasksService.remove(req.user.userId, id);
  }
}
```

**Step 5: Create tasks module**

Create `backend/src/tasks/tasks.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
```

**Step 6: Register TasksModule in app.module.ts**

Add `TasksModule` to the imports array in `backend/src/app.module.ts`.

**Step 7: Test task endpoints**

```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r .token)

# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","priority":"high","deadline":"2026-03-01T12:00:00Z"}'

# Get all tasks
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"
```
Expected: task list returned for the logged-in user only.

**Step 8: Commit**

```bash
git add backend/src/tasks/ backend/src/app.module.ts
git commit -m "feat: implement Task CRUD with JWT-guarded endpoints"
```

---

## PHASE 2: Mobile — React Native CLI Setup

### Task 6: Scaffold React Native CLI project

**Files:**
- Create: `mobile/` (React Native project root)

**Step 1: Scaffold the project**

```bash
cd "D:/React_Native Apps/todo-app"
npx @react-native-community/cli init mobile --template react-native-template-typescript --skip-git-init
```

**Step 2: Install all mobile dependencies**

```bash
cd mobile
npm install @reduxjs/toolkit react-redux
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npm install axios
npm install react-native-keychain
npm install @react-native-community/datetimepicker
npm install react-native-vector-icons
npm install -D @types/react-native-vector-icons
```

**Step 3: Install iOS pods (skip if Android-only)**

```bash
cd ios && pod install && cd ..
```

**Step 4: Add Reanimated babel plugin to babel.config.js**

In `mobile/babel.config.js`, ensure plugins array includes:

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

**Step 5: Verify app runs**

```bash
npx react-native start
# In another terminal:
npx react-native run-android
# or
npx react-native run-ios
```
Expected: Default React Native template screen appears.

**Step 6: Commit**

```bash
cd ..
git add mobile/
git commit -m "chore: scaffold React Native CLI mobile app"
```

---

### Task 7: Create theme constants and project structure

**Files:**
- Create: `mobile/src/theme/colors.ts`
- Create: `mobile/src/theme/index.ts`
- Create directory structure for the project

**Step 1: Create directory structure**

```bash
mkdir -p mobile/src/{theme,store,api,screens,navigation,components}
```

**Step 2: Create color palette**

Create `mobile/src/theme/colors.ts`:

```typescript
// Dark theme color palette — all UI components reference these tokens
export const Colors = {
  background: '#0F0F14',       // Main screen background
  surface: '#1C1C27',          // Cards, input backgrounds
  surfaceHigh: '#252535',      // Elevated elements (modals, selected items)
  primary: '#6C63FF',          // Buttons, active state, FAB
  primaryDim: '#4A4299',       // Pressed/disabled primary
  success: '#00D68F',          // Completed tasks, low priority
  error: '#FF4D6D',            // High priority, errors, delete
  warning: '#FF9F43',          // Medium priority, warnings
  textPrimary: '#FFFFFF',      // Main text
  textSecondary: '#8F8FA3',    // Subtitles, placeholders, metadata
  border: '#2A2A3D',           // Dividers, card borders
  overlay: 'rgba(0,0,0,0.6)', // Modal overlays

  // Priority color mapping used on task cards and badges
  priority: {
    high: '#FF4D6D',
    medium: '#FF9F43',
    low: '#00D68F',
  },
};
```

Create `mobile/src/theme/index.ts`:

```typescript
export { Colors } from './colors';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
};
```

**Step 3: Commit**

```bash
git add mobile/src/theme/
git commit -m "chore: add theme constants (colors, spacing, typography)"
```

---

### Task 8: Set up Axios API client with JWT interceptor

**Files:**
- Create: `mobile/src/api/client.ts`
- Create: `mobile/src/api/auth.api.ts`
- Create: `mobile/src/api/tasks.api.ts`

**Step 1: Create the Axios client with JWT interceptor**

Create `mobile/src/api/client.ts`:

```typescript
import axios from 'axios';
import * as Keychain from 'react-native-keychain';

// Point this at your backend. For Android emulator use 10.0.2.2, for iOS simulator use localhost
const BASE_URL = 'http://10.0.2.2:3000'; // Change to your machine's IP for real device

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT to every outgoing request if one is stored
apiClient.interceptors.request.use(async (config) => {
  const credentials = await Keychain.getGenericPassword();
  if (credentials) {
    config.headers.Authorization = `Bearer ${credentials.password}`;
  }
  return config;
});
```

**Step 2: Create typed auth API functions**

Create `mobile/src/api/auth.api.ts`:

```typescript
import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/register', { email, password }),

  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),
};
```

**Step 3: Create typed tasks API functions**

Create `mobile/src/api/tasks.api.ts`:

```typescript
import { apiClient } from './client';

export type Priority = 'low' | 'medium' | 'high';

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

export interface CreateTaskData {
  title: string;
  description?: string;
  dateTime?: string;
  deadline?: string;
  priority?: Priority;
  category?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  isCompleted?: boolean;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
}

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
```

**Step 4: Commit**

```bash
git add mobile/src/api/
git commit -m "feat: add Axios API client with JWT interceptor"
```

---

### Task 9: Set up Redux store with auth and tasks slices

**Files:**
- Create: `mobile/src/store/auth.slice.ts`
- Create: `mobile/src/store/tasks.slice.ts`
- Create: `mobile/src/store/index.ts`

**Step 1: Create auth slice**

Create `mobile/src/store/auth.slice.ts`:

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as Keychain from 'react-native-keychain';
import { authApi, AuthUser } from '../api/auth.api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

/** Persist token in keychain and store in Redux */
async function persistAuth(token: string, user: AuthUser, dispatch: (action: PayloadAction<{ token: string; user: AuthUser }>) => void) {
  await Keychain.setGenericPassword('token', token);
  dispatch(authSlice.actions.setAuth({ token, user }));
}

export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const { data } = await authApi.register(email, password);
      await Keychain.setGenericPassword('token', data.token);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Registration failed');
    }
  },
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await authApi.login(email, password);
      await Keychain.setGenericPassword('token', data.token);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Login failed');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    /** Call on app startup if a stored token is found */
    restoreSession(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      Keychain.resetGenericPassword();
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setAuth, restoreSession, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

**Step 2: Create tasks slice**

Create `mobile/src/store/tasks.slice.ts`:

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { tasksApi, Task, CreateTaskData, UpdateTaskData } from '../api/tasks.api';

interface TaskFilters {
  status: 'all' | 'active' | 'completed';
  sort: 'smart' | 'deadline' | 'priority';
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
      return id;
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
      // Fetch
      .addCase(fetchTasks.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, action) => { state.isLoading = false; state.items = action.payload; })
      .addCase(fetchTasks.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      // Create
      .addCase(createTask.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      // Update — replace in-place
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      // Delete — remove from list
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
      });
  },
});

export const { setFilters, clearError } = tasksSlice.actions;
export default tasksSlice.reducer;
```

**Step 3: Create the store**

Create `mobile/src/store/index.ts`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth.slice';
import tasksReducer from './tasks.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
  },
});

// TypeScript helper types — use these throughout the app instead of plain RootState/Dispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Step 4: Wrap the app in the Redux Provider in App.tsx**

Update `mobile/App.tsx`:

```typescript
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}
```

**Step 5: Commit**

```bash
git add mobile/src/store/ mobile/App.tsx
git commit -m "feat: set up Redux store with auth and tasks slices"
```

---

## PHASE 3: Navigation

### Task 10: Set up navigation structure

**Files:**
- Create: `mobile/src/navigation/RootNavigator.tsx`
- Create: `mobile/src/navigation/AuthNavigator.tsx`
- Create: `mobile/src/navigation/AppNavigator.tsx`
- Create: `mobile/src/navigation/types.ts`

**Step 1: Define navigation type params**

Create `mobile/src/navigation/types.ts`:

```typescript
import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Tasks: undefined;
  AddTask: undefined;
  Profile: undefined;
};

export type TasksStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};
```

**Step 2: Create root navigator with splash check**

Create `mobile/src/navigation/RootNavigator.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Keychain from 'react-native-keychain';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { restoreSession } from '../store/auth.slice';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { SplashScreen } from '../screens/SplashScreen';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // On app start, check for a persisted JWT in the secure keychain
    async function checkStoredToken() {
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          // We have a token — restore session optimistically
          // (the backend will reject stale tokens on the first API call)
          dispatch(restoreSession({
            token: credentials.password,
            user: { id: '', email: '' }, // will be populated on first API response
          }));
        }
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkStoredToken();
  }, [dispatch]);

  if (isCheckingAuth) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Step 3: Create auth navigator**

Create `mobile/src/navigation/AuthNavigator.tsx`:

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

**Step 4: Create app tab navigator**

Create `mobile/src/navigation/AppNavigator.tsx`:

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { AppTabParamList, TasksStackParamList } from './types';
import { Colors } from '../theme';
import { TaskListScreen } from '../screens/TaskListScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { AddTaskScreen } from '../screens/AddTaskScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();
const TasksStack = createNativeStackNavigator<TasksStackParamList>();

// Stack navigator nested inside the Tasks tab to support pushing TaskDetail
function TasksStackNavigator() {
  return (
    <TasksStack.Navigator screenOptions={{ headerShown: false }}>
      <TasksStack.Screen name="TaskList" component={TaskListScreen} />
      <TasksStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </TasksStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Tasks: 'check-square',
            AddTask: 'plus-circle',
            Profile: 'user',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Tasks" component={TasksStackNavigator} tabBarLabel="Tasks" />
      <Tab.Screen name="AddTask" component={AddTaskScreen} tabBarLabel="Add Task" />
      <Tab.Screen name="Profile" component={ProfileScreen} tabBarLabel="Profile" />
    </Tab.Navigator>
  );
}
```

**Step 5: Commit**

```bash
git add mobile/src/navigation/
git commit -m "feat: set up React Navigation (Stack + Bottom Tabs)"
```

---

## PHASE 4: Reusable Components

### Task 11: Build reusable UI components

**Files:**
- Create: `mobile/src/components/AppButton.tsx`
- Create: `mobile/src/components/AppInput.tsx`
- Create: `mobile/src/components/TaskCard.tsx`
- Create: `mobile/src/components/PrioritySelector.tsx`
- Create: `mobile/src/components/FilterTabs.tsx`
- Create: `mobile/src/components/EmptyState.tsx`
- Create: `mobile/src/components/PriorityBadge.tsx`

**Step 1: Create AppButton**

Create `mobile/src/components/AppButton.tsx`:

```typescript
import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { Colors, BorderRadius, Typography } from '../theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
}

export function AppButton({
  label, onPress, isLoading, disabled, variant = 'primary', style,
}: AppButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Colors.primary },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  danger: { backgroundColor: Colors.error },
  disabled: { opacity: 0.5 },
  label: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
  ghostLabel: { color: Colors.primary },
});
```

**Step 2: Create AppInput**

Create `mobile/src/components/AppInput.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View, TextInput, Text, StyleSheet,
  TextInputProps, ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Typography, Spacing } from '../theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function AppInput({ label, error, containerStyle, ...props }: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholderTextColor={Colors.textSecondary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  inputFocused: { borderColor: Colors.primary },
  inputError: { borderColor: Colors.error },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: Spacing.xs },
});
```

**Step 3: Create PriorityBadge**

Create `mobile/src/components/PriorityBadge.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography } from '../theme';
import { Priority } from '../api/tasks.api';

export function PriorityBadge({ priority }: { priority: Priority }) {
  const color = Colors.priority[priority];
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  text: { ...Typography.caption, fontWeight: '600' },
});
```

**Step 4: Create PrioritySelector**

Create `mobile/src/components/PrioritySelector.tsx`:

```typescript
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography, Spacing } from '../theme';
import { Priority } from '../api/tasks.api';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

interface Props {
  value: Priority;
  onChange: (priority: Priority) => void;
}

export function PrioritySelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {PRIORITIES.map((p) => {
        const isSelected = value === p;
        const color = Colors.priority[p];
        return (
          <TouchableOpacity
            key={p}
            style={[
              styles.pill,
              { borderColor: color },
              isSelected && { backgroundColor: color },
            ]}
            onPress={() => onChange(p)}
          >
            <Text style={[styles.pillText, { color: isSelected ? '#fff' : color }]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  pillText: { ...Typography.label, fontWeight: '600' },
});
```

**Step 5: Create FilterTabs**

Create `mobile/src/components/FilterTabs.tsx`:

```typescript
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

type FilterStatus = 'all' | 'active' | 'completed';
const TABS: FilterStatus[] = ['all', 'active', 'completed'];

interface Props {
  value: FilterStatus;
  onChange: (status: FilterStatus) => void;
}

export function FilterTabs({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = value === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onChange(tab)}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { ...Typography.label, color: Colors.textSecondary },
  activeTabText: { color: Colors.textPrimary, fontWeight: '600' },
});
```

**Step 6: Create TaskCard component**

Create `mobile/src/components/TaskCard.tsx`:

```typescript
import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  PanResponder, StyleSheet, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors, BorderRadius, Typography, Spacing } from '../theme';
import { Task } from '../api/tasks.api';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onPress: (task: Task) => void;
}

export function TaskCard({ task, onToggleComplete, onDelete, onPress }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const priorityColor = Colors.priority[task.priority];

  // Swipe-left-to-reveal-delete gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          // Swiped far enough — confirm delete
          Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
            { text: 'Cancel', onPress: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start() },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(task) },
          ]);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const isOverdue = task.deadline && !task.isCompleted && new Date(task.deadline) < new Date();

  return (
    <Animated.View
      style={[styles.card, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {/* Left border indicates priority */}
      <View style={[styles.priorityStripe, { backgroundColor: priorityColor }]} />

      <TouchableOpacity style={styles.content} onPress={() => onPress(task)} activeOpacity={0.8}>
        {/* Completion checkbox */}
        <TouchableOpacity style={styles.checkbox} onPress={() => onToggleComplete(task)}>
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
            {formattedDeadline && (
              <View style={styles.deadlineChip}>
                <Icon
                  name="calendar"
                  size={11}
                  color={isOverdue ? Colors.error : Colors.textSecondary}
                />
                <Text style={[styles.deadlineText, isOverdue && { color: Colors.error }]}>
                  {' '}{formattedDeadline}
                </Text>
              </View>
            )}
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
  content: { flex: 1, flexDirection: 'row', padding: Spacing.md, alignItems: 'center' },
  checkbox: { marginRight: Spacing.sm },
  textBlock: { flex: 1 },
  title: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginBottom: 2 },
  completedTitle: { textDecorationLine: 'line-through', color: Colors.textSecondary, opacity: 0.6 },
  description: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  deadlineChip: { flexDirection: 'row', alignItems: 'center' },
  deadlineText: { ...Typography.caption, color: Colors.textSecondary },
  categoryTag: { ...Typography.caption, color: Colors.primary },
});
```

**Step 7: Create EmptyState**

Create `mobile/src/components/EmptyState.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors, Typography, Spacing } from '../theme';

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Icon name="clipboard" size={64} color={Colors.textSecondary} />
      <Text style={styles.title}>No tasks yet</Text>
      <Text style={styles.subtitle}>Tap the + tab to add your first task</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  title: { ...Typography.h3, color: Colors.textSecondary, marginTop: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSecondary, opacity: 0.6, marginTop: Spacing.sm, textAlign: 'center' },
});
```

**Step 8: Commit**

```bash
git add mobile/src/components/
git commit -m "feat: build reusable UI components (TaskCard, inputs, filters)"
```

---

## PHASE 5: Screens

### Task 12: Build SplashScreen and Auth screens

**Files:**
- Create: `mobile/src/screens/SplashScreen.tsx`
- Create: `mobile/src/screens/LoginScreen.tsx`
- Create: `mobile/src/screens/RegisterScreen.tsx`

**Step 1: Create SplashScreen**

Create `mobile/src/screens/SplashScreen.tsx`:

```typescript
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TaskFlow</Text>
      <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  logo: { ...Typography.h1, color: Colors.primary, letterSpacing: 2 },
});
```

**Step 2: Create LoginScreen**

Create `mobile/src/screens/LoginScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loginUser, clearError } from '../store/auth.slice';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { Colors, Typography, Spacing } from '../theme';
import { AuthStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export function LoginScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    dispatch(clearError());
    dispatch(loginUser({ email: email.trim(), password }));
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error && <Text style={styles.errorBanner}>{error}</Text>}

        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={fieldErrors.email}
          placeholder="you@example.com"
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={fieldErrors.password}
          placeholder="••••••••"
        />

        <AppButton label="Sign In" onPress={handleLogin} isLoading={isLoading} />

        <TouchableOpacity style={styles.switchRow} onPress={() => navigation.replace('Register')}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  title: { ...Typography.h1, color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl },
  errorBanner: {
    ...Typography.body, color: Colors.error,
    backgroundColor: Colors.error + '22', borderRadius: 8,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  switchRow: { alignItems: 'center', marginTop: Spacing.lg },
  switchText: { ...Typography.body, color: Colors.textSecondary },
  switchLink: { color: Colors.primary, fontWeight: '600' },
});
```

**Step 3: Create RegisterScreen** (mirrors LoginScreen structure)

Create `mobile/src/screens/RegisterScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { registerUser, clearError } from '../store/auth.slice';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { Colors, Typography, Spacing } from '../theme';
import { AuthStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export function RegisterScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Minimum 6 characters';
    if (password !== confirm) errors.confirm = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    dispatch(clearError());
    dispatch(registerUser({ email: email.trim(), password }));
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join TaskFlow today</Text>

        {error && <Text style={styles.errorBanner}>{error}</Text>}

        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={fieldErrors.email}
          placeholder="you@example.com"
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={fieldErrors.password}
          placeholder="••••••••"
        />
        <AppInput
          label="Confirm Password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          error={fieldErrors.confirm}
          placeholder="••••••••"
        />

        <AppButton label="Create Account" onPress={handleRegister} isLoading={isLoading} />

        <TouchableOpacity style={styles.switchRow} onPress={() => navigation.replace('Login')}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  title: { ...Typography.h1, color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl },
  errorBanner: {
    ...Typography.body, color: Colors.error,
    backgroundColor: Colors.error + '22', borderRadius: 8,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  switchRow: { alignItems: 'center', marginTop: Spacing.lg },
  switchText: { ...Typography.body, color: Colors.textSecondary },
  switchLink: { color: Colors.primary, fontWeight: '600' },
});
```

**Step 4: Commit**

```bash
git add mobile/src/screens/SplashScreen.tsx mobile/src/screens/LoginScreen.tsx mobile/src/screens/RegisterScreen.tsx
git commit -m "feat: build auth screens (Login, Register, Splash)"
```

---

### Task 13: Build TaskListScreen

**Files:**
- Create: `mobile/src/screens/TaskListScreen.tsx`

**Step 1: Create TaskListScreen**

Create `mobile/src/screens/TaskListScreen.tsx`:

```typescript
import React, { useEffect, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { AppDispatch, RootState } from '../store';
import { fetchTasks, updateTask, deleteTask, setFilters } from '../store/tasks.slice';
import { TaskCard } from '../components/TaskCard';
import { FilterTabs } from '../components/FilterTabs';
import { EmptyState } from '../components/EmptyState';
import { Colors, Typography, Spacing } from '../theme';
import { Task } from '../api/tasks.api';
import { TasksStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TaskList'>;

export function TaskListScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<Nav>();
  const { items, filters, isLoading } = useSelector((state: RootState) => state.tasks);

  // Load tasks when filters change
  useEffect(() => {
    dispatch(fetchTasks(filters));
  }, [filters, dispatch]);

  const handleToggleComplete = useCallback(
    (task: Task) => {
      dispatch(updateTask({ id: task._id, data: { isCompleted: !task.isCompleted } }));
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (task: Task) => {
      dispatch(deleteTask(task._id));
    },
    [dispatch],
  );

  const handlePress = useCallback(
    (task: Task) => {
      navigation.push('TaskDetail', { taskId: task._id });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Tasks</Text>
        {/* Sort toggle button */}
        <TouchableOpacity
          onPress={() => {
            const next = filters.sort === 'smart' ? 'deadline' : filters.sort === 'deadline' ? 'priority' : 'smart';
            dispatch(setFilters({ sort: next }));
          }}
        >
          <Icon name="sliders" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <FilterTabs
        value={filters.status}
        onChange={(status) => dispatch(setFilters({ status }))}
      />

      {/* Task list */}
      {isLoading && items.length === 0 ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDelete}
              onPress={handlePress}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => dispatch(fetchTasks(filters))}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  screenTitle: { ...Typography.h2, color: Colors.textPrimary },
  list: { paddingTop: Spacing.md, paddingBottom: 80 },
  emptyList: { flex: 1 },
});
```

**Step 2: Commit**

```bash
git add mobile/src/screens/TaskListScreen.tsx
git commit -m "feat: build TaskListScreen with filters and sort toggle"
```

---

### Task 14: Build AddTaskScreen

**Files:**
- Create: `mobile/src/screens/AddTaskScreen.tsx`

**Step 1: Create AddTaskScreen**

Create `mobile/src/screens/AddTaskScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { AppDispatch, RootState } from '../store';
import { createTask } from '../store/tasks.slice';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { PrioritySelector } from '../components/PrioritySelector';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Priority } from '../api/tasks.api';

export function AddTaskScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const isLoading = useSelector((state: RootState) => state.tasks.isLoading);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dateTime, setDateTime] = useState<Date | undefined>(undefined);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState<'dateTime' | 'deadline' | null>(null);
  const [titleError, setTitleError] = useState('');

  function formatDate(date?: Date): string {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');

    const result = await dispatch(
      createTask({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        priority,
        dateTime: dateTime?.toISOString(),
        deadline: deadline?.toISOString(),
      }),
    );

    if (createTask.fulfilled.match(result)) {
      // Reset form and navigate to tasks list
      setTitle(''); setDescription(''); setCategory('');
      setPriority('medium'); setDateTime(undefined); setDeadline(undefined);
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

        {/* Priority selector */}
        <Text style={styles.sectionLabel}>Priority</Text>
        <PrioritySelector value={priority} onChange={setPriority} />

        {/* Date/time picker trigger */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Task Date & Time</Text>
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setShowDatePicker('dateTime')}
        >
          <Icon name="clock" size={16} color={Colors.textSecondary} />
          <Text style={styles.dateText}>{formatDate(dateTime)}</Text>
        </TouchableOpacity>

        {/* Deadline picker trigger */}
        <Text style={styles.sectionLabel}>Deadline</Text>
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setShowDatePicker('deadline')}
        >
          <Icon name="flag" size={16} color={Colors.textSecondary} />
          <Text style={styles.dateText}>{formatDate(deadline)}</Text>
        </TouchableOpacity>

        {/* Native date picker (shown conditionally) */}
        {showDatePicker && (
          <DateTimePicker
            value={showDatePicker === 'dateTime' ? (dateTime ?? new Date()) : (deadline ?? new Date())}
            mode="datetime"
            display="default"
            onChange={(_, selected) => {
              if (showDatePicker === 'dateTime') setDateTime(selected);
              else setDeadline(selected);
              setShowDatePicker(null);
            }}
          />
        )}

        <AppButton
          label="Add Task"
          onPress={handleSubmit}
          isLoading={isLoading}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingTop: Spacing.xl },
  title: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.lg },
  sectionLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.xs },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  dateText: { ...Typography.body, color: Colors.textPrimary },
});
```

**Step 2: Commit**

```bash
git add mobile/src/screens/AddTaskScreen.tsx
git commit -m "feat: build AddTaskScreen with all task fields"
```

---

### Task 15: Build TaskDetailScreen

**Files:**
- Create: `mobile/src/screens/TaskDetailScreen.tsx`

**Step 1: Create TaskDetailScreen**

Create `mobile/src/screens/TaskDetailScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
    await dispatch(updateTask({ id: task!._id, data: { isCompleted: !task!.isCompleted } }));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back + actions header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setIsEditing((e) => !e)} style={styles.headerBtn}>
            <Icon name={isEditing ? 'x' : 'edit-2'} size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Icon name="trash-2" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {isEditing ? (
        <>
          <AppInput label="Title" value={title} onChangeText={setTitle} />
          <AppInput label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
          <Text style={styles.sectionLabel}>Priority</Text>
          <PrioritySelector value={priority} onChange={setPriority} />
          <AppButton label="Save Changes" onPress={handleSave} style={{ marginTop: Spacing.lg }} />
        </>
      ) : (
        <>
          <Text style={[styles.taskTitle, task.isCompleted && styles.completedTitle]}>
            {task.title}
          </Text>
          {task.description ? (
            <Text style={styles.taskDescription}>{task.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <PriorityBadge priority={task.priority} />
            {task.category ? <Text style={styles.category}>#{task.category}</Text> : null}
          </View>

          {task.deadline && (
            <View style={styles.infoRow}>
              <Icon name="flag" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {' '}Deadline: {new Date(task.deadline).toLocaleDateString()}
              </Text>
            </View>
          )}
          {task.dateTime && (
            <View style={styles.infoRow}>
              <Icon name="clock" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {' '}{new Date(task.dateTime).toLocaleString()}
              </Text>
            </View>
          )}

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: { padding: 4 },
  taskTitle: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.sm },
  completedTitle: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  taskDescription: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  category: { ...Typography.caption, color: Colors.primary },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  infoText: { ...Typography.caption, color: Colors.textSecondary },
  sectionLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.xs },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { ...Typography.body, color: Colors.textSecondary },
});
```

**Step 2: Commit**

```bash
git add mobile/src/screens/TaskDetailScreen.tsx
git commit -m "feat: build TaskDetailScreen with view/edit/delete/toggle"
```

---

### Task 16: Build ProfileScreen

**Files:**
- Create: `mobile/src/screens/ProfileScreen.tsx`

**Step 1: Create ProfileScreen**

Create `mobile/src/screens/ProfileScreen.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { logout } from '../store/auth.slice';
import { AppButton } from '../components/AppButton';
import { tasksApi, TaskStats } from '../api/tasks.api';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

export function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [stats, setStats] = useState<TaskStats | null>(null);

  useEffect(() => {
    tasksApi.getStats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* User email */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Email</Text>
        <Text style={styles.cardValue}>{user?.email ?? '—'}</Text>
      </View>

      {/* Task stats */}
      {stats && (
        <View style={styles.statsRow}>
          <StatChip label="Total" value={stats.total} color={Colors.primary} />
          <StatChip label="Done" value={stats.completed} color={Colors.success} />
          <StatChip label="Pending" value={stats.pending} color={Colors.warning} />
        </View>
      )}

      <AppButton
        label="Sign Out"
        variant="danger"
        onPress={handleLogout}
        style={{ marginTop: Spacing.xl }}
      />
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statChip, { borderColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, paddingTop: Spacing.xl },
  title: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  cardLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  cardValue: { ...Typography.body, color: Colors.textPrimary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statChip: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, padding: Spacing.md, alignItems: 'center',
  },
  statValue: { ...Typography.h2 },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
});
```

**Step 2: Commit**

```bash
git add mobile/src/screens/ProfileScreen.tsx
git commit -m "feat: build ProfileScreen with stats and logout"
```

---

## PHASE 6: Polish & CLAUDE.md

### Task 17: Create CLAUDE.md for the repository

**Files:**
- Create: `CLAUDE.md`

**Step 1: Write CLAUDE.md** (see content in the project root)

Refer to the design doc at `docs/plans/2026-02-28-todo-app-design.md` for full architecture context. The CLAUDE.md should cover:
- How to start backend and mobile (dev commands)
- Project structure overview
- Key architectural decisions (JWT flow, Redux slices, smart sort algorithm)
- API base URL configuration for different environments

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md"
```

---

### Task 18: End-to-end smoke test

**Step 1: Start backend**

```bash
cd backend && npm run start:dev
```

**Step 2: Start Metro and run mobile app**

```bash
cd mobile
npx react-native start
# New terminal:
npx react-native run-android
```

**Step 3: Manual test checklist**

- [ ] Register new account → navigates to task list
- [ ] Log out → back to login screen
- [ ] Log in with same credentials → back to task list
- [ ] Add task with all fields filled → appears in list
- [ ] Add task with only title → appears in list
- [ ] Tap complete checkbox → task shows strike-through
- [ ] Filter to "Completed" → only completed tasks visible
- [ ] Filter to "Active" → only incomplete tasks visible
- [ ] Tap task card → TaskDetail screen opens
- [ ] Edit task title and save → updated in list
- [ ] Swipe left on task → delete confirmation → deletes
- [ ] Profile screen shows correct email and stats
- [ ] Sort toggle cycles through smart / deadline / priority

**Step 4: Commit**

```bash
git add .
git commit -m "chore: end-to-end smoke test complete"
```

---

## Quick Reference

### Running the Backend

```bash
cd backend
npm run start:dev   # Development with hot-reload
npm run build       # Production build
npm run start:prod  # Run production build
```

### Running the Mobile App

```bash
cd mobile
npx react-native start           # Start Metro bundler
npx react-native run-android     # Launch on Android emulator/device
npx react-native run-ios         # Launch on iOS simulator

# Android emulator — backend URL is 10.0.2.2:3000
# iOS simulator — backend URL is localhost:3000
# Real device — set BASE_URL to your machine's LAN IP
```

### Environment Variables (backend/.env)

```
MONGODB_URI=mongodb://localhost:27017/todoapp
JWT_SECRET=change-me-in-production
JWT_EXPIRY=7d
PORT=3000
```
