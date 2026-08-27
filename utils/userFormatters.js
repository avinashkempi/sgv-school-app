/**
 * Centralized User & Name Formatting Utilities
 *
 * Provides standardized Title Case formatting for user names, roles,
 * and designations across the entire application.
 */

const SMALL_WORDS = new Set([
  "of",
  "and",
  "the",
  "in",
  "at",
  "to",
  "for",
  "on",
  "by",
  "s/o",
  "d/o",
  "w/o",
  "c/o",
]);

/**
 * Converts any string into Title Case.
 * Handles ALL CAPS, lower case, mixed case, dots/initials, and hyphens.
 *
 * @param {string} str - Raw string
 * @returns {string} Title-cased string
 *
 * @example
 * toTitleCase("JOHN DOE")        // "John Doe"
 * toTitleCase("aman kumar")      // "Aman Kumar"
 * toTitleCase("r.k. sharma")     // "R.K. Sharma"
 * toTitleCase("mary-jane watson")// "Mary-Jane Watson"
 */
export function toTitleCase(str) {
  if (!str || typeof str !== "string") return typeof str === "string" ? str : "";
  const trimmed = str.trim();
  if (!trimmed) return "";

  // Split by whitespace while preserving structure
  return trimmed
    .split(/\s+/)
    .map((word, index) => {
      // Handle hyphenated words e.g. "mary-jane" -> "Mary-Jane"
      if (word.includes("-")) {
        return word
          .split("-")
          .map((subWord) => formatSingleWord(subWord, index))
          .join("-");
      }
      return formatSingleWord(word, index);
    })
    .join(" ");
}

/**
 * Formats a single word for Title Case.
 */
function formatSingleWord(word, index) {
  if (!word) return "";
  const lower = word.toLowerCase();

  // If connector word and not the very first word in the sentence
  if (index > 0 && SMALL_WORDS.has(lower)) {
    return lower;
  }

  // Handle dot initials like "r.k." or "dr."
  if (word.includes(".")) {
    return word
      .split(".")
      .map((part) => {
        if (!part) return "";
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(".");
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Format a user's name to Title Case.
 * Accepts either a string name or a user object { name: "..." }.
 *
 * @param {string|Object} userOrName - User name string or user object
 * @param {string} [fallback=""] - Fallback string if name is missing
 * @returns {string} Title-cased name
 */
export function formatUserName(userOrName, fallback = "") {
  if (!userOrName) return fallback;

  let rawName = "";
  if (typeof userOrName === "string") {
    rawName = userOrName;
  } else if (typeof userOrName === "object") {
    rawName = userOrName.name || userOrName.fullName || "";
  }

  if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
    return fallback;
  }

  return toTitleCase(rawName);
}

/**
 * Normalizes system role names into human-readable Title Case.
 *
 * @param {string} role - System role
 * @param {string} [fallback="Member"] - Fallback
 * @returns {string} Formatted role
 */
export function formatUserRole(role, fallback = "Member") {
  if (!role || typeof role !== "string") return fallback;
  const normalized = role.toLowerCase().trim();

  switch (normalized) {
    case "super admin":
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "teacher":
      return "Teacher";
    case "staff":
      return "Staff";
    case "support_staff":
    case "support staff":
      return "Support Staff";
    case "student":
      return "Student";
    case "alumni":
      return "Alumni";
    default:
      return toTitleCase(role.replace(/_/g, " "));
  }
}

/**
 * Safely parse student class or designation to a display string.
 * Never returns raw MongoDB ObjectIds (24-hex characters).
 *
 * @param {Object|string} currentClass - Class object or string
 * @returns {string|null} Display class name
 */
export function getClassDisplayName(currentClass) {
  if (!currentClass) return null;
  if (typeof currentClass === "object") {
    const raw =
      currentClass.label ||
      currentClass.name ||
      (currentClass.section ? `Sec ${currentClass.section}` : null);
    if (!raw) return null;
    return String(raw).trim();
  }
  if (typeof currentClass === "string") {
    if (/^[0-9a-fA-F]{24}$/.test(currentClass)) return null;
    return currentClass.trim();
  }
  return null;
}

/**
 * Displays Designation if present; otherwise falls back to Role (or student Class).
 * This is the standard display helper across the app (Vibes, Profile, Menu, Leaves, etc.).
 *
 * @param {Object|string} user - User object { designation, role, currentClass } or role string
 * @param {Object} [options={}] - Customization options
 * @param {boolean} [options.includeStudentClass=true] - Whether to append class name for students
 * @param {string} [options.fallback="Member"] - Fallback text
 * @returns {string} Display designation or role
 */
export function formatUserDesignationOrRole(user, options = {}) {
  const { includeStudentClass = true, fallback = "Member" } = options;

  if (!user) return fallback;

  if (typeof user === "string") {
    return formatUserRole(user, fallback);
  }

  // 1. If designation is present and non-empty, prioritize designation
  if (user.designation && typeof user.designation === "string" && user.designation.trim()) {
    return toTitleCase(user.designation.trim());
  }

  const role = user.role || user.applicantRole || user.authorRole;

  // 2. If student with class info
  if (role === "student" && includeStudentClass) {
    const classLabel = getClassDisplayName(user.currentClass || user.class);
    return classLabel ? `Student • ${classLabel}` : "Student";
  }

  // 3. Fallback to role
  if (role) {
    return formatUserRole(role, fallback);
  }

  return fallback;
}

/**
 * Specific helper for Vibes (posts, spotlight, stories, comments) author subtitle.
 * Shows "Official" for school broadcasts, designation if present, else role / student class.
 *
 * @param {Object} vibe - Vibe object or { author, postAs, authorRole }
 * @returns {string} Author subtitle
 */
export function formatVibeAuthorSubtitle(vibe) {
  if (!vibe) return "Member";

  // Official school post check
  if (vibe.postAs === "school" || vibe.isSchoolPost || vibe.category === "official") {
    return "Official";
  }

  const author = vibe.author || {};
  const role = vibe.authorRole || author.role;

  // 1. Designation if present
  if (author.designation && typeof author.designation === "string" && author.designation.trim()) {
    return toTitleCase(author.designation.trim());
  }

  // 2. Student with class
  if (role === "student") {
    const classLabel = getClassDisplayName(author.currentClass);
    return classLabel ? `Student • ${classLabel}` : "Student";
  }

  // 3. Role fallback
  if (role === "teacher") return "Teacher";
  if (role === "admin" || role === "super admin") return "Admin";
  if (role === "staff") return "Staff";
  if (role === "support_staff") return "Support Staff";

  return formatUserRole(role, "Member");
}

export default {
  toTitleCase,
  formatUserName,
  formatUserRole,
  getClassDisplayName,
  formatUserDesignationOrRole,
  formatVibeAuthorSubtitle,
};
