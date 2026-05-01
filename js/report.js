// ============================================================
// CloudSource — report.js
// ============================================================

import { CONDITIONS, PHOTO_GPS_MAX_DISTANCE_MI } from './config.js';
import { submitReport, uploadPhoto, submitVote } from './db.js';
import { resizeImage, extractExifGps, distanceMiles, fuzzLocation, getCurrentPosition,
  showToast, showXpFloat, canSubmitReport, setLastReportTime,
  updateChallengeProgress, getChallengeProgress, getTodaysChallenges } from './utils.js';
import { tryCompleteChallenge } from './auth.js';

let selectedCondition = null;
let photoBlob = null;
let photoGps = null;
let rawFile = null;
let submitCallback = null;

export function initReportForm(onSubmitted) {
  submitCallback = onSubmitted;
  const grid = document.getElementById('condition-grid');
  grid.innerHTML = '';
  CONDITIONS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'condition-btn'; btn.dataset.condition = c.key;
    btn.innerHTML = `<span class="cond-icon">${c.icon}</span><span>${c.label}</span>`;
    btn.addEventListener('click', () => selectCondition(c.key));
    grid.appendChild(btn);
  });
  document.getElementById('btn-camera').addEventListener('click', () => document.getElementById('photo-input').click());
  document.getElementById('photo-input').addEventListener('change', handlePhotoSelect);
  document.getElementById('report-note').addEventListener('input', () => {
    document.querySelector('.char-count').textContent = `${document.getElementById('report-note').value.length}/140`;
  });
  document.getElementById('btn-cancel').addEventListener('click', closeReportModal);
  document.getElementById('btn-submit').addEventListener('click', handleSubmit);
  document.querySelector('#report-modal .modal-backdrop').addEventListener('click', closeReportModal);
}

function selectCondition(key) {
  selectedCondition = key;
  document.querySelectorAll('.condition-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.condition === key));
}

async function handlePhotoSelect(e) {
  const file = e.target.files[0]; if (!file) return;
  rawFile = file; photoGps = null;
  try {
    const gps = await extractExifGps(file);
    if (gps) { photoGps = gps; updateGpsIndicator(true, gps); } else { updateGpsIndicator(false); }
    photoBlob = await resizeImage(file);
    const preview = document.getElementById('photo-preview');
    preview.src = URL.createObjectURL(photoBlob); preview.classList.remove('hidden');
    document.getElementById('btn-camera').style.display = 'none';
  } catch { showToast('Failed to process photo', 'error'); }
}

function updateGpsIndicator(hasGps, gps = null) {
  const el = document.getElementById('photo-gps-indicator');
  if (!el) return;
  if (hasGps && gps) { el.textContent = `📍 Photo GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`; el.classList.remove('hidden'); }
  else { el.classList.add('hidden'); }
}

async function handleSubmit() {
  if (!selectedCondition) { showToast('Select a condition', 'error'); return; }
  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    let devicePos;
    try { devicePos = await getCurrentPosition(false); }
    catch { if (window._csUserPos) devicePos = { ...window._csUserPos }; else throw new Error('Location unavailable'); }

    let baseLat = devicePos.lat, baseLng = devicePos.lng;
    if (photoGps) {
      const dist = distanceMiles(devicePos.lat, devicePos.lng, photoGps.lat, photoGps.lng);
      if (dist <= PHOTO_GPS_MAX_DISTANCE_MI) { baseLat = photoGps.lat; baseLng = photoGps.lng; }
      else { showToast(`Photo GPS too far (${dist.toFixed(1)}mi), using device location`); }
    }

    const fuzzed = fuzzLocation(baseLat, baseLng);
    let photoPath = null;
    if (photoBlob && window._csUser) photoPath = await uploadPhoto(window._csUser.id, photoBlob);

    const hasNote = document.getElementById('report-note').value.trim().length > 0;
    const report = await submitReport({
      userId: window._csUser.id, lat: fuzzed.lat, lng: fuzzed.lng,
      condition: selectedCondition,
      intensity: parseInt(document.getElementById('intensity-slider').value),
      note: document.getElementById('report-note').value.trim(),
      photoPath,
    });

    showToast('Report submitted!', 'success');
    let xpEarned = 10;
    if (photoBlob) xpEarned += 10;
    if (hasNote) xpEarned += 5;
    showXpFloat(btn, xpEarned, 'report');

    try { await submitVote(report.id, window._csUser.id, 'confirm'); } catch {}

    setLastReportTime();

    // Challenge tracking
    const progress = getChallengeProgress();
    const todayReports = (progress._report_count || 0) + 1;
    const todayConditions = new Set(progress._conditions || []);
    todayConditions.add(selectedCondition);
    updateChallengeProgress('_report_count', todayReports);
    updateChallengeProgress('_conditions', [...todayConditions]);

    const challenges = getTodaysChallenges();
    for (const c of challenges) {
      if (c.check === 'photo_report' && photoBlob) await tryCompleteChallenge(c.id, c.xp, 'xp_report');
      if (c.check === 'three_conds' && todayConditions.size >= 3) await tryCompleteChallenge(c.id, c.xp, 'xp_report');
      if (c.check === 'early_bird' && new Date().getHours() < 8) await tryCompleteChallenge(c.id, c.xp, 'xp_report');
      if (c.check === 'detailed' && photoBlob && hasNote) await tryCompleteChallenge(c.id, c.xp, 'xp_report');
      if (c.check === 'two_reports' && todayReports >= 2) await tryCompleteChallenge(c.id, c.xp, 'xp_report');
      if (c.check === 'streak_extend') await tryCompleteChallenge(c.id, c.xp, 'xp_report');
    }

    closeReportModal();
    if (submitCallback) submitCallback(report);
  } catch (err) {
    console.error('Submit error:', err);
    showToast(err.message || 'Failed to submit', 'error');
  } finally { btn.disabled = false; btn.textContent = 'Submit Report'; }
}

export function openReportModal() {
  if (!window._csUser) {
    showToast('Sign in to submit reports', 'error');
    document.getElementById('profile-modal').classList.remove('hidden');
    return;
  }
  const rateCheck = canSubmitReport();
  if (!rateCheck.allowed) {
    showToast(`You can report again in ${rateCheck.remaining} min`, 'error');
    return;
  }
  resetForm();
  document.getElementById('report-modal').classList.remove('hidden');
}

export function closeReportModal() {
  document.getElementById('report-modal').classList.add('hidden');
  resetForm();
}

function resetForm() {
  selectedCondition = null; photoBlob = null; photoGps = null; rawFile = null;
  document.querySelectorAll('.condition-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('intensity-slider').value = 3;
  document.getElementById('report-note').value = '';
  document.querySelector('.char-count').textContent = '0/140';
  document.getElementById('photo-preview').classList.add('hidden');
  document.getElementById('photo-preview').src = '';
  document.getElementById('btn-camera').style.display = '';
  document.getElementById('photo-input').value = '';
  document.getElementById('btn-submit').disabled = false;
  document.getElementById('btn-submit').textContent = 'Submit Report';
  updateGpsIndicator(false);
}
