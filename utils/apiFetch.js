import storage from "./storage";
import * as demoData from "../constants/demoData";

let inMemoryToken = null;
let useInMemoryToken = false;

export const setApiFetchToken = (token) => {
  inMemoryToken = token;
  useInMemoryToken = true;
};

export const clearApiFetchToken = () => {
  inMemoryToken = null;
  useInMemoryToken = true;
};

// Enhanced wrapper around fetch that:
// 1. Automatically includes auth token if available
// 2. Intercepts requests for Demo Mode
export default async function apiFetch(input, init = {}) {
  const url = typeof input === "string" ? input : input.url;
  const { _silent = false, silent = false, ...fetchInit } = init;
  const isSilent = _silent || silent;

  if (__DEV__ && !isSilent) {
    console.log(`[apiFetch] Calling: ${url}`, { method: init.method || "GET" });
  }

  // Get auth token from memory (instant override) or storage
  const token = useInMemoryToken
    ? inMemoryToken
    : await storage.getItem("@auth_token");

  // Check for Demo Mode
  if (token === "demo-token") {
    // Simulate slight network delay for natural feel
    await new Promise((resolve) => global.setTimeout(resolve, 200));

    const url = typeof input === "string" ? input : input.url;
    const method = (init.method || "GET").toUpperCase();

    // ── DEMO MODE SAFETY SHIELD: STRICT VIEW-ONLY ENFORCEMENT ──
    // Any write/mutation (POST, PUT, PATCH, DELETE) in demo mode is simulated locally.
    // It NEVER hits the network or modifies live database records.
    if (method !== "GET") {
      let mutationResponse = {
        success: true,
        message: "Demo Mode: Action simulated (view-only mode)",
      };

      if (url.includes("/vibes") && url.includes("/comments")) {
        mutationResponse = {
          success: true,
          message: "Comment recorded (Demo)",
          data: demoData.DEMO_VIBES_COMMENTS?.[0],
        };
      } else if (url.includes("/vibes")) {
        mutationResponse = {
          success: true,
          message: "Vibe action simulated (Demo)",
          data: demoData.DEMO_VIBES_POSTS?.[0],
        };
      } else if (url.includes("/users")) {
        mutationResponse = {
          success: true,
          message:
            method === "DELETE"
              ? "User deleted successfully (Demo simulated)"
              : "User saved successfully (Demo simulated)",
          user: demoData.DEMO_STUDENTS?.[0],
        };
      } else if (url.includes("/classes")) {
        mutationResponse = {
          success: true,
          message: "Class action simulated (Demo)",
          data: demoData.DEMO_CLASSES?.[0],
        };
      } else if (url.includes("/attendance/mark-staff")) {
        mutationResponse = { success: true, message: "Staff attendance marked (Demo simulated)" };
      } else if (url.includes("/attendance/mark")) {
        mutationResponse = { success: true, message: "Attendance saved (Demo simulated)" };
      } else if (url.includes("/exams")) {
        mutationResponse = { success: true, message: "Exam action simulated (Demo)" };
      } else if (url.includes("/marks")) {
        mutationResponse = { success: true, message: "Marks saved successfully (Demo simulated)" };
      } else if (url.includes("/fees")) {
        mutationResponse = { success: true, message: "Fee transaction simulated (Demo)" };
      } else if (url.includes("/leaves/apply")) {
        mutationResponse = { success: true, message: "Leave applied successfully (Demo simulated)" };
      } else if (url.includes("/leaves")) {
        mutationResponse = { success: true, message: "Leave status updated (Demo simulated)" };
      } else if (url.includes("/student-ratings")) {
        mutationResponse = { success: true, message: "Ratings saved successfully (Demo simulated)" };
      } else if (url.includes("/timetable")) {
        mutationResponse = { success: true, message: "Timetable updated (Demo simulated)" };
      } else if (url.includes("/events")) {
        mutationResponse = { success: true, message: "Event updated (Demo simulated)" };
      } else if (url.includes("/complaints")) {
        mutationResponse = { success: true, message: "Complaint recorded (Demo simulated)" };
      } else if (url.includes("/feedback")) {
        mutationResponse = { success: true, message: "Feedback submitted (Demo simulated)" };
      } else if (url.includes("/notifications/mark-all-read")) {
        if (demoData.DEMO_NOTIFICATIONS?.notifications) {
          demoData.DEMO_NOTIFICATIONS.notifications.forEach((n) => {
            n.isRead = true;
            n.read = true;
          });
          demoData.DEMO_NOTIFICATIONS.unreadCount = 0;
        }
        mutationResponse = { success: true, message: "All notifications marked as read (Demo)" };
      } else if (url.includes("/notifications") && url.includes("/read")) {
        const notifIdMatch = url.match(/\/notifications\/([^/]+)\/read/);
        if (notifIdMatch && demoData.DEMO_NOTIFICATIONS?.notifications) {
          const notif = demoData.DEMO_NOTIFICATIONS.notifications.find(
            (n) => n._id === notifIdMatch[1]
          );
          if (notif) {
            notif.isRead = true;
            notif.read = true;
          }
        }
        mutationResponse = { success: true, message: "Notification marked as read (Demo)" };
      }

      return {
        ok: true,
        status: 200,
        json: async () => mutationResponse,
      };
    }

    // ── GET REQUEST INTERCEPTORS (ALL STATIC/OFFLINE PREVIEWS) ──
    let responseData = null;

    // Vibes: Highlights & Stories (Live School App Vibes visible to demo/non-logged-in users)
    if (url.includes("/vibes/highlights")) {
      try {
        const sep = url.includes("?") ? "&" : "?";
        const targetUrl = url.includes("demo=true") ? url : `${url}${sep}demo=true`;
        const res = await fetch(targetUrl, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          return {
            ok: true,
            status: 200,
            json: async () => json,
          };
        }
      } catch (err) {
        if (__DEV__) console.warn("[apiFetch] Demo highlights live fetch error:", err);
      }
      const demoVisible = (demoData.DEMO_VIBES_POSTS || []).filter((v) => v.isVisibleToDemo);
      responseData = {
        success: true,
        data: {
          official: demoVisible.slice(0, 2),
          achievements: demoVisible.filter((v) => v.category === "achievement"),
          stories: demoVisible,
          totalActiveStories: demoVisible.length,
        },
      };
    } else if (url.includes("/vibes/spotlight")) {
      try {
        const sep = url.includes("?") ? "&" : "?";
        const targetUrl = url.includes("demo=true") ? url : `${url}${sep}demo=true`;
        const res = await fetch(targetUrl, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          return {
            ok: true,
            status: 200,
            json: async () => json,
          };
        }
      } catch (err) {
        if (__DEV__) console.warn("[apiFetch] Demo spotlight live fetch error:", err);
      }
      const demoVisible = (demoData.DEMO_VIBES_POSTS || []).filter((v) => v.isVisibleToDemo);
      responseData = {
        success: true,
        data: demoVisible.find((v) => v.isSpotlight) || demoVisible[0] || null,
      };
    } else if (url.includes("/vibes/user/my-vibes") || url.includes("/vibes/user/saved")) {
      responseData = {
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 10, pages: 0, hasMore: false },
      };
    } else if (
      url.includes("/vibes/admin/pending") ||
      url.includes("/vibes/admin/moderation") ||
      url.includes("/vibes/moderation")
    ) {
      const statusMatch = url.match(/[?&]status=([^&]+)/);
      const requestedStatus = statusMatch
        ? decodeURIComponent(statusMatch[1])
        : "pending";
      const allPosts = demoData.DEMO_VIBES_POSTS || [];
      const filteredPosts =
        requestedStatus === "all"
          ? allPosts
          : allPosts.filter((v) => v.status === requestedStatus);
      const pendingPosts = allPosts.filter((v) => v.status === "pending");
      const approvedPosts = allPosts.filter((v) => v.status === "approved");
      const rejectedPosts = allPosts.filter((v) => v.status === "rejected");

      responseData = {
        success: true,
        data: filteredPosts,
        vibes: filteredPosts,
        counts: {
          pending: pendingPosts.length,
          approved: approvedPosts.length,
          rejected: rejectedPosts.length,
        },
        pendingCount: pendingPosts.length,
        approvedCount: approvedPosts.length,
        rejectedCount: rejectedPosts.length,
        pagination: {
          total: filteredPosts.length,
          page: 1,
          limit: 20,
          pages: 1,
          hasMore: false,
        },
      };
    } else if (url.includes("/vibes") && url.includes("/comments")) {
      try {
        const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (res.ok) {
          const json = await res.json();
          return { ok: true, status: 200, json: async () => json };
        }
      } catch {}
      responseData = {
        success: true,
        data: demoData.DEMO_VIBES_COMMENTS || [],
        comments: demoData.DEMO_VIBES_COMMENTS || [],
        pagination: {
          total: (demoData.DEMO_VIBES_COMMENTS || []).length,
          page: 1,
          limit: 20,
          pages: 1,
          hasMore: false,
        },
      };
    } else if (url.includes("/vibes")) {
      try {
        const sep = url.includes("?") ? "&" : "?";
        const targetUrl = url.includes("demo=true") ? url : `${url}${sep}demo=true`;
        const res = await fetch(targetUrl, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          return {
            ok: true,
            status: 200,
            json: async () => json,
          };
        }
      } catch (err) {
        if (__DEV__) console.warn("[apiFetch] Demo vibes live feed error:", err);
      }
      const demoVisible = (demoData.DEMO_VIBES_POSTS || []).filter((v) => v.isVisibleToDemo);
      responseData = {
        success: true,
        data: demoVisible,
        pagination: {
          total: demoVisible.length,
          page: 1,
          limit: 20,
          pages: 1,
          hasMore: false,
        },
      };
    } else if (url.includes("/auth/me")) {
      let activeUser = demoData.DEMO_USER;
      try {
        const storedUser = await storage.getItem("@auth_user");
        if (storedUser) {
          activeUser = JSON.parse(storedUser);
        }
      } catch {
        // fallback to default
      }
      responseData = { user: activeUser };
    } else if (url.includes("/reports/history/me")) {
      responseData = demoData.DEMO_STUDENT_HISTORY;
    } else if (
      url.includes("/attendance/student/") &&
      url.includes("/summary")
    ) {
      responseData = demoData.DEMO_ATTENDANCE_SUMMARY;
    } else if (url.includes("/attendance/student/")) {
      responseData = demoData.DEMO_ATTENDANCE_HISTORY;
    } else if (url.includes("/attendance/school-summary")) {
      responseData = {
        success: true,
        data: {
          students: { total: 450, present: 420, absent: 30 },
          teachers: { total: 25, present: 24, absent: 1 },
          absentList: [],
        },
      };
    } else if (url.includes("/attendance/staff-list")) {
      responseData = { success: true, data: demoData.DEMO_STAFF_LIST };
    } else if (url.includes("/attendance/classes-marked")) {
      responseData = { success: true, markedClasses: demoData.DEMO_CLASSES_MARKED };
    } else if (url.includes("/attendance/missing-tracker")) {
      responseData = demoData.DEMO_MISSING_TRACKER;
    } else if (url.includes("/attendance/my-attendance")) {
      responseData = {
        success: true,
        attendance: demoData.DEMO_ATTENDANCE_HISTORY.attendance,
        summary: demoData.DEMO_ATTENDANCE_SUMMARY,
        pagination: { total: 75, page: 1, limit: 30, pages: 3, hasMore: false },
      };
    } else if (
      url.includes("/attendance/class/") ||
      url.includes("/attendance/subject/")
    ) {
      responseData = demoData.DEMO_CLASS_DETAILS.students.map((s) => ({
        student: s,
        status: "present",
        remarks: "",
      }));
    } else if (url.includes("/classes/admin/init")) {
      responseData = demoData.DEMO_ADMIN_INIT;
    } else if (url.includes("/classes/") && url.includes("/full-details")) {
      responseData = demoData.DEMO_CLASS_DETAILS;
    } else if (url.includes("/classes/") && url.includes("/students")) {
      responseData = demoData.DEMO_STUDENTS;
    } else if (url.includes("/classes/") && url.includes("/subjects")) {
      responseData = demoData.DEMO_CLASS_DETAILS.subjects;
    } else if (url.includes("/classes/") && url.includes("/content")) {
      responseData = demoData.DEMO_SUBJECT_CONTENT;
    } else if (url.includes("/classes")) {
      responseData = demoData.DEMO_CLASSES || [];
    } else if (url.includes("/reports/student/")) {
      responseData = demoData.DEMO_REPORT_CARD;
    } else if (url.includes("/reports/insights/")) {
      responseData = demoData.DEMO_INSIGHTS;
    } else if (url.includes("/timetable/my-schedule")) {
      const teacherScheduleMap = {};
      (demoData.DEMO_TIMETABLE?.schedule || []).forEach((dayObj) => {
        teacherScheduleMap[dayObj.day] = (dayObj.periods || [])
          .filter((p) => p.type !== "break")
          .map((p) => ({
            ...p,
            className: p.className || "Class 10-A",
            subject: p.subject || { name: "Mathematics" },
            startTime: p.startTime || "09:00 AM",
            endTime: p.endTime || "09:45 AM",
            roomNumber: p.roomNumber || "301",
          }));
      });
      teacherScheduleMap.schedule = demoData.DEMO_TIMETABLE.schedule;
      responseData = teacherScheduleMap;
    } else if (url.includes("/timetable/my-timetable") || url.includes("/timetable")) {
      responseData = demoData.DEMO_TIMETABLE;
    } else if (
      url.includes("/fees/analytics") ||
      url.includes("/fees/summary") ||
      url.includes("/fees/school")
    ) {
      responseData = demoData.DEMO_FEE_ANALYTICS;
    } else if (url.includes("/fees/student/")) {
      responseData = demoData.DEMO_FEES;
    } else if (url.includes("/fees/structure")) {
      responseData = { success: true, structures: [] };
    } else if (
      url.includes("/exams/schedule/student") ||
      url.includes("/exams/schedule/class/")
    ) {
      responseData = demoData.DEMO_EXAMS;
    } else if (url.includes("/exams/standardized")) {
      responseData = demoData.DEMO_STANDARDIZED_EXAMS;
    } else if (url.includes("/exams/teacher/dashboard")) {
      responseData = demoData.DEMO_TEACHER_EXAM_DASHBOARD;
    } else if (
      url.includes("/exams/performance/school") ||
      url.includes("/exams/performance/class") ||
      url.includes("/exams/performance/subject")
    ) {
      responseData = demoData.DEMO_SCHOOL_EXAM_PERFORMANCE;
    } else if (url.includes("/marks/exam/") && url.includes("/status")) {
      responseData = {
        success: true,
        isEntered: true,
        totalStudents: 42,
        enteredCount: 42,
        approved: false,
      };
    } else if (url.includes("/marks/exam/")) {
      responseData = demoData.DEMO_EXAM_MARKS;
    } else if (url.includes("/marks/analytics/school/students")) {
      responseData = {
        totalStudents: 450,
        rankings: demoData.DEMO_STUDENT_RANKINGS,
        students: demoData.DEMO_STUDENT_RANKINGS,
      };
    } else if (url.includes("/marks/analytics/class/")) {
      responseData = {
        totalStudents: 15,
        statistics: { average: 83.4, highest: 98.0, lowest: 54.0 },
        gradeDistribution: { "A+": 5, A: 6, "B+": 3, B: 1, C: 0 },
        studentRankings: demoData.DEMO_STUDENT_RANKINGS.slice(0, 15),
      };
    } else if (
      url.match(/\/exams\/[^/?#]+$/) &&
      !url.includes("/exams/schedule") &&
      !url.includes("/exams/standardized")
    ) {
      responseData = {
        _id: "demo_exam_01",
        name: "Mid-Term Examination 2026",
        subject: { _id: "sub_001", name: "Mathematics", code: "MATH-10" },
        class: { _id: demoData.DEMO_CLASS_ID, name: "10", section: "A" },
        maxMarks: 100,
        passingMarks: 35,
        date: "2026-10-15T09:00:00.000Z",
        status: "scheduled",
      };
    } else if (url.includes("/leaves/my-leaves")) {
      responseData = demoData.DEMO_LEAVES;
    } else if (url.includes("/leaves/requests")) {
      responseData = {
        success: true,
        requests: demoData.DEMO_LEAVE_REQUESTS,
        leaves: demoData.DEMO_LEAVE_REQUESTS,
        total: demoData.DEMO_LEAVE_REQUESTS.length,
      };
    } else if (url.includes("/leaves/daily-stats")) {
      responseData = demoData.DEMO_LEAVE_STATS;
    } else if (url.includes("/leaves/balance")) {
      responseData = demoData.DEMO_LEAVE_BALANCE;
    } else if (url.includes("/student-ratings/my-subjects")) {
      responseData = demoData.DEMO_TEACHER_RATING_SUBJECTS;
    } else if (url.includes("/student-ratings/tracker/my-status")) {
      responseData = {
        total: 2,
        completed: 1,
        pending: 1,
        subjects: demoData.DEMO_TEACHER_RATING_SUBJECTS.subjects,
      };
    } else if (url.includes("/student-ratings/subject/")) {
      responseData = demoData.DEMO_SUBJECT_RATINGS_DATA;
    } else if (url.includes("/student-ratings/school/summary")) {
      responseData = demoData.DEMO_ADMIN_RATINGS_SUMMARY;
    } else if (url.includes("/student-ratings/class/") && url.includes("/summary")) {
      responseData = demoData.DEMO_CLASS_RATINGS_SUMMARY;
    } else if (url.includes("/student-ratings/school/movers")) {
      responseData = demoData.DEMO_MOVERS_DATA;
    } else if (url.includes("/student-ratings/tracker")) {
      responseData = demoData.DEMO_RATINGS_TRACKER;
    } else if (url.includes("/student-ratings/student/") && url.includes("/details")) {
      responseData = {
        student: demoData.DEMO_STUDENTS[0],
        overallAverage: 4.75,
        ratings: demoData.DEMO_CLASS_RATINGS_SUMMARY.students[0].ratings,
      };
    } else if (url.includes("/student-ratings/student/") && url.includes("/trend")) {
      responseData = {
        trend: [
          { month: "Jun", average: 4.2 },
          { month: "Jul", average: 4.3 },
          { month: "Aug", average: 4.5 },
          { month: "Sep", average: 4.6 },
          { month: "Oct", average: 4.75 },
        ],
      };
    } else if (url.includes("/teachers/my-subjects")) {
      responseData = demoData.DEMO_TEACHER_SUBJECTS;
    } else if (url.includes("/teachers/my-classes-and-subjects")) {
      responseData = {
        classes: demoData.DEMO_CLASSES,
        subjects: demoData.DEMO_CLASS_DETAILS.subjects,
        asClassTeacher: [
          {
            _id: demoData.DEMO_CLASS_ID,
            name: "10",
            section: "A",
            academicYear: "2026-2027",
            totalStudents: 42,
          },
        ],
        asSubjectTeacher: [
          {
            class: { _id: demoData.DEMO_CLASS_ID, name: "10", section: "A" },
            subject: { _id: "sub_001", name: "Mathematics", code: "MATH-10" },
          },
          {
            class: { _id: "class_10b", name: "10", section: "B" },
            subject: { _id: "sub_001", name: "Mathematics", code: "MATH-10" },
          },
        ],
        allMySubjects: [
          {
            _id: "sub_001",
            name: "Mathematics",
            code: "MATH-10",
            class: { _id: demoData.DEMO_CLASS_ID, name: "10", section: "A" },
          },
          {
            _id: "sub_002",
            name: "Physics",
            code: "PHY-10",
            class: { _id: demoData.DEMO_CLASS_ID, name: "10", section: "A" },
          },
        ],
      };
    } else if (url.includes("/teachers/admin/teacher-subject-matrix")) {
      responseData = demoData.DEMO_TEACHER_SUBJECT_MATRIX;
    } else if (url.includes("/teachers/") && url.includes("/classes")) {
      responseData = demoData.DEMO_CLASSES;
    } else if (
      (url.includes("/subjects") || url.includes("/classes")) &&
      url.includes("/content")
    ) {
      responseData = demoData.DEMO_SUBJECT_CONTENT;
    } else if (url.includes("/subjects")) {
      responseData = demoData.DEMO_SUBJECTS;
    } else if (url.includes("/complaints/my-complaints") || url.includes("/complaints/inbox")) {
      responseData = demoData.DEMO_COMPLAINTS;
    } else if (url.includes("/complaints")) {
      responseData = demoData.DEMO_COMPLAINTS;
    } else if (
      url.includes("/feedback/my") ||
      url.includes("/feedback/sent") ||
      url.includes("/feedback/all")
    ) {
      responseData = demoData.DEMO_FEEDBACK;
    } else if (url.includes("/feedback")) {
      responseData = demoData.DEMO_FEEDBACK;
    } else if (url.includes("/notifications/cron-logs")) {
      responseData = demoData.DEMO_CRON_LOGS;
    } else if (url.includes("/notifications")) {
      if (demoData.DEMO_NOTIFICATIONS?.notifications) {
        demoData.DEMO_NOTIFICATIONS.notifications.forEach((n) => {
          if (n.isRead === undefined) {
            n.isRead = n.read !== undefined ? n.read : false;
          }
        });
        demoData.DEMO_NOTIFICATIONS.unreadCount = demoData.DEMO_NOTIFICATIONS.notifications.filter(
          (n) => !n.isRead
        ).length;
      }
      responseData = demoData.DEMO_NOTIFICATIONS;
    } else if (url.includes("/dashboard/student")) {
      responseData = demoData.DEMO_STUDENT_DASHBOARD;
    } else if (url.includes("/dashboard/teacher")) {
      responseData = demoData.DEMO_TEACHER_DASHBOARD;
    } else if (url.includes("/dashboard/admin")) {
      responseData = demoData.DEMO_ADMIN_DASHBOARD;
    } else if (url.includes("/academic-year")) {
      responseData = demoData.DEMO_ACADEMIC_YEARS;
    } else if (url.includes("/events")) {
      responseData = demoData.DEMO_EVENTS;
    } else if (url.includes("/search/global") || url.includes("/users/search")) {
      responseData = demoData.DEMO_STUDENTS.map((s) => ({
        _id: s._id,
        name: s.name,
        role: "student",
        label: `${s.name} (${s.rollNumber})`,
        class: s.currentClass,
      }));
    } else if (url.includes("/users")) {
      let allUsers = demoData.DEMO_ALL_USERS || [];
      const roleMatch = url.match(/[?&]role=([^&]+)/);
      const searchMatch = url.match(/[?&]search=([^&]+)/);
      const role = roleMatch ? decodeURIComponent(roleMatch[1]) : "all";
      const search = searchMatch ? decodeURIComponent(searchMatch[1]) : "";

      if (role && role !== "all") {
        allUsers = allUsers.filter((u) => u.role === role);
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        allUsers = allUsers.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.rollNumber?.toLowerCase().includes(q)
        );
      }

      responseData = {
        success: true,
        data: allUsers,
        users: allUsers,
        pagination: {
          total: allUsers.length,
          page: 1,
          limit: 20,
          pages: 1,
          hasMore: false,
        },
      };
    } else if (url.includes("/schoolInfo") || url.includes("/school")) {
      responseData = {
        success: true,
        data: {
          name: "Shri Guru Vidyapeeth",
          address: "Navanagar, Hubballi - 580025",
          phone: "+91 836 225 4321",
          email: "info@sgv.edu.in",
          mission:
            "Holistic, value-based education combining traditional wisdom with modern excellence.",
        },
      };
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

  if (token && !headers["Authorization"] && !headers["authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Inject Time-Travel Context Header for Super Admins
  try {
    const userStr = await storage.getItem("@auth_user");
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user?.role === "super admin";

    if (isSuperAdmin) {
      const storedYearStr = await storage.getItem("selectedAcademicYear");
      if (storedYearStr) {
        const storedYear = JSON.parse(storedYearStr);
        if (storedYear && storedYear._id) {
          headers["x-academic-year"] = storedYear._id;
        }
      }
    }
  } catch (err) {
    console.warn("apiFetch: Could not attach x-academic-year context", err);
  }

  const controller = new global.AbortController();
  const timeoutMs = init.timeout || 30000;
  const timeoutId = global.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(input, {
      ...fetchInit,
      headers,
      signal: fetchInit.signal || controller.signal,
    });
    global.clearTimeout(timeoutId);
  } catch (err) {
    global.clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new TypeError("Network request timed out");
    }
    throw err;
  }

  // Intercept response headers to check if academic year has been updated on backend
  try {
    const activeYearHeader = response.headers.get("x-active-academic-year");
    if (activeYearHeader && activeYearHeader.trim()) {
      let activeYear;
      try {
        activeYear = JSON.parse(activeYearHeader);
      } catch (parseErr) {
        console.warn(
          "apiFetch: Malformed x-active-academic-year header, skipping",
          parseErr
        );
        activeYear = null;
      }
      if (activeYear && activeYear._id) {
        const storedYearStr = await storage.getItem("selectedAcademicYear");
        const storedYear = storedYearStr ? JSON.parse(storedYearStr) : null;

        const userStr = await storage.getItem("@auth_user");
        const user = userStr ? JSON.parse(userStr) : null;
        const isSuperAdmin = user?.role === "super admin";

        // Non-Super Admins MUST be forced to the active year if it differs
        if (!isSuperAdmin) {
          if (!storedYear || storedYear._id !== activeYear._id) {
            if (__DEV__) {
              console.log(
                `[apiFetch] Backend forced academic year context update to: ${activeYear.name}`
              );
            }

            // 1. Update AsyncStorage
            await storage.setItem(
              "selectedAcademicYear",
              JSON.stringify(activeYear)
            );

            // 2. Update React Context state immediately
            const {
              notifyAcademicYearChange,
            } = require("../context/AcademicYearContext");
            notifyAcademicYearChange(activeYear);

            // 3. Invalidate React Query caches to trigger UI refresh
            const { queryClient } = require("./queryClient");
            queryClient.invalidateQueries();
          }
        }
      }
    }
  } catch (err) {
    console.warn("apiFetch: Error checking/syncing active year header", err);
  }

  return response;
}
