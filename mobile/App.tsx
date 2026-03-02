import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * App root — wraps the entire app in the Redux store Provider
 * and renders the root navigator which handles auth routing.
 */
export default function App() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}
