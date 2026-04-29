// ============================================================
// CloudSource — app.js
// Entry point: geolocation gate, module init, data loop
// ============================================================

import { DEFAULT_RADIUS } from './config.js';
import { getNearbyReports, subscribeToReports } from './db.js';
import { getCurrentPosition, watchPosition, getSavedRadius, saveRadius, showToast } from './utils.js';
import { updateConditionsBar } from './weather.js';
import { initMap, setUserPosition, setRadiusCircle, setMarkerTapHandler, renderReports, addReportMarker, refreshMarkerStyles, getMap } from './map.js';
import { initReportForm, openReportModal } from './report.js';
import { initTimeline, setTimelineReports, isTimelineLive } from './timeline.js';
import { initDetail, openDetail } from './detail.js';
import { initAuth, refreshProfile } from './auth.js';
import { initRadar, refreshRadar } from './radar.js';

// ── App State ────────────────────────────────────────────

let userLat = null;
let userLng = null;
let currentRadius = getSavedRadius() || DEFAULT_RADIUS;
let reports = [];

// ── Boot ─────────────────────────────────────────────────

async function boot() {
  // 1. Geolocation is REQUIRED — gate everything on it
  const geoOverlay = document.getElementById('geo-overlay');
  const geoRetry = document.getElementById('geo-retry');
  const geoStatus = document.getElementById('geo-status');

  if (geoRetry) {
    geoRetry.addEventListener('click', () => requestLocation());
  }

  async function requestLocation() {
    geoStatus.textContent = 'Requesting location...';
    geoRetry.classList.add('hidden');

    try {
      const pos = await getCurrentPosition(false); // coarse is fine
      userLat = pos.lat;
      userLng = pos.lng;
      geoOverlay.classList.add('hidden');
      startApp();
    } catch (err) {
      if (err.code === 1) {
        // Permission denied
        geoStatus.textContent = 'Location access was denied. CloudSource needs your location to show nearby weather reports.';
      } else if (err.code === 2) {
        geoStatus.textContent = 'Location unavailable. Make sure location services are enabled.';
      } else {
        geoStatus.textContent = 'Location request timed out. Please try again.';
      }
      geoRetry.classList.remove('hidden');
    }
  }

  await requestLocation();
}

async function startApp() {
  // 2. Init map at user's actual location
  const leafletMap = initMap(userLat, userLng);

  // 3. Init UI modules
  initReportForm(onReportSubmitted);
  initTimeline();
  initDetail();

  // 4. Init auth
  await initAuth();

  // 5. Event handlers
  setMarkerTapHandler((report) => openDetail(report));
  document.getElementById('fab-report').addEventListener('click', openReportModal);
  initRadiusToggle();

  // 6. Set map position + radius
  setUserPosition(userLat, userLng);
  setRadiusCircle(userLat, userLng, currentRadius);

  // 7. Baseline weather
  updateConditionsBar(userLat, userLng);

  // 8. Load reports
  await loadReports();

  // 9. Realtime
  subscribeToReports(onRealtimeReport);

  // 10. Radar overlay
  await initRadar(leafletMap);

  // 11. Watch position
  watchPosition((pos) => {
    userLat = pos.lat;
    userLng = pos.lng;
    setUserPosition(userLat, userLng);
    setRadiusCircle(userLat, userLng, currentRadius);
  });

  // 12. Periodic refresh
  setInterval(() => refreshMarkerStyles(reports), 60000);

  setInterval(async () => {
    await loadReports();
    updateConditionsBar(userLat, userLng);
  }, 120000);

  // Refresh radar every 5 minutes
  setInterval(() => refreshRadar(), 300000);
}

// ── Data Loading ─────────────────────────────────────────

async function loadReports() {
  try {
    reports = await getNearbyReports(userLat, userLng, currentRadius);
    setTimelineReports(reports);
    if (isTimelineLive()) {
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
  if (isTimelineLive()) addReportMarker(enriched);
}

// ── Report Submitted ─────────────────────────────────────

async function onReportSubmitted() {
  await loadReports();
  refreshProfile();
}

// ── Radius Toggle ────────────────────────────────────────

function initRadiusToggle() {
  const buttons = document.querySelectorAll('.radius-btn');
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

// ── Service Worker ───────────────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── Go ───────────────────────────────────────────────────

boot();
