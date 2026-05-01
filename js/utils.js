// ============================================================
// CloudSource — utils.js
// ============================================================

import { MAX_PHOTO_WIDTH, MAX_PHOTO_QUALITY, REPORT_TTL_MINUTES, REPORT_COOLDOWN_MINUTES,
  REPORTER_LEVELS, COMMUNITY_LEVELS, DAILY_CHALLENGES, XP_CHALLENGE_REPORT, XP_CHALLENGE_COMMUNITY } from './config.js';

// ── Geolocation ──────────────────────────────────────────

export function getCurrentPosition(highAccuracy = false) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
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
    () => {}, { enableHighAccuracy: false, maximumAge: 30000 }
  );
}

// ── Distance ─────────────────────────────────────────────

export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function milesToMeters(miles) { return miles * 1609.344; }

export function fuzzLocation(lat, lng) {
  const m = 100;
  const latOff = m / 111320;
  const lngOff = m / (111320 * Math.cos(lat * Math.PI / 180));
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random());
  return { lat: lat + r * latOff * Math.sin(angle), lng: lng + r * lngOff * Math.cos(angle) };
}

// ── Time ─────────────────────────────────────────────────

export function timeAgo(dateString) {
  const diffMin = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ── Report Age / Opacity ─────────────────────────────────

export function getReportAge(createdAt) { return (Date.now() - new Date(createdAt).getTime()) / 60000; }

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

export function isReportLive(createdAt) { return getReportAge(createdAt) <= REPORT_TTL_MINUTES; }

// ── Level Helpers ────────────────────────────────────────

export function getReporterLevel(xp) {
  let result = REPORTER_LEVELS[0];
  for (const l of REPORTER_LEVELS) { if (xp >= l.xp) result = l; else break; }
  return result;
}

export function getCommunityLevel(xp) {
  let result = COMMUNITY_LEVELS[0];
  for (const l of COMMUNITY_LEVELS) { if (xp >= l.xp) result = l; else break; }
  return result;
}

// ── Avatar Renderer ──────────────────────────────────────

const TIER_GRADIENTS = [
  'linear-gradient(135deg, #34d399, #059669)', // 1-5 green
  'linear-gradient(135deg, #38bdf8, #2563eb)', // 6-10 blue
  'linear-gradient(135deg, #a78bfa, #7c3aed)', // 11-15 purple
  'linear-gradient(135deg, #fbbf24, #f59e0b)', // 16-20 gold
];

export function renderAvatar(xpReport, size = 56) {
  const lv = getReporterLevel(xpReport || 0);
  const tierIdx = Math.min(3, Math.floor((lv.level - 1) / 5));
  const grad = TIER_GRADIENTS[tierIdx];
  return `<div class="avatar-badge" style="width:${size}px;height:${size}px;background:${grad};font-size:${size * 0.4}px;">
    ${lv.level}
    <span class="avatar-rank-icon" style="font-size:${size * 0.3}px;">${lv.badge}</span>
  </div>`;
}

export function renderAvatarSmall(xpReport) {
  return renderAvatar(xpReport, 36);
}

// ── Image Resize ─────────────────────────────────────────

export function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_PHOTO_WIDTH) { height = (MAX_PHOTO_WIDTH / width) * height; width = MAX_PHOTO_WIDTH; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compress failed')), 'image/jpeg', MAX_PHOTO_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

// ── EXIF GPS Extraction ──────────────────────────────────

export async function extractExifGps(file) {
  try {
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) return null;
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off < dv.byteLength - 4) {
      const marker = dv.getUint16(off);
      if ((marker & 0xFF00) !== 0xFF00) break;
      if (marker === 0xFFE1) return _parseExifGps(dv, off + 4);
      off += 2 + dv.getUint16(off + 2);
    }
  } catch {}
  return null;
}

function _parseExifGps(dv, start) {
  if (dv.getUint32(start) !== 0x45786966) return null;
  const ts = start + 6;
  const le = dv.getUint16(ts) === 0x4949;
  const g16 = o => dv.getUint16(o, le);
  const g32 = o => dv.getUint32(o, le);
  const ifd0Off = ts + g32(ts + 4);
  let gpsOff = null;
  for (let i = 0; i < g16(ifd0Off); i++) {
    const e = ifd0Off + 2 + i * 12;
    if (g16(e) === 0x8825) { gpsOff = ts + g32(e + 8); break; }
  }
  if (!gpsOff) return null;
  let latRef, lngRef, latVals, lngVals;
  for (let i = 0; i < g16(gpsOff); i++) {
    const e = gpsOff + 2 + i * 12;
    const tag = g16(e);
    const valOff = ts + g32(e + 8);
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

// ── Toast / XP Float ─────────────────────────────────────

export function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function showXpFloat(anchor, amount, type = 'report') {
  const el = document.createElement('div');
  el.className = `xp-float xp-float-${type}`;
  el.textContent = `+${amount}`;
  const rect = anchor.getBoundingClientRect();
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// ── Rate Limiting ────────────────────────────────────────

export function canSubmitReport() {
  const last = localStorage.getItem('cs_last_report_time');
  if (!last) return { allowed: true };
  const elapsed = (Date.now() - parseInt(last)) / 60000;
  if (elapsed >= REPORT_COOLDOWN_MINUTES) return { allowed: true };
  const remaining = Math.ceil(REPORT_COOLDOWN_MINUTES - elapsed);
  return { allowed: false, remaining };
}

export function setLastReportTime() {
  localStorage.setItem('cs_last_report_time', Date.now().toString());
}

export function clearLastReportTime() {
  localStorage.removeItem('cs_last_report_time');
}

// ── Mod Mode ─────────────────────────────────────────────

export function getModMode() { return localStorage.getItem('cs_mod_mode') === 'true'; }
export function setModMode(enabled) { localStorage.setItem('cs_mod_mode', enabled ? 'true' : 'false'); }

// ── Daily Challenges ─────────────────────────────────────

function getDayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

export function getTodaysChallenges(streakDays = 0) {
  const doy = getDayOfYear();
  const rIdx = doy % DAILY_CHALLENGES.report.length;
  const cIdx = doy % DAILY_CHALLENGES.community.length;

  const challenges = [
    { ...DAILY_CHALLENGES.report[rIdx], category: 'report' },
    { ...DAILY_CHALLENGES.community[cIdx], category: 'community' },
    {
      ...DAILY_CHALLENGES.streak[0],
      category: 'streak',
      text: `🔥 Extend your streak to ${(streakDays || 0) + 1} days`,
    },
  ];
  return challenges;
}

export function getChallengeProgress() {
  const key = `cs_challenges_${getDayKey()}`;
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}

export function updateChallengeProgress(challengeId, value = true) {
  const key = `cs_challenges_${getDayKey()}`;
  const progress = getChallengeProgress();
  progress[challengeId] = value;
  localStorage.setItem(key, JSON.stringify(progress));
}

export function isChallengeComplete(challengeId) {
  return getChallengeProgress()[challengeId] === true;
}
