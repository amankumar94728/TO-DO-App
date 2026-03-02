import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth.slice';
import tasksReducer from './tasks.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
  },
});

/** Use throughout the app instead of plain `ReturnType<typeof store.getState>` */
export type RootState = ReturnType<typeof store.getState>;

/** Use throughout the app instead of plain `typeof store.dispatch` */
export type AppDispatch = typeof store.dispatch;
