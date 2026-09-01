import { Linking } from "react-native";

/**
 * Normalizes input which can be an in-app notification document or a push notification data payload.
 */
function normalizePayload(input) {
  if (!input || typeof input !== "object") return {};

  const payload = { ...input };

  // If metadata is stringified JSON (from FCM data), parse it
  if (typeof payload.metadata === "string" && payload.metadata.startsWith("{")) {
    try {
      payload.metadata = JSON.parse(payload.metadata);
    } catch {
      // Keep as string if parsing fails
    }
  }

  // If actionData is stringified JSON, parse it
  if (
    typeof payload.actionData === "string" &&
    (payload.actionData.startsWith("{") || payload.actionData.startsWith("["))
  ) {
    try {
      payload.actionData = JSON.parse(payload.actionData);
    } catch {
      // Keep as string if parsing fails
    }
  }

  return payload;
}

/**
 * Resolves a notification or push data payload into a concrete target route or action.
 *
 * @param {Object} dataOrNotification - The notification object or push data payload
 * @param {string} [userRole='student'] - Current logged-in user role ('student', 'teacher', 'admin', 'super admin', 'staff', 'support_staff')
 * @param {Object} [options={}] - Extra resolution options
 * @param {boolean} [options.fallbackToNotifications=false] - If true, returns '/notifications' when no specific route is found
 * @returns {{ type: 'navigate' | 'external_link' | 'none', route?: string, url?: string }}
 */
export function resolveNotificationRoute(
  dataOrNotification,
  userRole = "student",
  options = {}
) {
  const { fallbackToNotifications = false } = options;
  const data = normalizePayload(dataOrNotification);

  const actionType = (data.actionType || "").toLowerCase();
  const actionData = data.actionData;
  const category = (data.category || "").toLowerCase();
  const type = (data.type || data.notificationType || "").toLowerCase();
  const title = (data.title || "").toLowerCase();
  const message = (data.message || data.body || "").toLowerCase();
  const metadata = data.metadata || {};
  const role = (userRole || "student").toLowerCase();
  const isAdminRole = role === "admin" || role === "super admin";
  const isTeacherRole = role === "teacher";
  const isStudentRole = role === "student";

  // 1. External link action
  if (actionType === "external_link" && typeof actionData === "string") {
    if (actionData.startsWith("http://") || actionData.startsWith("https://")) {
      return { type: "external_link", url: actionData };
    }
  }
  if (typeof data.url === "string" && (data.url.startsWith("http://") || data.url.startsWith("https://"))) {
    return { type: "external_link", url: data.url };
  }

  // 2. Explicit internal navigation action
  if (actionType === "navigate" && typeof actionData === "string" && actionData.startsWith("/")) {
    // Safety check: Don't route non-admins to admin routes directly
    if (actionData.startsWith("/admin") && !isAdminRole) {
      if (actionData.includes("leave")) {
        return { type: "navigate", route: isTeacherRole ? "/teacher/leaves" : "/student/leaves" };
      }
      if (actionData.includes("fee")) {
        return { type: "navigate", route: "/student/fees" };
      }
      if (actionData.includes("vibe")) {
        return { type: "navigate", route: "/vibes" };
      }
      if (actionData.includes("class")) {
        return { type: "navigate", route: isTeacherRole ? "/teacher/classes" : "/student/class" };
      }
      return { type: "navigate", route: "/notifications" };
    }
    return { type: "navigate", route: actionData };
  }

  // Explicit route / screen in payload
  if (typeof data.route === "string" && data.route.startsWith("/")) {
    return { type: "navigate", route: data.route };
  }

  // 3. Category & Type Smart Role-Aware Routing

  // ── Leaves ──
  if (category === "leave" || type === "leave" || title.includes("leave") || message.includes("leave request")) {
    if (isAdminRole) return { type: "navigate", route: "/admin/leaves" };
    if (isTeacherRole) return { type: "navigate", route: "/teacher/leaves" };
    return { type: "navigate", route: "/student/leaves" };
  }

  // ── Fees ──
  if (category === "fee" || type === "fee" || title.includes("fee") || message.includes("fee balance") || message.includes("fee structure")) {
    if (isAdminRole) return { type: "navigate", route: "/admin/fees" };
    if (isStudentRole) return { type: "navigate", route: "/student/fees" };
    return { type: "navigate", route: "/notifications" };
  }

  // ── Exams / Marks / Report Cards ──
  if (category === "exam" || type === "exam" || title.includes("exam") || title.includes("marks") || message.includes("exam") || message.includes("marks")) {
    const isMarksOrResult =
      title.includes("marks") ||
      title.includes("result") ||
      title.includes("report card") ||
      message.includes("marks") ||
      message.includes("report card") ||
      metadata.marksId ||
      data.marksId;

    if (isMarksOrResult) {
      if (isAdminRole) return { type: "navigate", route: "/admin/exam-analytics" };
      if (isTeacherRole) return { type: "navigate", route: "/teacher/marks-entry" };
      return { type: "navigate", route: "/student/report-card" };
    }

    // Exam schedule / notification
    if (isAdminRole) return { type: "navigate", route: "/admin/exam-schedule" };
    if (isTeacherRole) return { type: "navigate", route: "/teacher/exams-dashboard" };
    return { type: "navigate", route: "/student/exam-schedule" };
  }

  // ── Homework / Class Content / Study Notes / Notices ──
  if (
    category === "homework" ||
    type === "homework" ||
    type === "class_content" ||
    title.includes("homework") ||
    title.includes("study note") ||
    message.includes("class material") ||
    message.includes("homework")
  ) {
    const subjectId = metadata.subjectId || data.subjectId;
    const classId = metadata.classId || data.classId;

    if (isAdminRole) return { type: "navigate", route: "/admin/classes" };
    if (isTeacherRole) {
      if (classId) return { type: "navigate", route: `/teacher/class/${classId}` };
      return { type: "navigate", route: "/teacher/classes" };
    }
    if (subjectId) {
      return { type: "navigate", route: `/student/class/subject/${subjectId}` };
    }
    return { type: "navigate", route: "/student/class" };
  }

  // ── Attendance ──
  if (category === "attendance" || type === "attendance" || title.includes("attendance") || message.includes("attendance")) {
    if (isAdminRole) return { type: "navigate", route: "/admin/attendance" };
    if (isTeacherRole) return { type: "navigate", route: "/teacher/attendance" };
    return { type: "navigate", route: "/student/attendance" };
  }

  // ── Timetable / Schedule ──
  if (category === "timetable" || category === "schedule" || title.includes("timetable") || message.includes("timetable") || message.includes("schedule")) {
    if (isAdminRole) return { type: "navigate", route: "/admin/timetable" };
    if (isTeacherRole) return { type: "navigate", route: "/teacher/timetable" };
    return { type: "navigate", route: "/student/timetable" };
  }

  // ── Events ──
  if (category === "event" || type === "event" || title.includes("event") || message.includes("event") || data.eventId || metadata.eventId) {
    return { type: "navigate", route: "/events" };
  }

  // ── Vibes / Stories / Approvals ──
  if (category === "vibe" || type === "vibe" || title.includes("vibe") || message.includes("vibe")) {
    if (isAdminRole && (title.includes("review") || title.includes("submitted") || message.includes("submitted"))) {
      return { type: "navigate", route: "/admin/vibe-approvals" };
    }
    return { type: "navigate", route: "/vibes" };
  }

  // ── Complaints / Support / Feedback ──
  if (category === "complaint" || type === "complaint" || title.includes("complaint") || message.includes("complaint") || title.includes("feedback")) {
    return { type: "navigate", route: "/complaints" };
  }

  // ── Announcements / Achievements / Birthday / Home ──
  if (
    category === "birthday" ||
    type === "birthday" ||
    category === "announcement" ||
    title.includes("birthday") ||
    title.includes("achievement")
  ) {
    return { type: "navigate", route: "/" };
  }

  // 4. Fallback resolution
  if (fallbackToNotifications) {
    return { type: "navigate", route: "/notifications" };
  }

  return { type: "none" };
}

