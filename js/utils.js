// ============================================================
// CloudSource — utils.js
// Geo, time, image, EXIF, toasts
// ============================================================

import { MAX_PHOTO_WIDTH, MAX_PHOTO_QUALITY, REPORT_TTL_MINUTES } from './config.js';

// ── Geolocation ──────────────────────────────────────────

export function getCurrentPosition(highAccuracy = false) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: highAccuracy, timeout: 15000, maximumAge: 30000 }
    );
  });
}

export function watchPosition(callback) {
  if (!navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => {},
    { enableHighAccuracy: false, maximumAge: 30000 }
  );
}

// ── Haversine Distance (miles) ───────────────────────────

export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function milesToMeters(miles) {
  return miles * 1609.344;
}

/**
 * Fuzz a lat/lng by ~100 meters in a random direction.
 * Prevents exact user location from being broadcast.
 */
export function fuzzLocation(lat, lng) {
  // ~100m in degrees (varies by latitude but close enough)
  const metersOffset = 100;
  const latOffset = metersOffset / 111320; // 1 deg lat ≈ 111,320m
  const lngOffset = metersOffset / (111320 * Math.cos(lat * Math.PI / 180));

  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()); // uniform distribution within circle

  return {
    lat: lat + r * latOffset * Math.sin(angle),
    lng: lng + r * lngOffset * Math.cos(angle),
  };
}

// ── Time Formatting ──────────────────────────────────────

export function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Report Age / Opacity ─────────────────────────────────

export function getReportAge(createdAt) {
  return (Date.now() - new Date(createdAt).getTime()) / 60000;
}

export function getReportOpacity(createdAt) {
  const ageMin = getReportAge(createdAt);
  if (ageMin <= 5) return 1.0;
  if (ageMin >= REPORT_TTL_MINUTES) return 0.25;
  return 1.0 - (0.75 * (ageMin - 5) / (REPORT_TTL_MINUTES - 5));
}

export function getReportSize(trustScore) {
  const clamped = Math.max(0, Math.min(100, trustScore || 25));
  return 28 + (clamped / 100) * 14;
}

export function isReportLive(createdAt) {
  return getReportAge(createdAt) <= REPORT_TTL_MINUTES;
}

// ── Image Resize ─────────────────────────────────────────

export function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_PHOTO_WIDTH) {
        height = (MAX_PHOTO_WIDTH / width) * height;
        width = MAX_PHOTO_WIDTH;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compress failed')),
        'image/jpeg',
        MAX_PHOTO_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

// ── EXIF GPS Extraction ──────────────────────────────────
// Minimal parser — reads GPS lat/lng from JPEG EXIF data.
// Returns { lat, lng } or null.

export async function extractExifGps(file) {
  try {
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) return null;
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.getUint16(0) !== 0xFFD8) return null;

    // Find APP1 marker (EXIF)
    let off = 2;
    while (off < dv.byteLength - 4) {
      const marker = dv.getUint16(off);
      if ((marker & 0xFF00) !== 0xFF00) break;
      if (marker === 0xFFE1) {
        return _parseExifGps(dv, off + 4);
      }
      off += 2 + dv.getUint16(off + 2);
    }
  } catch { /* not critical */ }
  return null;
}

function _parseExifGps(dv, start) {
  // Verify "Exif\0\0"
  if (dv.getUint32(start) !== 0x45786966) return null;

  const tiffStart = start + 6;
  const le = dv.getUint16(tiffStart) === 0x4949;
  const g16 = (o) => dv.getUint16(o, le);
  const g32 = (o) => dv.getUint32(o, le);

  // IFD0 — find GPS sub-IFD pointer (tag 0x8825)
  const ifd0Off = tiffStart + g32(tiffStart + 4);
  const ifd0Count = g16(ifd0Off);
  let gpsOff = null;

  for (let i = 0; i < ifd0Count; i++) {
    const e = ifd0Off + 2 + i * 12;
    if (g16(e) === 0x8825) {
      gpsOff = tiffStart + g32(e + 8);
      break;
    }
  }
  if (!gpsOff) return null;

  // Read GPS IFD entries
  const gpsCount = g16(gpsOff);
  let latRef, lngRef, latVals, lngVals;

  for (let i = 0; i < gpsCount; i++) {
    const e = gpsOff + 2 + i * 12;
    const tag = g16(e);
    const valOff = tiffStart + g32(e + 8);

    if (tag === 1) latRef = String.fromCharCode(dv.getUint8(e + 8));
    else if (tag === 2) latVals = _readRat3(dv, valOff, le);
    else if (tag === 3) lngRef = String.fromCharCode(dv.getUint8(e + 8));
    else if (tag === 4) lngVals = _readRat3(dv, valOff, le);
  }

  if (!latVals || !lngVals) return null;

  let lat = latVals[0] + latVals[1] / 60 + latVals[2] / 3600;
  let lng = lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600;
  if (latRef === 'S') lat = -lat;
  if (lngRef === 'W') lng = -lng;

  return { lat, lng };
}

function _readRat3(dv, off, le) {
  const r = [];
  for (let i = 0; i < 3; i++) {
    const num = dv.getUint32(off + i * 8, le);
    const den = dv.getUint32(off + i * 8 + 4, le);
    r.push(den ? num / den : 0);
  }
  return r;
}

// ── Toast Notifications ──────────────────────────────────

export function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ── Local Storage Helpers ────────────────────────────────

export function getSavedRadius() {
  return parseFloat(localStorage.getItem('cs_radius')) || 5;
}

export function saveRadius(miles) {
  localStorage.setItem('cs_radius', miles);
      }
