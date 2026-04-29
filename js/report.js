// ============================================================
// CloudSource — report.js
// Report submission: camera, EXIF geotag, condition, upload
// ============================================================

import { CONDITIONS, PHOTO_GPS_MAX_DISTANCE_MI } from './config.js';
import { submitReport, uploadPhoto } from './db.js';
import { resizeImage, extractExifGps, distanceMiles, getCurrentPosition, showToast } from './utils.js';

let selectedCondition = null;
let photoBlob = null;
let photoGps = null; // GPS from photo EXIF
let rawFile = null;  // original file for EXIF reading
let submitCallback = null;

export function initReportForm(onSubmitted) {
  submitCallback = onSubmitted;

  // Build condition grid
  const grid = document.getElementById('condition-grid');
  grid.innerHTML = '';
  CONDITIONS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'condition-btn';
    btn.dataset.condition = c.key;
    btn.innerHTML = `<span class="cond-icon">${c.icon}</span><span>${c.label}</span>`;
    btn.addEventListener('click', () => selectCondition(c.key));
    grid.appendChild(btn);
  });

  document.getElementById('btn-camera').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });
  document.getElementById('photo-input').addEventListener('change', handlePhotoSelect);

  const noteEl = document.getElementById('report-note');
  noteEl.addEventListener('input', () => {
    document.querySelector('.char-count').textContent = `${noteEl.value.length}/140`;
  });

  document.getElementById('btn-cancel').addEventListener('click', closeReportModal);
  document.getElementById('btn-submit').addEventListener('click', handleSubmit);
  document.querySelector('#report-modal .modal-backdrop').addEventListener('click', closeReportModal);
}

function selectCondition(key) {
  selectedCondition = key;
  document.querySelectorAll('.condition-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.condition === key);
  });
}

async function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  rawFile = file;
  photoGps = null;

  try {
    // Extract EXIF GPS before resizing (resize strips EXIF)
    const gps = await extractExifGps(file);
    if (gps) {
      photoGps = gps;
      updateGpsIndicator(true, gps);
    } else {
      updateGpsIndicator(false);
    }

    // Resize for upload
    photoBlob = await resizeImage(file);
    const preview = document.getElementById('photo-preview');
    preview.src = URL.createObjectURL(photoBlob);
    preview.classList.remove('hidden');
    document.getElementById('btn-camera').style.display = 'none';
  } catch {
    showToast('Failed to process photo', 'error');
  }
}

function updateGpsIndicator(hasGps, gps = null) {
  const indicator = document.getElementById('photo-gps-indicator');
  if (!indicator) return;
  if (hasGps && gps) {
    indicator.textContent = `📍 Photo GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`;
    indicator.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
  }
}

async function handleSubmit() {
  if (!selectedCondition) {
    showToast('Select a condition', 'error');
    return;
  }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    // Get device GPS (high accuracy for submissions)
    const devicePos = await getCurrentPosition(true);

    // Determine report location: use photo GPS if available and within range
    let reportLat = devicePos.lat;
    let reportLng = devicePos.lng;

    if (photoGps) {
      const dist = distanceMiles(devicePos.lat, devicePos.lng, photoGps.lat, photoGps.lng);
      if (dist <= PHOTO_GPS_MAX_DISTANCE_MI) {
        reportLat = photoGps.lat;
        reportLng = photoGps.lng;
      } else {
        showToast(`Photo GPS too far (${dist.toFixed(1)}mi), using device location`);
      }
    }

    // Upload photo
    let photoPath = null;
    if (photoBlob && window._csUser) {
      photoPath = await uploadPhoto(window._csUser.id, photoBlob);
    }

    // Submit
    const report = await submitReport({
      userId: window._csUser.id,
      lat: reportLat,
      lng: reportLng,
      condition: selectedCondition,
      intensity: parseInt(document.getElementById('intensity-slider').value),
      note: document.getElementById('report-note').value.trim(),
      photoPath,
    });

    showToast('Report submitted!', 'success');
    closeReportModal();
    if (submitCallback) submitCallback(report);
  } catch (err) {
    console.error('Submit error:', err);
    showToast(err.message || 'Failed to submit', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Report';
  }
}

export function openReportModal() {
  if (!window._csUser) {
    showToast('Sign in to submit reports', 'error');
    document.getElementById('profile-modal').classList.remove('hidden');
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
  selectedCondition = null;
  photoBlob = null;
  photoGps = null;
  rawFile = null;
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
