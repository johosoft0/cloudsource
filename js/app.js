// ============================================================
// CloudSource — app.js
// Entry point: geolocation gate, module init, data loop
// ============================================================

import { DEFAULT_RADIUS, REPORT_TTL_MINUTES } from './config.js';
import { getNearbyReports, subscribeToReports } from './db.js';
import { getCurrentPosition, watchPosition, showToast } from './utils.js';
import { updateConditionsBar } from './weather.js';
import { initMap, setUserPosition, setRadiusCircle, setMarkerTapHandler, renderReports, addReportMarker, refreshMarkerStyles, getMap } from './map.js';
import { initReportForm, openReportModal } from './report.js';
import { initTimeline, setTimelineReports, isTimelineLive } from './timeline.js';
import { initDetail, openDetail } from './detail.js';
import { initAuth, refreshProfile, checkAchievements } from './auth.js';
import { initRadar, refreshRadar } from './radar.js';

// ── App State ────────────────────────────────────────────

let userLat = null;
let userLng = null;
const VOTE_RADIUS = 5;    // fixed 5-mile voting radius
const VIEW_RADIUS = 50;   // load reports within 50 miles for map browsing
let reports = [];

function syncPosition() {
  window._csUserPos = { lat: userLat, lng: userLng };
  try {
    localStorage.setItem('cs_last_lat', userLat.toString());
    localStorage.setItem('cs_last_lng', userLng.toString());
  } catch {}
}

function getCachedLocation() {
  try {
    const lat = parseFloat(localStorage.getItem('cs_last_lat'));
    const lng = parseFloat(localStorage.getItem('cs_last_lng'));
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  } catch {}
  return null;
}

// ── Boot ─────────────────────────────────────────────────

async function boot() {
  const geoOverlay = document.getElementById('geo-overlay');
  const geoRetry = document.getElementById('geo-retry');
  const geoStatus = document.getElementById('geo-status');
  const zipFallback = document.getElementById('geo-zip-fallback');
  const cached = getCachedLocation();

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
        syncPosition();
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
      syncPosition();
      geoOverlay.classList.add('hidden');
      startApp();
    } catch (err) {
      // GPS failed — use cached location if available
      if (cached) {
        userLat = cached.lat;
        userLng = cached.lng;
        syncPosition();
        geoOverlay.classList.add('hidden');
        showToast('Using last known location');
        startApp();
        return;
      }
      // No cache — show error + fallbacks
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
  const leafletMap = initMap(userLat, userLng);

  initReportForm(onReportSubmitted);
  initTimeline();
  initDetail(() => loadReports());
  await initAuth();

  setMarkerTapHandler((report) => openDetail(report));
  document.getElementById('fab-report').addEventListener('click', openReportModal);

  // Set position + voting radius circle (visual indicator only)
  setUserPosition(userLat, userLng);
  setRadiusCircle(userLat, userLng, VOTE_RADIUS);

  updateConditionsBar(userLat, userLng);
  await loadReports();
  subscribeToReports(onRealtimeReport);
  await initRadar(leafletMap);

  // Reload reports when user pans/zooms the map
  let moveTimer = null;
  leafletMap.on('moveend', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => loadReports(), 500);
  });

  // Help modal
  initHelp();

  // Watch position updates
  watchPosition((pos) => {
    userLat = pos.lat;
    userLng = pos.lng;
    syncPosition();
    setUserPosition(userLat, userLng);
    setRadiusCircle(userLat, userLng, VOTE_RADIUS);
  });

  // Periodic refresh
  setInterval(() => refreshMarkerStyles(reports), 60000);
  setInterval(async () => {
    await loadReports();
    updateConditionsBar(userLat, userLng);
  }, 120000);
  setInterval(() => refreshRadar(), 300000);
}

// ── Data Loading ─────────────────────────────────────────

async function loadReports() {
  try {
    // Calculate radius from map viewport, capped at 50 miles
    const radius = getViewportRadius();
    reports = await getNearbyReports(userLat, userLng, radius);
    setTimelineReports(reports);
    if (isTimelineLive()) {
      const live = reports.filter(r => {
        const age = (Date.now() - new Date(r.created_at).getTime()) / 60000;
        return age <= REPORT_TTL_MINUTES;
      });
      renderReports(live);
    }
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

function getViewportRadius() {
  const map = getMap();
  if (!map) return VIEW_RADIUS;
  const bounds = map.getBounds();
  const center = bounds.getCenter();
  const ne = bounds.getNorthEast();
  // Approximate distance from center to corner in miles
  const dlat = ne.lat - center.lat;
  const dlng = ne.lng - center.lng;
  const latMi = dlat * 69; // ~69 miles per degree latitude
  const lngMi = dlng * 69 * Math.cos(center.lat * Math.PI / 180);
  const diag = Math.sqrt(latMi * latMi + lngMi * lngMi);
  return Math.min(Math.max(diag, 1), VIEW_RADIUS);
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
  await refreshProfile();
  const hour = new Date().getHours();
  await checkAchievements({ isNightReport: hour >= 0 && hour < 5 });
}

// ── Help Modal ───────────────────────────────────────────

function initHelp() {
  const modal = document.getElementById('help-modal');
  const closeBtn = document.getElementById('btn-close-help');
  const helpBtn = document.getElementById('btn-help');

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    localStorage.setItem('cs_help_shown', 'true');
  });

  document.querySelector('#help-modal .modal-backdrop').addEventListener('click', () => {
    modal.classList.add('hidden');
    localStorage.setItem('cs_help_shown', 'true');
  });

  helpBtn.addEventListener('click', () => modal.classList.remove('hidden'));

  // Show on first run
  if (!localStorage.getItem('cs_help_shown')) {
    modal.classList.remove('hidden');
  }
}

// ── Service Worker ───────────────────────────────────────
// TODO: Re-enable after active development is done
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('sw.js').catch(() => {});
// }

// ── Go ───────────────────────────────────────────────────

boot();
