# Todo App — Design Document

**Date:** 2026-02-28
**Stack:** React Native CLI (TypeScript) + NestJS + MongoDB

---

## 1. Architecture Overview

Two separate projects inside a monorepo-style root:

```
todo-app/
├── backend/          NestJS REST API (TypeScript)
│   └── src/
│       ├── auth/     Register, Login, JWT strategy + guards
│       ├── tasks/    Task CRUD, filtering, sorting
│       └── users/    User schema + service
└── mobile/           React Native CLI (TypeScript)
    └── src/
        ├── api/      Axios client + RTK Query endpoints
        ├── store/    Redux Toolkit store + slices
        ├── screens/  All screen components
        ├── navigation/  Stack + Tab navigators
        ├── components/  Reusable UI components
        └── theme/    Colors, typography, spacing constants
```

**Data Flow:**
Mobile → Axios (with JWT header) → NestJS → MongoDB → JSON response → Redux (RTK Query cache) → React components

**JWT Storage:**
Token stored via `react-native-keychain` (secure device keystore). Axios interceptor reads token and attaches to `Authorization: Bearer <token>` on every request.

---

## 2. Authentication Flow

- `POST /auth/register` — hash password with bcrypt, create user, return JWT
- `POST /auth/login` — verify credentials, return JWT + user info
- JWT signed with secret, 7-day expiry
- NestJS `JwtAuthGuard` protects all `/tasks` routes
- On app start: `SplashScreen` reads stored token → validates → routes to Auth or App navigator

---

## 3. Screens & Navigation

```
Root Stack Navigator
├── SplashScreen                (auto-redirect based on token)
├── Auth Stack (no token)
│   ├── LoginScreen
│   └── RegisterScreen
└── App Tab Navigator (valid token)
    ├── Tab: Tasks  →  TaskListScreen
    │                  └── TaskDetailScreen (stack push)
    ├── Tab: Add    →  AddTaskScreen (modal)
    └── Tab: Profile → ProfileScreen
```

### Screen Details

| Screen | Key Features |
|--------|-------------|
| TaskListScreen | Filter tabs (All/Active/Completed), sort button, FAB, swipe-to-delete, tap-to-complete |
| AddTaskScreen | Title*, description, dateTime picker, deadline picker, priority pills, category tag input |
| TaskDetailScreen | Full task view, edit mode toggle, complete toggle, delete with confirmation dialog |
| ProfileScreen | User email, task stats (total/completed/pending), logout button |

---

## 4. Data Models

### MongoDB / Mongoose Schemas

```typescript
// User Schema
{
  email: string (unique, required),
  passwordHash: string (required),
  createdAt: Date
}

// Task Schema
{
  userId: ObjectId (ref: User, required),
  title: string (required),
  description: string,
  dateTime: Date,           // task occurrence date/time
  deadline: Date,           // due date
  priority: 'low' | 'medium' | 'high',
  category: string,         // optional free-text tag
  isCompleted: boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account → `{ token, user }` |
| POST | `/auth/login` | Login → `{ token, user }` |
| GET | `/tasks` | List tasks (supports query params) |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task (any field) |
| DELETE | `/tasks/:id` | Delete task |

**Query params for GET /tasks:**
- `status` — `all` | `active` | `completed`
- `sort` — `smart` | `deadline` | `priority` | `createdAt`
- `category` — filter by tag string

---

## 6. Smart Sort Algorithm

Tasks sorted by a computed urgency score:

```
priorityWeight = { high: 3, medium: 2, low: 1 }
daysUntilDeadline = (deadline - now) / 86400000

score = priorityWeight / max(daysUntilDeadline, 0.1)
```

Overdue tasks (daysUntilDeadline < 0) always sorted to top. Tasks without deadlines sorted by priority then createdAt.

---

## 7. State Management (Redux Toolkit)

### Slices
- **`authSlice`** — `{ user, token, isLoading, error, isAuthenticated }`
- **`tasksSlice`** — `{ filters: { status, sort, category }, activeTask }`

### RTK Query (`tasksApi`)
- `useGetTasksQuery(filters)` — fetches + caches task list, auto-refetches on mutation
- `useCreateTaskMutation()`
- `useUpdateTaskMutation()`
- `useDeleteTaskMutation()`

All task mutations invalidate the `Tasks` cache tag, triggering automatic list refresh.

---

## 8. UI / Visual Design

### Color Palette (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#0F0F14` | Screen backgrounds |
| `surface` | `#1C1C27` | Cards, inputs |
| `primary` | `#6C63FF` | Buttons, active tabs, FAB |
| `success` | `#00D68F` | Completed state, low priority |
| `priorityHigh` | `#FF4D6D` | High priority badge/border |
| `priorityMed` | `#FF9F43` | Medium priority badge/border |
| `priorityLow` | `#00D68F` | Low priority badge/border |
| `textPrimary` | `#FFFFFF` | Main text |
| `textSecondary` | `#8F8FA3` | Subtitles, placeholders |

### Key Component Behaviours
- **Task Card** — left border color = priority color, swipe-left reveals delete, tap checkbox toggles complete (strike-through + fade animation)
- **Priority Selector** — 3 horizontal pill buttons, selected pill fills with priority color
- **Filter Tabs** — animated sliding underline indicator
- **FAB** — fixed bottom-right on TaskListScreen, opens AddTask as modal
- **Empty State** — illustration + "Add your first task" prompt
- **Task completion animation** — strike-through text, card fades to 50% opacity with ease-out

---

## 9. Key Libraries

### Backend
- `@nestjs/jwt`, `passport-jwt` — JWT auth
- `bcrypt` — password hashing
- `mongoose`, `@nestjs/mongoose` — MongoDB ODM
- `class-validator` — DTO validation

### Mobile
- `@reduxjs/toolkit`, `react-redux` — state + RTK Query
- `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs` — navigation
- `react-native-keychain` — secure JWT storage
- `@react-native-community/datetimepicker` — native date/time pickers
- `react-native-vector-icons` — icons
- `axios` — HTTP client
