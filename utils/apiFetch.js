import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_USER, DEMO_ATTENDANCE_SUMMARY, DEMO_ATTENDANCE_HISTORY } from '../constants/demoData';

// Enhanced wrapper around fetch that:
// 1. Automatically includes auth token if available
// 2. Intercepts requests for Demo Mode
export default async function apiFetch(input, init = {}) {
  const { _silent = false, ...fetchInit } = init;

  // Get auth token from storage
  const token = await AsyncStorage.getItem('@auth_token');

  // Check for Demo Mode
  if (token === 'demo-token') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let data = null;
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/auth/me')) {
      data = { user: DEMO_USER };
    } else if (url.includes('/attendance/student/') && url.includes('/summary')) {
      data = DEMO_ATTENDANCE_SUMMARY;
    } else if (url.includes('/attendance/student/')) {
      data = DEMO_ATTENDANCE_HISTORY;
    } else if (url.includes('/classes/') && url.includes('/full-details')) {
      const { DEMO_CLASS_DETAILS } = require('../constants/demoData');
      data = DEMO_CLASS_DETAILS;
    } else if (url.includes('/reports/student/')) {
      const { DEMO_REPORT_CARD } = require('../constants/demoData');
      data = DEMO_REPORT_CARD;
    } else if (url.includes('/reports/insights/')) {
      const { DEMO_INSIGHTS } = require('../constants/demoData');
      data = DEMO_INSIGHTS;
    } else if (url.includes('/timetable/my-timetable')) {
      const { DEMO_TIMETABLE } = require('../constants/demoData');
      data = DEMO_TIMETABLE;
    } else if (url.includes('/fees/student/')) {
      const { DEMO_FEES } = require('../constants/demoData');
      data = DEMO_FEES;
    } else if (url.includes('/exams/schedule/student')) {
      const { DEMO_EXAMS } = require('../constants/demoData');
      data = DEMO_EXAMS;
    } else if (url.includes('/leaves/my-leaves')) {
      const { DEMO_LEAVES } = require('../constants/demoData');
      data = DEMO_LEAVES;
    } else if (url.includes('/leaves/apply')) {
      data = { message: "Leave applied successfully (Demo)" };
    } else if (url.includes('/subjects') && url.includes('/content')) {
      const { DEMO_SUBJECT_CONTENT } = require('../constants/demoData');
      data = DEMO_SUBJECT_CONTENT;
    } else if (url.includes('/classes/') && url.includes('/subjects')) {
      // This might be needed for subject list in subject detail page
      const { DEMO_CLASS_DETAILS } = require('../constants/demoData');
      data = DEMO_CLASS_DETAILS.subjects;
    } else if (url.includes('/events')) {
      const { DEMO_EVENTS } = require('../constants/demoData');
      data = DEMO_EVENTS;
    } else if (url.includes('/notifications')) {
      const { DEMO_NOTIFICATIONS } = require('../constants/demoData');
      data = DEMO_NOTIFICATIONS;
    } else {
      // Default empty response for other endpoints in demo mode to prevent errors
      data = {};
    }

    return {
      ok: true,
      status: 200,
      json: async () => data,
    };
  }

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
