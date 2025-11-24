import { showLoading, hideLoading } from './loadingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced wrapper around fetch that:
// 1. Toggles the global loading indicator
// 2. Automatically includes auth token if available
export default async function apiFetch(input, init = {}) {
  showLoading();
  
  try {
    // Get auth token from storage
    const token = await AsyncStorage.getItem('@auth_token');
    
    // Merge headers with auth token if available
    const headers = {
      ...(init.headers || {}),
    };
    
    // Add Authorization header if token exists and not already set
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the fetch request with merged headers
    const response = await fetch(input, {
      ...init,
      headers,
    });
    
    return response;
  } finally {
    hideLoading();
  }
}
