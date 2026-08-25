export const TIMEZONE = "Asia/Kolkata";

/**
 * Converts any Date object, ISO string, or timestamp into YYYY-MM-DD string in Asia/Kolkata (IST).
 * This eliminates timezone drift and early-morning/late-night shifting.
 * @param {Date|string|number} dateInput
 * @returns {string} e.g. "2026-08-19"
 */
export const getISTDateString = (dateInput = new Date()) => {
  if (!dateInput) return "";
  if (
    typeof dateInput === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
  ) {
    return dateInput.trim();
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

/**
 * Returns today's date string (YYYY-MM-DD) in Asia/Kolkata.
 * @returns {string} e.g. "2026-08-19"
 */
export const getISTToday = () => {
  return getISTDateString(new Date());
};

/**
 * Checks if a date falls on a Sunday in Asia/Kolkata (IST).
 * @param {Date|string|number} dateInput
 * @returns {boolean}
 */
export const isISTSunday = (dateInput) => {
  if (!dateInput) return false;
  let d;
  if (
    typeof dateInput === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
  ) {
    d = new Date(`${dateInput.trim()}T12:00:00+05:30`);
  } else {
    d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  }
  if (isNaN(d.getTime())) return false;

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(d);

  return weekday === "Sun";
};

/**
 * Formats a date string or object into "DD-MM-YYYY" format in Asia/Kolkata (IST).
 * @param {string | Date} dateInput - The date to format.
 * @returns {string} - The formatted date string (e.g., "19-08-2026").
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return "";
  try {
    // If it's already a YYYY-MM-DD string, format directly without timezone skew
    if (
      typeof dateInput === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
    ) {
      const [y, m, d] = dateInput.trim().split("-");
      return `${d}-${m}-${y}`;
    }

    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // en-IN format is DD/MM/YYYY
    return formatter.format(d).replace(/\//g, "-");
  } catch {
    return String(dateInput);
  }
};

/**
 * Alias for formatDate
 */
export const formatIndianDate = formatDate;

/**
 * Formats a date for UI display in IST (e.g., "Wed, 19 Aug 2026").
 * @param {string | Date} dateInput
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export const formatISTDisplayDate = (
  dateInput,
  options = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }
) => {
  if (!dateInput) return "";
  try {
    let d;
    if (
      typeof dateInput === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
    ) {
      d = new Date(`${dateInput.trim()}T12:00:00+05:30`);
    } else {
      d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    }
    if (isNaN(d.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: TIMEZONE,
      ...options,
    }).format(d);
  } catch {
    return String(dateInput);
  }
};
