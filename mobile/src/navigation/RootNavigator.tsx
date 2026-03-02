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
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    /**
     * On app start, check Keychain for a persisted JWT.
     * If found, restore the session optimistically — the backend
     * will reject stale tokens on the first API call.
     */
    async function checkStoredToken() {
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          dispatch(
            restoreSession({
              token: credentials.password,
              // email is stored in the JWT; will be populated on first API response
              user: { id: '', email: '' },
            }),
          );
        }
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkStoredToken();
  }, [dispatch]);

  if (isCheckingAuth) {
    return <SplashScreen />;
  }

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
