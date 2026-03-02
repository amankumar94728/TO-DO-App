# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Structure

```
todo-app/
├── backend/          NestJS REST API (TypeScript)
│   └── src/
│       ├── auth/     JWT auth — register, login, JwtStrategy, DTOs
│       ├── tasks/    Task CRUD — schema, service, controller, DTOs
│       └── users/    User schema + UsersService
├── mobile/           React Native CLI app (TypeScript)
│   └── src/
│       ├── api/      Axios client + typed endpoint wrappers
│       ├── store/    Redux Toolkit — authSlice, tasksSlice
│       ├── navigation/ Stack + Bottom Tab navigators + type params
│       ├── screens/  One file per screen
│       ├── components/ Reusable UI components
│       └── theme/    Colors, Spacing, BorderRadius, Typography constants
└── docs/plans/       Design doc and implementation plan
```

---

## Dev Commands

### Backend

```bash
cd backend

# Install dependencies (first time)
npm install
npm install @nestjs/config   # if missing

# Development (hot-reload)
npm run start:dev

# Production build
npm run build && npm run start:prod
```

### Mobile

```bash
cd mobile

# First-time scaffold (run once, then copy our App.tsx and babel.config.js back over)
npx @react-native-community/cli init mobile --template react-native-template-typescript

# Install all dependencies
npm install @reduxjs/toolkit react-redux \
  @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  react-native-gesture-handler react-native-reanimated \
  axios react-native-keychain \
  @react-native-community/datetimepicker \
  react-native-vector-icons
npm install -D @types/react-native-vector-icons

# iOS only
cd ios && pod install && cd ..

# Run
npx react-native start           # Metro bundler
npx react-native run-android
npx react-native run-ios
```

---

## Architecture

### Auth Flow

1. Mobile calls `POST /auth/register` or `POST /auth/login`
2. Backend hashes password (bcrypt, 10 rounds), signs JWT (`sub: userId, email`)
3. Mobile stores JWT in device keychain via `react-native-keychain`
4. Every subsequent request: Axios interceptor in `mobile/src/api/client.ts` reads keychain and attaches `Authorization: Bearer <token>`
5. NestJS `JwtAuthGuard` (via `AuthGuard('jwt')`) validates token on all `/tasks` routes
6. On app startup: `RootNavigator` reads keychain, dispatches `restoreSession`, routes to Auth or App navigator

### State Management

- `authSlice` — holds `{ user, token, isLoading, error }`. `restoreSession`, `logout`, `clearError` reducers. `registerUser` / `loginUser` async thunks.
- `tasksSlice` — holds `{ items: Task[], filters: { status, sort, category }, isLoading, error }`. `fetchTasks` / `createTask` / `updateTask` / `deleteTask` async thunks. `setFilters` reducer.
- No RTK Query — plain `createAsyncThunk` with manual cache invalidation (re-fetch on filter change).

### Smart Sort Algorithm (backend)

Tasks sorted by urgency score: `PRIORITY_WEIGHTS[priority] / max(daysUntilDeadline, 0.1)`.
- `high=3, medium=2, low=1`
- Overdue tasks → `Infinity` (always first)
- No deadline → `weight * 0.1` (always last)
- Implemented in `backend/src/tasks/tasks.service.ts → computeUrgencyScore()`

### Navigation Tree

```
RootNavigator (Stack, no header)
├── Auth Stack (unauthenticated)
│   ├── LoginScreen
│   └── RegisterScreen
└── App Tab Navigator (authenticated)
    ├── Tasks tab → TasksStack
    │   ├── TaskListScreen
    │   └── TaskDetailScreen
    ├── AddTask tab → AddTaskScreen
    └── Profile tab → ProfileScreen
```

### API Base URL

Set in `mobile/src/api/client.ts`:
- Android emulator: `http://10.0.2.2:3000` (default)
- iOS simulator: change to `http://localhost:3000`
- Physical device: change to your machine's LAN IP

---

## Environment Variables

`backend/.env` (not committed — use `.env.example` as reference):

```
MONGODB_URI=mongodb://localhost:27017/todoapp
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d
PORT=3000
```

---

## Key Decisions

- **`GET /tasks/stats`** is declared before `PATCH /tasks/:id` in `TasksController` — otherwise NestJS matches "stats" as a task ID.
- **Ownership checks** in `TasksService.update()` and `.remove()` use `.toString()` comparison because `task.userId` is a Mongoose `ObjectId` and `userId` from the JWT payload is a plain string.
- **`restoreSession`** sets `user: { id: '', email: '' }` as a placeholder — the real user object is only available by decoding the JWT, which we intentionally avoid on the client.
- **Theme**: All colors live in `mobile/src/theme/colors.ts`. Never hardcode hex values in components — always use `Colors.*` tokens.