/**
 * Handles full navigation execution for a notification tap or click.
 *
 * @param {Object} dataOrNotification - The notification or push payload
 * @param {Object} router - Expo router instance (useRouter())
 * @param {string} [userRole='student'] - Current user role
 * @param {Object} [options={}] - Options (e.g., fallbackToNotifications, replace)
 * @returns {Promise<boolean>} Whether navigation was performed
 */
export async function handleNotificationNavigation(
  dataOrNotification,
  router,
  userRole = "student",
  options = {}
) {
  if (!router) return false;

  const {
    fallbackToNotifications = false,
    replace = false,
    currentPath = "",
  } = options;

  try {
    const destination = resolveNotificationRoute(dataOrNotification, userRole, {
      fallbackToNotifications,
    });

    if (destination.type === "external_link" && destination.url) {
      const supported = await Linking.canOpenURL(destination.url);
      if (supported) {
        await Linking.openURL(destination.url);
        return true;
      }
      return false;
    }

    if (destination.type === "navigate" && destination.route) {
      // Avoid navigating to the same route if already on it
      if (currentPath && currentPath === destination.route) {
        return true;
      }

      if (replace) {
        router.replace(destination.route);
      } else {
        router.push(destination.route);
      }
      return true;
    }

    return false;
  } catch (err) {
    console.warn("[NotificationRouter] Navigation error:", err);
    if (fallbackToNotifications) {
      try {
        if (replace) {
          router.replace("/notifications");
        } else {
          router.push("/notifications");
        }
        return true;
      } catch {
        // Ignore fallback failure
      }
    }
    return false;
  }
}

export default {
  resolveNotificationRoute,
  handleNotificationNavigation,
};
