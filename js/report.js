// ============================================================
// CloudSource — report.js
// Report submission: camera, photo, condition picker, upload
// ============================================================

import { CONDITIONS } from './config.js';
import { submitReport, uploadPhoto } from './db.js';
import { resizeImage, showToast } from './utils.js';

let selectedCondition = null;
let photoBlob = null;
let submitCallback = null;

/**
 * Initialize the report form UI
 */
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

  // Camera button
  document.getElementById('btn-camera').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });

  // Photo input
  document.getElementById('photo-input').addEventListener('change', handlePhotoSelect);

  // Note character count
  const noteEl = document.getElementById('report-note');
  noteEl.addEventListener('input', () => {
    const count = noteEl.value.length;
    document.querySelector('.char-count').textContent = `${count}/140`;
  });

  // Cancel
  document.getElementById('btn-cancel').addEventListener('click', closeReportModal);

  // Submit
  document.getElementById('btn-submit').addEventListener('click', handleSubmit);

  // Backdrop close
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

  try {
    photoBlob = await resizeImage(file);
    const preview = document.getElementById('photo-preview');
    preview.src = URL.createObjectURL(photoBlob);
    preview.classList.remove('hidden');
    document.getElementById('btn-camera').style.display = 'none';
  } catch {
    showToast('Failed to process photo', 'error');
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
    // Get current position for the report
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    // Upload photo if present
    let photoPath = null;
    if (photoBlob && window._csUser) {
      photoPath = await uploadPhoto(window._csUser.id, photoBlob);
    }

    // Submit report
    const report = await submitReport({
      userId: window._csUser.id,
      lat: pos.lat,
      lng: pos.lng,
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
}
