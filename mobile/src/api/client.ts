import axios from 'axios';
import * as Keychain from 'react-native-keychain';

/**
 * Base URL for the NestJS backend.
 * - Android emulator: use 10.0.2.2 (maps to host machine localhost)
 * - iOS simulator: use localhost
 * - Physical device: use your machine's LAN IP address (e.g. 192.168.1.x)
 */
const BASE_URL = 'http://10.0.2.2:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

/**
 * Request interceptor — attaches the stored JWT to every outgoing request.
 * react-native-keychain stores the token using setGenericPassword('token', jwtString).
 */
apiClient.interceptors.request.use(async (config) => {
  const credentials = await Keychain.getGenericPassword();
  if (credentials) {
    config.headers.Authorization = `Bearer ${credentials.password}`;
  }
  return config;
});
