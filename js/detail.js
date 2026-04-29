// ============================================================
// CloudSource — detail.js
// Report detail popup: photo, info, voting, photo flagging
// ============================================================

import { CONDITIONS } from './config.js';
import { submitVote, getUserVote, getPhotoUrl, reportPhoto } from './db.js';
import { timeAgo, showToast } from './utils.js';

let currentReport = null;

const condMap = {};
CONDITIONS.forEach(c => { condMap[c.key] = c; });

export function initDetail() {
  document.getElementById('btn-confirm').addEventListener('click', () => handleVote('confirm'));
  document.getElementById('btn-deny').addEventListener('click', () => handleVote('deny'));
  document.getElementById('btn-close-detail').addEventListener('click', closeDetail);
  document.querySelector('#report-detail .modal-backdrop').addEventListener('click', closeDetail);
  document.getElementById('btn-flag-photo').addEventListener('click', handleFlagPhoto);
}

export async function openDetail(report) {
  currentReport = report;
  const modal = document.getElementById('report-detail');

  // Photo
  const photoEl = document.getElementById('detail-photo');
  const flagBtn = document.getElementById('btn-flag-photo');

  if (report.photo_path) {
    photoEl.src = getPhotoUrl(report.photo_path);
    photoEl.classList.remove('hidden');
    flagBtn.classList.remove('hidden');
  } else {
    photoEl.classList.add('hidden');
    photoEl.src = '';
    flagBtn.classList.add('hidden');
  }

  // Condition
  const cond = condMap[report.condition] || { icon: '🌀', label: 'Other' };
  document.getElementById('detail-condition').textContent = `${cond.icon} ${cond.label} · Intensity ${report.intensity}/5`;

  // Meta
  document.getElementById('detail-meta').textContent =
    `${timeAgo(report.created_at)} · ${report.distance_miles?.toFixed(1) || '?'} mi away`;

  // Note
  document.getElementById('detail-note').textContent = report.note || '';

  // User info
  const rep = report.reputation || 25;
  let badge = '';
  if (rep >= 75) badge = '<span class="user-badge badge-expert">Expert</span>';
  else if (rep >= 50) badge = '<span class="user-badge badge-trusted">Trusted</span>';
  document.getElementById('detail-user').innerHTML =
    `${report.display_name || 'Weather Watcher'} · Lv ${report.level || 1} ${badge}`;

  // Vote counts
  document.getElementById('confirm-count').textContent = report.confirm_count || 0;
  document.getElementById('deny-count').textContent = report.deny_count || 0;

  // Reset vote buttons
  document.getElementById('btn-confirm').className = 'vote-btn';
  document.getElementById('btn-deny').className = 'vote-btn';

  // Check existing vote
  if (window._csUser) {
    try {
      const existing = await getUserVote(report.id, window._csUser.id);
      if (existing === 'confirm') document.getElementById('btn-confirm').classList.add('voted-confirm');
      else if (existing === 'deny') document.getElementById('btn-deny').classList.add('voted-deny');
    } catch { /* ignore */ }
  }

  modal.classList.remove('hidden');
}

async function handleVote(voteType) {
  if (!window._csUser) {
    showToast('Sign in to vote', 'error');
    return;
  }
  if (!currentReport) return;

  try {
    await submitVote(currentReport.id, window._csUser.id, voteType);

    const confirmBtn = document.getElementById('btn-confirm');
    const denyBtn = document.getElementById('btn-deny');
    confirmBtn.className = 'vote-btn';
    denyBtn.className = 'vote-btn';

    if (voteType === 'confirm') {
      confirmBtn.classList.add('voted-confirm');
      document.getElementById('confirm-count').textContent =
        (parseInt(document.getElementById('confirm-count').textContent) || 0) + 1;
    } else {
      denyBtn.classList.add('voted-deny');
      document.getElementById('deny-count').textContent =
        (parseInt(document.getElementById('deny-count').textContent) || 0) + 1;
    }

    showToast(`Vote recorded: ${voteType}`, 'success');
  } catch {
    showToast('Failed to vote', 'error');
  }
}

async function handleFlagPhoto() {
  if (!window._csUser) {
    showToast('Sign in to report photos', 'error');
    return;
  }
  if (!currentReport) return;

  // Confirm before flagging
  if (!confirm('Report this photo as inappropriate? It will be hidden immediately.')) return;

  const btn = document.getElementById('btn-flag-photo');
  btn.disabled = true;

  try {
    await reportPhoto(currentReport.id, window._csUser.id, 'flagged by user');
    showToast('Photo reported and hidden', 'success');

    // Hide photo in current view
    document.getElementById('detail-photo').classList.add('hidden');
    btn.classList.add('hidden');
  } catch (err) {
    const msg = err.message?.includes('duplicate') || err.message?.includes('unique')
      ? 'You already reported this photo'
      : 'Failed to report photo';
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
  }
}

export function closeDetail() {
  document.getElementById('report-detail').classList.add('hidden');
  currentReport = null;
}
