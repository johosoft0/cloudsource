// ============================================================
// CloudSource — utils.js
// Geo math, time formatting, image resize, toasts
// ============================================================

import { MAX_PHOTO_WIDTH, MAX_PHOTO_QUALITY, REPORT_TTL_MINUTES } from './config.js';

// ── Geolocation ──────────────────────────────────────────

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

export function watchPosition(callback) {
  if (!navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => {},
    { enableHighAccuracy: true, maximumAge: 30000 }
  );
}

// ── Distance ─────────────────────────────────────────────

export function milesToMeters(miles) {
  return miles * 1609.344;
}

// ── Time Formatting ──────────────────────────────────────

export function timeAgo(dateString) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
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
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs / 60000; // age in minutes
}

export function getReportOpacity(createdAt) {
  const ageMin = getReportAge(createdAt);
  if (ageMin <= 5) return 1.0;
  if (ageMin >= REPORT_TTL_MINUTES) return 0.25;
  // Linear fade from 1.0 at 5min to 0.25 at TTL
  return 1.0 - (0.75 * (ageMin - 5) / (REPORT_TTL_MINUTES - 5));
}

export function getReportSize(trustScore) {
  // Base size 28px, scales up to 42px for high-trust reporters
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
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

// ── Toast Notifications ──────────────────────────────────

export function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

// ── Local Storage Helpers ────────────────────────────────

export function getSavedRadius() {
  return parseFloat(localStorage.getItem('cs_radius')) || 5;
}

export function saveRadius(miles) {
  localStorage.setItem('cs_radius', miles);
}
