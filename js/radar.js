// ============================================================
// CloudSource — radar.js
// RainViewer radar overlay (free, no API key)
// ============================================================

import { RAINVIEWER_API_URL } from './config.js';

let map = null;
let frames = [];
let tileLayers = [];
let currentFrame = 0;
let animInterval = null;
let isVisible = false;

/**
 * Initialize radar module
 */
export async function initRadar(leafletMap) {
  map = leafletMap;
  await fetchFrames();

  // Wire toggle button
  const btn = document.getElementById('btn-radar');
  if (btn) {
    btn.addEventListener('click', toggleRadar);
  }
}

/**
 * Fetch available radar frames from RainViewer
 */
async function fetchFrames() {
  try {
    const res = await fetch(RAINVIEWER_API_URL);
    const data = await res.json();

    // Use last 6 past frames for animation
    frames = (data.radar?.past || []).slice(-6);

    // Pre-create tile layers (hidden)
    tileLayers.forEach(l => map.removeLayer(l));
    tileLayers = frames.map(f =>
      L.tileLayer(`https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0,
        zIndex: 10,
        attribution: '<a href="https://rainviewer.com">RainViewer</a>',
      })
    );
  } catch (err) {
    console.warn('Radar fetch failed:', err);
    frames = [];
    tileLayers = [];
  }
}

/**
 * Toggle radar visibility
 */
export function toggleRadar() {
  if (isVisible) {
    hideRadar();
  } else {
    showRadar();
  }
  updateToggleButton();
}

function showRadar() {
  if (tileLayers.length === 0) return;
  isVisible = true;
  currentFrame = tileLayers.length - 1;

  // Add all layers to map, show only current
  tileLayers.forEach((layer, i) => {
    layer.addTo(map);
    layer.setOpacity(i === currentFrame ? 0.45 : 0);
  });

  // Start animation: cycle every 5 seconds
  animInterval = setInterval(advanceFrame, 5000);
}

function hideRadar() {
  isVisible = false;
  clearInterval(animInterval);
  animInterval = null;
  tileLayers.forEach(layer => {
    layer.setOpacity(0);
    map.removeLayer(layer);
  });
}

function advanceFrame() {
  if (tileLayers.length === 0) return;

  // Fade out current
  tileLayers[currentFrame].setOpacity(0);

  // Advance
  currentFrame = (currentFrame + 1) % tileLayers.length;

  // Fade in next
  tileLayers[currentFrame].setOpacity(0.45);
}

function updateToggleButton() {
  const btn = document.getElementById('btn-radar');
  if (btn) {
    btn.classList.toggle('active', isVisible);
  }
}

/**
 * Refresh radar data (call periodically)
 */
export async function refreshRadar() {
  const wasVisible = isVisible;
  if (wasVisible) hideRadar();
  await fetchFrames();
  if (wasVisible) showRadar();
}
