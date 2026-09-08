/**
 * Centralized Class Name Formatter
 *
 * Formats raw class names and numbers (e.g. "1", "2", "6", "10") into human-friendly
 * professional displays:
 * - Standard display: "Grade - 1", "Grade - 1 A"
 * - Compact display ("if there is no place", e.g. badges, tight chips): "1st Class", "1st Class A"
 *
 * Automatically preserves non-numeric classes like "LKG", "UKG", "Nursery", "Pre-KG".
 *
 * @example
 * formatClassName("1")                          // "Grade - 1"
 * formatClassName("1", "A")                     // "Grade - 1 A"
 * formatClassName("1 A")                        // "Grade - 1 A"
 * formatClassName({ name: "6", section: "B" })  // "Grade - 6 B"
 * formatClassName("LKG", "A")                   // "LKG A"
 * formatClassName("1", { compact: true })       // "1st Class"
 * formatClassName("1", "A", { compact: true })  // "1st Class A"
 */

const ORDINALS = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
  6: "6th",
  7: "7th",
  8: "8th",
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

const PRE_PRIMARY_KEYWORDS = new Set([
  "lkg",
  "ukg",
  "nursery",
  "pre-kg",
  "prekg",
  "playhome",
  "playgroup",
  "daycare",
  "pp1",
  "pp2",
  "kg1",
  "kg2",
]);

/**
 * Get ordinal string for a number (1 -> "1st", 2 -> "2nd", etc.)
 * @param {number} num
 * @returns {string}
 */
export const getOrdinal = (num) => {
  if (ORDINALS[num]) return ORDINALS[num];
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
};

/**
 * Format a class name or class object.
 *
 * @param {string|number|Object} nameOrObj - Raw class name string, number, or class/user object
 * @param {string|Object} [sectionOrOptions] - Section string (e.g. "A") OR options object
 * @param {Object} [maybeOptions] - Options object if section string was provided
 * @param {boolean} [maybeOptions.compact=false] - If true, formats as "1st Class", "1st Class A"
 * @returns {string} Formatted class name
 */
export const formatClassName = (nameOrObj, sectionOrOptions, maybeOptions) => {
  if (nameOrObj === null || nameOrObj === undefined || nameOrObj === "") {
    return "";
  }

  let section = "";
  let options = {};

  if (typeof sectionOrOptions === "object" && sectionOrOptions !== null) {
    options = sectionOrOptions;
  } else if (typeof sectionOrOptions === "string") {
    section = sectionOrOptions.trim();
    if (typeof maybeOptions === "object" && maybeOptions !== null) {
      options = maybeOptions;
    }
  }

  const isCompact = Boolean(options.compact);

  // If user object containing currentClass is passed
  if (typeof nameOrObj === "object" && nameOrObj !== null) {
    if (nameOrObj.currentClass) {
      return formatClassName(nameOrObj.currentClass, section, options);
    }
    // If MongoDB ObjectId string mistakenly passed
    if (nameOrObj._id && !nameOrObj.name && !nameOrObj.label && !nameOrObj.className) {
      return "";
    }
  }

  // Extract raw string and section from object
  let raw = "";
  if (typeof nameOrObj === "object" && nameOrObj !== null) {
    raw =
      nameOrObj.name ??
      nameOrObj.label ??
      nameOrObj.className ??
      nameOrObj.value ??
      "";
    if (!section && nameOrObj.section) {
      section = String(nameOrObj.section).trim();
    }
  } else {
    raw = nameOrObj;
  }

  raw = String(raw).trim();
  if (!raw) return "";

  // Guard against raw MongoDB ObjectIds (24 hex characters)
  if (/^[0-9a-fA-F]{24}$/.test(raw)) {
    return "";
  }

  // Clean and uppercase section if provided
  const cleanSec = section ? String(section).trim().toUpperCase() : "";

  // 1. Check for combined number + section like "1 A", "1-A", "1/A", "1A"
  const numSecMatch = raw.match(/^(\d{1,2})\s*[-/]?\s*([a-zA-Z])$/);
  if (numSecMatch) {
    const num = parseInt(numSecMatch[1], 10);
    const sec = numSecMatch[2].toUpperCase();
    if (isCompact) {
      return `${getOrdinal(num)} Class ${sec}`;
    }
    return `Grade - ${num} ${sec}`;
  }

  // 2. Check for pure numeric like "1", "10", 6
  if (/^\d{1,2}$/.test(raw)) {
    const num = parseInt(raw, 10);
    const secSuffix = cleanSec ? ` ${cleanSec}` : "";
    if (isCompact) {
      return `${getOrdinal(num)} Class${secSuffix}`;
    }
    return `Grade - ${num}${secSuffix}`;
  }

  // 3. Check for "Class 1", "Class - 1", "Class 1 A"
  const classMatch = raw.match(/^class\s*[-:]?\s*(\d{1,2})\s*([a-zA-Z])?$/i);
  if (classMatch) {
    const num = parseInt(classMatch[1], 10);
    const sec = (classMatch[2] || cleanSec || "").toUpperCase();
    const secSuffix = sec ? ` ${sec}` : "";
    if (isCompact) {
      return `${getOrdinal(num)} Class${secSuffix}`;
    }
    return `Grade - ${num}${secSuffix}`;
  }

  // 4. Check for "Grade 1", "Grade - 1", "Grade 1 A", "Grade - 1 A"
  const gradeMatch = raw.match(/^grade\s*[-:]?\s*(\d{1,2})\s*([a-zA-Z])?$/i);
  if (gradeMatch) {
    const num = parseInt(gradeMatch[1], 10);
    const sec = (gradeMatch[2] || cleanSec || "").toUpperCase();
    const secSuffix = sec ? ` ${sec}` : "";
    if (isCompact) {
      return `${getOrdinal(num)} Class${secSuffix}`;
    }
    return `Grade - ${num}${secSuffix}`;
  }

  // 5. Check for ordinal format: "1st", "1st Class", "1st Standard", "1st Grade"
  const ordinalMatch = raw.match(
    /^(\d{1,2})(?:st|nd|rd|th)\s*(?:standard|std|class|grade)?\s*([a-zA-Z])?$/i
  );
  if (ordinalMatch) {
    const num = parseInt(ordinalMatch[1], 10);
    const sec = (ordinalMatch[2] || cleanSec || "").toUpperCase();
    const secSuffix = sec ? ` ${sec}` : "";
    if (isCompact) {
      return `${getOrdinal(num)} Class${secSuffix}`;
    }
    return `Grade - ${num}${secSuffix}`;
  }

  // 6. Pre-primary / Kindergarten checks (e.g. LKG, UKG, Nursery)
  const normalizedRaw = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (PRE_PRIMARY_KEYWORDS.has(normalizedRaw)) {
    const secSuffix =
      cleanSec && !raw.toUpperCase().includes(cleanSec) ? ` ${cleanSec}` : "";
    return `${raw}${secSuffix}`.trim();
  }

  // 7. General fallback: if already has section, avoid duplicating cleanSec
  const secSuffix =
    cleanSec && !raw.toUpperCase().includes(cleanSec) ? ` ${cleanSec}` : "";
  return `${raw}${secSuffix}`.trim();
};

export default formatClassName;
