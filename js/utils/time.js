/** Current time as ISO8601 string */
export function now() {
  return new Date().toISOString();
}

/**
 * Format a relative time string ("2 min ago", "3 days ago", etc.)
 * @param {string} iso ISO8601 date string
 */
export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60)  return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30)  return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12)   return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/**
 * Format ISO date as "Apr 14, 2026"
 */
export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
