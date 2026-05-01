// ============================================================
// CloudSource — map.js
// Leaflet map, marker management, radius circle
// ============================================================

import { INITIAL_ZOOM, CONDITIONS } from './config.js';
import { getReportOpacity, getReportSize, isReportLive, milesToMeters } from './utils.js';

let map = null;
let markerLayer = null;
let radiusCircle = null;
let userMarker = null;
let markers = new Map();
let onMarkerTap = null;

const conditionColor = {};
const conditionIcon = {};
CONDITIONS.forEach(c => { conditionColor[c.key] = c.color; conditionIcon[c.key] = c.icon; });

/**
 * Initialize the Leaflet map at a given position
 */
export function initMap(lat, lng, containerId = 'map') {
  map = L.map(containerId, {
    center: [lat, lng],
    zoom: INITIAL_ZOOM,
    zoomControl: true,
    attributionControl: false,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  L.control.attribution({ prefix: false, position: 'bottomright' })
    .addAttribution('© <a href="https://openstreetmap.org/copyright">OSM</a>')
    .addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  return map;
}

export function setUserPosition(lat, lng, centerMap = false) {
  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  } else {
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width: 16px; height: 16px;
        background: #38bdf8; border: 3px solid white;
        border-radius: 50%; box-shadow: 0 0 12px rgba(56,189,248,0.5);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
  }
  if (centerMap) map.setView([lat, lng], map.getZoom());
}

export function setRadiusCircle(lat, lng, miles) {
  const meters = milesToMeters(miles);
  if (radiusCircle) {
    radiusCircle.setLatLng([lat, lng]).setRadius(meters);
  } else {
    radiusCircle = L.circle([lat, lng], {
      radius: meters,
      color: 'rgba(56, 189, 248, 0.25)',
      fillColor: 'rgba(56, 189, 248, 0.05)',
      fillOpacity: 1, weight: 1, dashArray: '6 4',
    }).addTo(map);
  }
}

export function setMarkerTapHandler(handler) {
  onMarkerTap = handler;
}

export function addReportMarker(report, timeFilter = null) {
  if (timeFilter !== null) {
    const ageMin = (Date.now() - new Date(report.created_at).getTime()) / 60000;
    if (Math.abs(ageMin - timeFilter) > 10) return;
  }

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
      width:${size}px; height:${size}px;
      background:${color}; opacity:${live ? opacity : 0.2};
      font-size:${size * 0.5}px;
    ">${icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  const marker = L.marker([report.lat, report.lng], {
    icon: markerIcon,
    zIndexOffset: Math.round(opacity * 100),
  });

  marker.on('click', () => { if (onMarkerTap) onMarkerTap(report); });
  marker.addTo(markerLayer);
  markers.set(report.id, marker);
}

export function renderReports(reports, timeFilter = null) {
  clearMarkers();
  reports.forEach(r => addReportMarker(r, timeFilter));
}

export function clearMarkers() {
  markerLayer.clearLayers();
  markers.clear();
}

export function refreshMarkerStyles(reports) {
  reports.forEach(r => { if (markers.has(r.id)) addReportMarker(r); });
}

export function getMap() {
  return map;
}
