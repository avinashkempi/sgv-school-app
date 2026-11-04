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
 * Extracts year and 1-based month in Asia/Kolkata.
 * @param {Date|string|number} [dateInput]
 * @returns {{ year: number, month: number }}
 */
export const getISTMonthYear = (dateInput = new Date()) => {
  const dateStr = getISTDateString(dateInput) || getISTToday();
  const [year, month] = dateStr.split("-").map(Number);
  return { year, month };
};

/**
 * Extracts year and 1-based month for the previous month in Asia/Kolkata (IST).
 * Used for defaulting monthly rating views to the most recently completed/rated month.
 * @param {Date|string|number} [dateInput]
 * @returns {{ year: number, month: number }}
 */
export const getPreviousMonthYear = (dateInput = new Date()) => {
  const { year, month } = getISTMonthYear(dateInput);
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
};

/**
 * Returns weekday name (e.g. "Monday", "Tuesday") in Asia/Kolkata.
 * @param {Date|string|number} [dateInput]
 * @returns {string}
 */
export const getISTDayOfWeek = (dateInput = new Date()) => {
  const d = typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
    ? new Date(`${dateInput.trim()}T12:00:00+05:30`)
    : dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (isNaN(d.getTime())) return "Monday";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(d);
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

/**
 * Accurately calculates leave days between two dates in IST without fractional roundings.
 * @param {string | Date} startDate
 * @param {string | Date} endDate
 * @param {string} [leaveType]
 * @returns {string} e.g. "1 Day" or "3 Days" or "0.5 Day"
 */
export const calculateLeaveDays = (startDate, endDate, leaveType) => {
  if (leaveType === "half") return "0.5 Day";
  const startStr = getISTDateString(startDate);
  const endStr = getISTDateString(endDate);
  if (!startStr || !endStr) return "1 Day";

  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);

  const sUtc = Date.UTC(sy, sm - 1, sd);
  const eUtc = Date.UTC(ey, em - 1, ed);

  const diffDays = Math.round(Math.abs(eUtc - sUtc) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays === 1 ? "1 Day" : `${diffDays} Days`;
};

/**
 * Computes human-friendly relative label ("Today", "Tomorrow", "Yesterday", or "In X days") in IST.
 * @param {string | Date} dateInput
 * @returns {string}
 */
export const getISTRelativeDateLabel = (dateInput) => {
  const dateStr = getISTDateString(dateInput);
  const todayStr = getISTToday();
  if (!dateStr || !todayStr) return "";

  if (dateStr === todayStr) return "Today";

  const [tY, tM, tD] = todayStr.split("-").map(Number);
  const [eY, eM, eD] = dateStr.split("-").map(Number);

  const tUtc = Date.UTC(tY, tM - 1, tD);
  const eUtc = Date.UTC(eY, eM - 1, eD);

  const diffDays = Math.round((eUtc - tUtc) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)}d ago`;

  return formatISTDisplayDate(dateStr);
};
