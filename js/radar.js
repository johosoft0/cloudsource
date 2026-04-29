// ============================================================
// CloudSource — radar.js
// Iowa State Mesonet NEXRAD radar overlay
// Free, no API key, works at all zoom levels
// Tile cache: mesonet.agron.iastate.edu/cache/tile.py
// ============================================================

let map = null;
let paneCreated = false;
let isVisible = false;
let animInterval = null;
let currentFrame = 0;
let tileLayers = [];

// NEXRAD tile cache time steps (5-minute intervals, last 30 minutes)
const FRAME_LAYERS = [
  'nexrad-n0q-900913-m30m',
  'nexrad-n0q-900913-m25m',
  'nexrad-n0q-900913-m20m',
  'nexrad-n0q-900913-m15m',
  'nexrad-n0q-900913-m10m',
  'nexrad-n0q-900913-m05m',
  'nexrad-n0q-900913',         // current
];

function buildTileUrl(layerName) {
  // Cache-bust with timestamp to avoid stale tiles
  return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/${layerName}/{z}/{x}/{y}.png?_=${Math.floor(Date.now() / 300000)}`;
}

export async function initRadar(leafletMap) {
  map = leafletMap;

  // Custom pane so dark-mode filter on .leaflet-tile-pane doesn't affect radar
  if (!paneCreated) {
    map.createPane('radarPane');
    map.getPane('radarPane').style.zIndex = 250;
    map.getPane('radarPane').style.pointerEvents = 'none';
    paneCreated = true;
  }

  // Pre-create all frame layers
  tileLayers = FRAME_LAYERS.map(name =>
    L.tileLayer(buildTileUrl(name), {
      pane: 'radarPane',
      opacity: 0,
      maxZoom: 19,
      transparent: true,
    })
  );

  // Wire toggle button
  const btn = document.getElementById('btn-radar');
  if (btn) {
    btn.addEventListener('click', toggleRadar);
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
  currentFrame = tileLayers.length - 1; // start on current

  // Add all layers, show only current frame
  tileLayers.forEach((layer, i) => {
    layer.addTo(map);
    layer.setOpacity(i === currentFrame ? 0.5 : 0);
  });

  // Animate every 5 seconds
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

/**
 * Refresh radar tiles (called periodically).
 * Rebuilds tile URLs so the cache-bust param updates.
 */
export async function refreshRadar() {
  const wasVisible = isVisible;
  if (wasVisible) hideRadar();

  // Rebuild layers with fresh cache-bust
  tileLayers.forEach(l => { try { map.removeLayer(l); } catch {} });
  tileLayers = FRAME_LAYERS.map(name =>
    L.tileLayer(buildTileUrl(name), {
      pane: 'radarPane',
      opacity: 0,
      maxZoom: 19,
      transparent: true,
    })
  );

  if (wasVisible) showRadar();
}
