import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced wrapper around fetch that:
// 1. Automatically includes auth token if available
export default async function apiFetch(input, init = {}) {
  const { _silent = false, ...fetchInit } = init;

  // Get auth token from storage
  const token = await AsyncStorage.getItem('@auth_token');

  // Merge headers with auth token if available
  const headers = {
    ...(fetchInit.headers || {}),
  };

  // Add Authorization header if token exists and not already set
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make the fetch request with merged headers
  const response = await fetch(input, {
    ...fetchInit,
    headers,
  });

  return response;
}
