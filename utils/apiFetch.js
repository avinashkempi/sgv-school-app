import storage from './storage';
import * as demoData from '../constants/demoData';

// Enhanced wrapper around fetch that:
// 1. Automatically includes auth token if available
// 2. Intercepts requests for Demo Mode
export default async function apiFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  console.log(`[apiFetch] Calling: ${url}`, { method: init.method || 'GET' });
  const { _silent = false, ...fetchInit } = init;

  // Get auth token from storage
  const token = await storage.getItem('@auth_token');

  // Check for Demo Mode
  if (token === 'demo-token') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let responseData = null;
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/auth/me')) {
      responseData = { user: demoData.DEMO_USER };
    } else if (url.includes('/attendance/student/') && url.includes('/summary')) {
      responseData = demoData.DEMO_ATTENDANCE_SUMMARY;
    } else if (url.includes('/attendance/student/')) {
      responseData = demoData.DEMO_ATTENDANCE_HISTORY;
    } else if (url.includes('/classes/') && url.includes('/full-details')) {
      responseData = demoData.DEMO_CLASS_DETAILS;
    } else if (url.includes('/reports/student/')) {
      responseData = demoData.DEMO_REPORT_CARD;
    } else if (url.includes('/reports/insights/')) {
      responseData = demoData.DEMO_INSIGHTS;
    } else if (url.includes('/timetable/my-timetable')) {
      responseData = demoData.DEMO_TIMETABLE;
    } else if (url.includes('/fees/student/')) {
      responseData = demoData.DEMO_FEES;
    } else if (url.includes('/exams/schedule/student')) {
      responseData = demoData.DEMO_EXAMS;
    } else if (url.includes('/leaves/my-leaves')) {
      responseData = demoData.DEMO_LEAVES;
    } else if (url.includes('/leaves/apply')) {
      responseData = { message: "Leave applied successfully (Demo)" };
    } else if (url.includes('/subjects') && url.includes('/content')) {
      responseData = demoData.DEMO_SUBJECT_CONTENT;
    } else if (url.includes('/classes/') && url.includes('/subjects')) {
      responseData = demoData.DEMO_CLASS_DETAILS.subjects;
    } else if (url.includes('/events')) {
      responseData = demoData.DEMO_EVENTS;
    } else if (url.includes('/notifications')) {
      responseData = demoData.DEMO_NOTIFICATIONS;
    } else if (url.includes('/dashboard/student')) {
      responseData = demoData.DEMO_STUDENT_DASHBOARD;
    } else {
      responseData = {};
    }

    return {
      ok: true,
      status: 200,
      json: async () => responseData,
    };
  }

  // Merge headers with auth token if available
  const headers = {
    ...(fetchInit.headers || {}),
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(input, {
    ...fetchInit,
    headers,
  });

  return response;
}

