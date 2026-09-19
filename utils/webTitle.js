import React from "react";
import { Platform } from "react-native";
import { Helmet } from "expo-router/vendor/react-helmet-async/lib";

/**
 * Route-to-title mapping for web browser tab titles.
 * Provides clean, human-readable titles formatted with the "SGV School" branding.
 */
const ROUTE_TITLES = {
  "": "SGV School",
  index: "SGV School",
  login: "Login | SGV School",
  menu: "Menu | SGV School",
  events: "Events & Calendar | SGV School",
  history: "History | SGV School",
  profile: "Profile | SGV School",
  requests: "Requests | SGV School",
  subjects: "Subjects | SGV School",
  vibes: "School Vibes | SGV School",
  notifications: "Notifications | SGV School",
  complaints: "Complaints | SGV School",
  "complaints/raise": "Raise Complaint | SGV School",
  "complaints/give-feedback": "Give Feedback | SGV School",

  // Student portal routes
  student: "Student Portal | SGV School",
  "student/class": "My Class | SGV School",
  "student/fees": "Fees | SGV School",
  "student/leaves": "Leave Requests | SGV School",
  "student/timetable": "Timetable | SGV School",
  "student/attendance": "Attendance | SGV School",
  "student/report-card": "Report Card | SGV School",
  "student/exam-schedule": "Exam Schedule | SGV School",
  "student/history": "Academic History | SGV School",

  // Teacher portal routes
  teacher: "Teacher Portal | SGV School",
  "teacher/dashboard": "Teacher Dashboard | SGV School",
  "teacher/classes": "Teacher Classes | SGV School",
  "teacher/leaves": "Teacher Leaves | SGV School",
  "teacher/timetable": "Teacher Timetable | SGV School",
  "teacher/attendance": "Attendance Management | SGV School",
  "teacher/schedule": "Teaching Schedule | SGV School",
  "teacher/assessments": "Assessments | SGV School",
  "teacher/marks-entry": "Marks Entry | SGV School",
  "teacher/exams-dashboard": "Exams Dashboard | SGV School",
  "teacher/class/attendance": "Class Attendance | SGV School",
  "teacher/class/performance": "Class Performance | SGV School",
  "teacher/exam/enter-marks": "Enter Marks | SGV School",
  "teacher/subject/create-exam": "Create Exam | SGV School",
  "teacher/subject/performance": "Subject Performance | SGV School",

  // Admin portal routes
  admin: "Admin Portal | SGV School",
  "admin/fees": "Fee Management | SGV School",
  "admin/leaves": "Leave Management | SGV School",
  "admin/classes": "Class Management | SGV School",
  "admin/subjects": "Subject Management | SGV School",
  "admin/timetable": "Timetable Management | SGV School",
  "admin/attendance": "Attendance Analytics | SGV School",
  "admin/performance": "Performance Analytics | SGV School",
  "admin/academic-year": "Academic Year | SGV School",
  "admin/exam-schedule": "Exam Schedule | SGV School",
  "admin/exam-analytics": "Exam Analytics | SGV School",
  "admin/vibe-approvals": "Vibe Approvals | SGV School",
  "admin/teacher-subjects": "Teacher Subjects | SGV School",
  "admin/send-notification": "Send Notification | SGV School",
  "admin/import-data": "Import Data | SGV School",

  // Super Admin routes
  "super-admin": "Super Admin | SGV School",
  "super-admin/academic-years": "Academic Years | SGV School",
  "super-admin/create-year": "Create Academic Year | SGV School",
  "super-admin/year-details": "Academic Year Details | SGV School",
  "super-admin/year-comparison": "Year Comparison | SGV School",
  "super-admin/transition-wizard": "Transition Wizard | SGV School",

  // Shared
  "shared/class-reports": "Class Reports | SGV School",
};

function formatSegment(seg) {
  if (!seg) return "";
  const cleaned = seg.replace(/^\[.*\]$/, "").replace(/[-_]+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Returns formatted web tab title string based on active route segments.
 */
export function getWebTitle(segments = []) {
  const clean = (segments || []).filter(Boolean);
  const pathKey = clean.join("/").replace(/\/index$/, "");

  if (ROUTE_TITLES[pathKey]) {
    return ROUTE_TITLES[pathKey];
  }

  if (clean.length === 0) {
    return "SGV School";
  }

  // Check from specific to general if dynamic params are present
  for (let i = clean.length - 1; i >= 0; i--) {
    const formatted = formatSegment(clean[i]);
    if (formatted) {
      return `${formatted} | SGV School`;
    }
  }

  return "SGV School";
}

/**
 * Safely updates document.title in web environments.
 */
export function updateWebDocumentTitle(segments = []) {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const title = getWebTitle(segments);
    if (document.title !== title) {
      document.title = title;
    }
  }
}

/**
 * Renders Helmet title directly into React Helmet Async context,
 * ensuring SSR and Static Web export populate the <head> tag properly.
 */
export function WebHeadTitle({ title }) {
  if (Platform.OS !== "web") return null;
  return React.createElement(
    Helmet,
    null,
    React.createElement("title", null, title || "SGV School")
  );
}
