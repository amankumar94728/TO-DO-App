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

/** Register a new account — persists JWT to Keychain on success */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
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

/** Login with existing credentials — persists JWT to Keychain on success */
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

/** Logout — clears the stored JWT from Keychain before resetting Redux state */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await Keychain.resetGenericPassword();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Called on app startup when a stored token is found in Keychain */
    restoreSession(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    /** Clears auth state — Keychain is handled by the logoutUser async thunk */
    logout(state) {
      state.user = null;
      state.token = null;
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
      })
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { restoreSession, logout, clearError } = authSlice.actions;
export { logoutUser };
export default authSlice.reducer;
