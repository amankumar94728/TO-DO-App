import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme';

/** Shown while checking for a stored auth token on app startup */
export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TaskFlow</Text>
      <ActivityIndicator
        color={Colors.primary}
        size="large"
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    ...Typography.h1,
    color: Colors.primary,
    letterSpacing: 2,
  },
  spinner: { marginTop: 24 },
});
