// ============================================================
// CloudSource — radar.js
// RainViewer radar overlay (free, no API key)
// Uses a custom Leaflet pane so tiles aren't affected by
// the dark-mode filter on .leaflet-tile-pane
// ============================================================

import { RAINVIEWER_API_URL } from './config.js';

let map = null;
let frames = [];
let tileLayers = [];
let currentFrame = 0;
let animInterval = null;
let isVisible = false;
let paneCreated = false;

export async function initRadar(leafletMap) {
  map = leafletMap;

  // Create a dedicated pane for radar tiles.
  // This pane sits above the base tiles but below markers,
  // and crucially is NOT affected by the CSS filter on .leaflet-tile-pane.
  if (!paneCreated) {
    map.createPane('radarPane');
    map.getPane('radarPane').style.zIndex = 250;
    map.getPane('radarPane').style.pointerEvents = 'none';
    paneCreated = true;
  }

  await fetchFrames();

  const btn = document.getElementById('btn-radar');
  if (btn) {
    btn.addEventListener('click', toggleRadar);
    // Show frame count as feedback
    if (frames.length > 0) {
      btn.title = `Radar (${frames.length} frames)`;
    }
  }
}

async function fetchFrames() {
  try {
    const res = await fetch(RAINVIEWER_API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    frames = (data.radar?.past || []).slice(-6);

    // Remove old tile layers
    tileLayers.forEach(l => { try { map.removeLayer(l); } catch {} });

    // Create new tile layers in the radar pane
    tileLayers = frames.map(f =>
      L.tileLayer(
        `https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
        {
          pane: 'radarPane',
          opacity: 0,
          zIndex: 250,
        }
      )
    );
  } catch (err) {
    console.warn('Radar fetch failed:', err);
    frames = [];
    tileLayers = [];
  }
}

export function toggleRadar() {
  isVisible ? hideRadar() : showRadar();
  const btn = document.getElementById('btn-radar');
  if (btn) btn.classList.toggle('active', isVisible);
}

function showRadar() {
  if (tileLayers.length === 0) return;
  isVisible = true;
  currentFrame = tileLayers.length - 1;

  tileLayers.forEach((layer, i) => {
    layer.addTo(map);
    layer.setOpacity(i === currentFrame ? 0.5 : 0);
  });

  animInterval = setInterval(advanceFrame, 5000);
}

function hideRadar() {
  isVisible = false;
  clearInterval(animInterval);
  animInterval = null;
  tileLayers.forEach(layer => {
    layer.setOpacity(0);
    try { map.removeLayer(layer); } catch {}
  });
}

function advanceFrame() {
  if (tileLayers.length === 0) return;
  tileLayers[currentFrame].setOpacity(0);
  currentFrame = (currentFrame + 1) % tileLayers.length;
  tileLayers[currentFrame].setOpacity(0.5);
}

export async function refreshRadar() {
  const wasVisible = isVisible;
  if (wasVisible) hideRadar();
  await fetchFrames();
  if (wasVisible) showRadar();
}
