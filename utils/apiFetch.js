import storage from './storage';
import * as demoData from '../constants/demoData';

// Enhanced wrapper around fetch that:
// 1. Automatically includes auth token if available
// 2. Intercepts requests for Demo Mode
export default async function apiFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  const { _silent = false, silent = false, ...fetchInit } = init;
  const isSilent = _silent || silent;

  if (__DEV__ && !isSilent) {
    console.log(`[apiFetch] Calling: ${url}`, { method: init.method || 'GET' });
  }

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
    } else if (url.includes('/academic-year')) {
      responseData = demoData.DEMO_ACADEMIC_YEARS;
    } else if (url.includes('/teachers/my-subjects')) {
      responseData = demoData.DEMO_TEACHER_SUBJECTS;
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

  // Inject Time-Travel Context Header for Super Admins
  try {
    const userStr = await storage.getItem('@auth_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user?.role === 'super admin';

    if (isSuperAdmin) {
      const storedYearStr = await storage.getItem('selectedAcademicYear');
      if (storedYearStr) {
        const storedYear = JSON.parse(storedYearStr);
        if (storedYear && storedYear._id) {
          headers['x-academic-year'] = storedYear._id;
        }
      }
    }
  } catch (err) {
    console.warn('apiFetch: Could not attach x-academic-year context', err);
  }

  const response = await fetch(input, {
    ...fetchInit,
    headers,
  });

  // Intercept response headers to check if academic year has been updated on backend
  try {
    const activeYearHeader = response.headers.get('x-active-academic-year');
    if (activeYearHeader) {
      const activeYear = JSON.parse(activeYearHeader);
      
      const storedYearStr = await storage.getItem('selectedAcademicYear');
      const storedYear = storedYearStr ? JSON.parse(storedYearStr) : null;

      const userStr = await storage.getItem('@auth_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isSuperAdmin = user?.role === 'super admin';

      // Non-Super Admins MUST be forced to the active year if it differs
      if (!isSuperAdmin) {
        if (!storedYear || storedYear._id !== activeYear._id) {
          if (__DEV__) {
            console.log(`[apiFetch] Backend forced academic year context update to: ${activeYear.name}`);
          }
          
          // 1. Update AsyncStorage
          await storage.setItem('selectedAcademicYear', JSON.stringify(activeYear));
          
          // 2. Update React Context state immediately
          const { notifyAcademicYearChange } = require('../contexts/AcademicYearContext');
          notifyAcademicYearChange(activeYear);
          
          // 3. Invalidate React Query caches to trigger UI refresh
          const { queryClient } = require('./queryClient');
          queryClient.invalidateQueries();
        }
      }
    }
  } catch (err) {
    console.warn('apiFetch: Error checking/syncing active year header', err);
  }

  return response;
}

