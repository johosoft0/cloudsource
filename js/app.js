// ============================================================
// CloudSource — app.js
// Entry point: wires all modules together
// ============================================================

import { DEFAULT_LAT, DEFAULT_LNG, DEFAULT_RADIUS } from './config.js';
import { getNearbyReports, subscribeToReports } from './db.js';
import { getCurrentPosition, watchPosition, getSavedRadius, saveRadius, showToast } from './utils.js';
import { updateConditionsBar } from './weather.js';
import { initMap, setUserPosition, setRadiusCircle, setMarkerTapHandler, renderReports, addReportMarker, refreshMarkerStyles } from './map.js';
import { initReportForm, openReportModal } from './report.js';
import { initTimeline, setTimelineReports, isTimelineLive } from './timeline.js';
import { initDetail, openDetail } from './detail.js';
import { initAuth, refreshProfile } from './auth.js';

// ── App State ────────────────────────────────────────────

let userLat = DEFAULT_LAT;
let userLng = DEFAULT_LNG;
let currentRadius = getSavedRadius() || DEFAULT_RADIUS;
let reports = [];
let refreshInterval = null;

// ── Boot ─────────────────────────────────────────────────

async function boot() {
  // 1. Init map
  initMap();

  // 2. Init UI modules
  initReportForm(onReportSubmitted);
  initTimeline();
  initDetail();

  // 3. Init auth (returns current user or null)
  await initAuth(onUserChange);

  // 4. Set marker tap handler
  setMarkerTapHandler((report) => openDetail(report));

  // 5. FAB handler
  document.getElementById('fab-report').addEventListener('click', openReportModal);

  // 6. Radius toggle
  initRadiusToggle();

  // 7. Get user location
  try {
    const pos = await getCurrentPosition();
    userLat = pos.lat;
    userLng = pos.lng;
  } catch {
    showToast('Using default location (Surfside Beach)');
  }

  // 8. Set map position + radius
  setUserPosition(userLat, userLng);
  setRadiusCircle(userLat, userLng, currentRadius);

  // 9. Fetch baseline weather
  updateConditionsBar(userLat, userLng);

  // 10. Load initial reports
  await loadReports();

  // 11. Subscribe to realtime inserts
  subscribeToReports(onRealtimeReport);

  // 12. Watch position updates
  watchPosition((pos) => {
    userLat = pos.lat;
    userLng = pos.lng;
    setUserPosition(userLat, userLng);
    setRadiusCircle(userLat, userLng, currentRadius);
  });

  // 13. Periodic refresh (marker decay + new data)
  refreshInterval = setInterval(async () => {
    // Refresh marker opacity/size
    refreshMarkerStyles(reports);
    // Re-fetch reports every 2 minutes
  }, 60000);

  // Full data refresh every 2 minutes
  setInterval(async () => {
    await loadReports();
    updateConditionsBar(userLat, userLng);
  }, 120000);
}

// ── Data Loading ─────────────────────────────────────────

async function loadReports() {
  try {
    reports = await getNearbyReports(userLat, userLng, currentRadius);
    setTimelineReports(reports);

    if (isTimelineLive()) {
      // Only show live reports (within 2hr TTL)
      const live = reports.filter(r => {
        const age = (Date.now() - new Date(r.created_at).getTime()) / 60000;
        return age <= 120;
      });
      renderReports(live);
    }
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

// ── Realtime Handler ─────────────────────────────────────

function onRealtimeReport(newReport) {
  // Add to local array (without full join data, but enough for marker)
  const enriched = {
    ...newReport,
    display_name: 'Weather Watcher',
    reputation: newReport.trust_score || 25,
    level: 1,
    confirm_count: 0,
    deny_count: 0,
    distance_miles: null,
  };

  reports.unshift(enriched);
  setTimelineReports(reports);

  if (isTimelineLive()) {
    addReportMarker(enriched);
  }
}

// ── Report Submitted ─────────────────────────────────────

async function onReportSubmitted(report) {
  // Reload to get full joined data
  await loadReports();
  // Refresh profile (stats updated by trigger)
  refreshProfile();
}

// ── User Change ──────────────────────────────────────────

function onUserChange(user) {
  // Could reload reports or update UI based on auth state
}

// ── Radius Toggle ────────────────────────────────────────

function initRadiusToggle() {
  const buttons = document.querySelectorAll('.radius-btn');

  // Set initial active state from saved preference
  buttons.forEach(btn => {
    const miles = parseFloat(btn.dataset.miles);
    btn.classList.toggle('active', miles === currentRadius);

    btn.addEventListener('click', () => {
      currentRadius = miles;
      saveRadius(miles);

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      setRadiusCircle(userLat, userLng, currentRadius);
      loadReports();
    });
  });
}

// ── Register Service Worker ──────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── Go ───────────────────────────────────────────────────

boot();
