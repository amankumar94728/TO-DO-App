import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { registerUser, clearError } from '../store/auth.slice';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { Colors, Typography, Spacing } from '../theme';
import { AuthStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export function RegisterScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  /** Client-side validation — checks email format, password length, and confirmation match */
  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Enter a valid email';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Minimum 6 characters';
    }
    if (password !== confirm) {
      errors.confirm = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleRegister() {
    if (!validate()) return;
    dispatch(clearError());
    dispatch(registerUser({ email: email.trim(), password }));
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join TaskFlow today</Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
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

        <AppButton
          label="Create Account"
          onPress={handleRegister}
          isLoading={isLoading}
        />

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.switchText}>
            Already have an account?{' '}
            <Text style={styles.switchLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  title: { ...Typography.h1, color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    ...Typography.body,
    color: Colors.error,
    backgroundColor: Colors.error + '22',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  switchRow: { alignItems: 'center', marginTop: Spacing.lg },
  switchText: { ...Typography.body, color: Colors.textSecondary },
  switchLink: { color: Colors.primary, fontWeight: '600' },
});
