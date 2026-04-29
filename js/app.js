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
  const geoOverlay = document.getElementById('geo-overlay');
  const geoRetry = document.getElementById('geo-retry');
  const geoStatus = document.getElementById('geo-status');
  const zipFallback = document.getElementById('geo-zip-fallback');

  if (geoRetry) {
    geoRetry.addEventListener('click', () => requestLocation());
  }

  // TODO: REMOVE BEFORE PRODUCTION — zip code fallback for testing
  const zipGoBtn = document.getElementById('geo-zip-go');
  const zipInput = document.getElementById('geo-zip-input');
  if (zipGoBtn) {
    zipGoBtn.addEventListener('click', () => handleZipFallback());
    zipInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleZipFallback(); });
  }

  async function handleZipFallback() {
    const zip = zipInput.value.trim();
    if (!/^\d{5}$/.test(zip)) {
      geoStatus.textContent = 'Enter a valid 5-digit zip code.';
      return;
    }
    zipGoBtn.disabled = true;
    zipGoBtn.innerHTML = '<span class="spinner"></span>';
    try {
      // Use Open-Meteo geocoding API (free, no key)
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${zip}&count=1&language=en&format=json`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        userLat = data.results[0].latitude;
        userLng = data.results[0].longitude;
        geoOverlay.classList.add('hidden');
        startApp();
      } else {
        geoStatus.textContent = 'Zip code not found. Try another.';
      }
    } catch {
      geoStatus.textContent = 'Geocoding failed. Check your connection.';
    } finally {
      zipGoBtn.disabled = false;
      zipGoBtn.textContent = 'Go';
    }
  }

  async function requestLocation() {
    geoStatus.textContent = 'Requesting location...';
    geoRetry.classList.add('hidden');
    if (zipFallback) zipFallback.classList.add('hidden');

    try {
      const pos = await getCurrentPosition(false);
      userLat = pos.lat;
      userLng = pos.lng;
      geoOverlay.classList.add('hidden');
      startApp();
    } catch (err) {
      if (err.code === 1) {
        geoStatus.textContent = 'Location access was denied.';
      } else if (err.code === 2) {
        geoStatus.textContent = 'Location unavailable. Make sure location services are enabled.';
      } else {
        geoStatus.textContent = 'Location request timed out.';
      }
      geoRetry.classList.remove('hidden');
      // TODO: REMOVE BEFORE PRODUCTION — show zip fallback on failure
      if (zipFallback) zipFallback.classList.remove('hidden');
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
