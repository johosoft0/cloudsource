// ============================================================
// CloudSource — map.js
// Leaflet map, marker management, radius circle
// ============================================================

import { DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM, CONDITIONS } from './config.js';
import { getReportOpacity, getReportSize, isReportLive, milesToMeters } from './utils.js';

let map = null;
let markerLayer = null;
let radiusCircle = null;
let userMarker = null;
let markers = new Map(); // reportId → L.marker
let onMarkerTap = null;

// Condition key → color lookup
const conditionColor = {};
CONDITIONS.forEach(c => { conditionColor[c.key] = c.color; });

// Condition key → icon lookup
const conditionIcon = {};
CONDITIONS.forEach(c => { conditionIcon[c.key] = c.icon; });

/**
 * Initialize the Leaflet map
 */
export function initMap(containerId = 'map') {
  map = L.map(containerId, {
    center: [DEFAULT_LAT, DEFAULT_LNG],
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
    attributionControl: false,
  });

  // OpenStreetMap tiles (no API key)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Attribution (required by OSM)
  L.control.attribution({
    prefix: false,
    position: 'bottomright',
  }).addAttribution('© <a href="https://openstreetmap.org/copyright">OSM</a>').addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  return map;
}

/**
 * Set user's position marker and pan map
 */
export function setUserPosition(lat, lng) {
  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  } else {
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width: 16px;
        height: 16px;
        background: #38bdf8;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
  }
  map.setView([lat, lng], map.getZoom());
}

/**
 * Draw/update radius circle
 */
export function setRadiusCircle(lat, lng, miles) {
  const meters = milesToMeters(miles);
  if (radiusCircle) {
    radiusCircle.setLatLng([lat, lng]).setRadius(meters);
  } else {
    radiusCircle = L.circle([lat, lng], {
      radius: meters,
      color: 'rgba(56, 189, 248, 0.25)',
      fillColor: 'rgba(56, 189, 248, 0.05)',
      fillOpacity: 1,
      weight: 1,
      dashArray: '6 4',
    }).addTo(map);
  }
}

/**
 * Set callback for marker taps
 */
export function setMarkerTapHandler(handler) {
  onMarkerTap = handler;
}

/**
 * Add or update a report marker
 */
export function addReportMarker(report, timeFilter = null) {
  // If time filter is active, check if report falls in window
  if (timeFilter !== null) {
    const ageMin = (Date.now() - new Date(report.created_at).getTime()) / 60000;
    const windowMin = 10;
    if (Math.abs(ageMin - timeFilter) > windowMin) return;
  }

  // Remove existing marker for this report
  if (markers.has(report.id)) {
    markerLayer.removeLayer(markers.get(report.id));
    markers.delete(report.id);
  }

  const color = conditionColor[report.condition] || '#f472b6';
  const icon = conditionIcon[report.condition] || '🌀';
  const opacity = getReportOpacity(report.created_at);
  const size = getReportSize(report.trust_score);
  const live = isReportLive(report.created_at);

  const markerIcon = L.divIcon({
    className: '',
    html: `<div class="report-marker" style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      opacity: ${live ? opacity : 0.2};
      font-size: ${size * 0.5}px;
    ">${icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  const marker = L.marker([report.lat, report.lng], {
    icon: markerIcon,
    zIndexOffset: Math.round(opacity * 100),
  });

  marker.on('click', () => {
    if (onMarkerTap) onMarkerTap(report);
  });

  marker.addTo(markerLayer);
  markers.set(report.id, marker);
}

/**
 * Render a full set of reports (replaces all markers)
 */
export function renderReports(reports, timeFilter = null) {
  clearMarkers();
  reports.forEach(r => addReportMarker(r, timeFilter));
}

/**
 * Clear all report markers
 */
export function clearMarkers() {
  markerLayer.clearLayers();
  markers.clear();
}

/**
 * Refresh marker opacity/size (called periodically)
 */
export function refreshMarkerStyles(reports) {
  reports.forEach(r => {
    if (markers.has(r.id)) {
      // Re-add to update opacity
      addReportMarker(r);
    }
  });
}

/**
 * Get the map instance
 */
export function getMap() {
  return map;
}
