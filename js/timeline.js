// ============================================================
// CloudSource — timeline.js
// Time scrub slider + report filtering by time window
// ============================================================

import { formatTime } from './utils.js';
import { REPORT_TTL_MINUTES } from './config.js';
import { renderReports } from './map.js';

let allReports = [];
let onFilterChange = null;
let isLive = true;

/**
 * Initialize timeline scrubber
 */
export function initTimeline(onChange) {
  onFilterChange = onChange;

  const scrub = document.getElementById('timeline-scrub');
  const summary = document.getElementById('timeline-summary');

  scrub.addEventListener('input', () => {
    const minutesAgo = parseInt(scrub.value);
    isLive = minutesAgo === 0;

    if (isLive) {
      summary.textContent = 'Now — live reports';
      renderReports(allReports.filter(r => {
        const age = (Date.now() - new Date(r.created_at).getTime()) / 60000;
        return age <= REPORT_TTL_MINUTES;
      }));
    } else {
      const targetTime = new Date(Date.now() - minutesAgo * 60000);
      summary.textContent = `${formatTime(targetTime)} — ${getWindowSummary(minutesAgo)}`;
      renderReports(allReports, minutesAgo);
    }

    if (onFilterChange) onFilterChange(minutesAgo);
  });
}

/**
 * Update the reports data used by timeline
 */
export function setTimelineReports(reports) {
  allReports = reports;
}

/**
 * Generate summary text for the time window
 */
function getWindowSummary(minutesAgo) {
  const windowMin = 10;
  const windowReports = allReports.filter(r => {
    const age = (Date.now() - new Date(r.created_at).getTime()) / 60000;
    return Math.abs(age - minutesAgo) <= windowMin;
  });

  if (windowReports.length === 0) return 'no reports';

  // Count conditions
  const counts = {};
  windowReports.forEach(r => {
    counts[r.condition] = (counts[r.condition] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const label = top[0].replace(/_/g, ' ');

  return `${windowReports.length} report${windowReports.length > 1 ? 's' : ''} — ${label}`;
}

/**
 * Reset scrubber to live
 */
export function resetToLive() {
  document.getElementById('timeline-scrub').value = 0;
  document.getElementById('timeline-summary').textContent = 'Now — live reports';
  isLive = true;
}

/**
 * Check if timeline is in live mode
 */
export function isTimelineLive() {
  return isLive;
}
