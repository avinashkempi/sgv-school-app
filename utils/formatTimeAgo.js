/**
 * Consistently format date into relative human time (e.g. 5m, 2h, 3d, 1w).
 *
 * @param {string|Date|number} dateString
 * @param {Object} [options]
 * @param {boolean} [options.compact=false] - If true, returns '5m' instead of '5m ago'
 * @returns {string}
 */
export function formatTimeAgo(dateString, { compact = false } = {}) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const diffMs = now - date;
  if (diffMs < 0) return "Just now";

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 45) return "Just now";
  if (diffMins < 60) return compact ? `${diffMins}m` : `${diffMins}m ago`;
  if (diffHours < 24) return compact ? `${diffHours}h` : `${diffHours}h ago`;
  if (diffDays < 7) return compact ? `${diffDays}d` : `${diffDays}d ago`;
  if (diffWeeks < 4) return compact ? `${diffWeeks}w` : `${diffWeeks}w ago`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default formatTimeAgo;
