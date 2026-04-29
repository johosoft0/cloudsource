// ============================================================
// CloudSource — detail.js
// Report detail popup: photo, info, voting
// ============================================================

import { CONDITIONS } from './config.js';
import { submitVote, getUserVote, getPhotoUrl } from './db.js';
import { timeAgo, showToast } from './utils.js';

let currentReport = null;

// Condition key → label + icon
const condMap = {};
CONDITIONS.forEach(c => { condMap[c.key] = c; });

/**
 * Initialize detail modal event handlers
 */
export function initDetail() {
  document.getElementById('btn-confirm').addEventListener('click', () => handleVote('confirm'));
  document.getElementById('btn-deny').addEventListener('click', () => handleVote('deny'));
  document.getElementById('btn-close-detail').addEventListener('click', closeDetail);
  document.querySelector('#report-detail .modal-backdrop').addEventListener('click', closeDetail);
}

/**
 * Open the detail modal for a report
 */
export async function openDetail(report) {
  currentReport = report;
  const modal = document.getElementById('report-detail');

  // Photo
  const photoEl = document.getElementById('detail-photo');
  if (report.photo_path) {
    photoEl.src = getPhotoUrl(report.photo_path);
    photoEl.classList.remove('hidden');
  } else {
    photoEl.classList.add('hidden');
    photoEl.src = '';
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

  // Reset vote button states
  document.getElementById('btn-confirm').className = 'vote-btn';
  document.getElementById('btn-deny').className = 'vote-btn';

  // Check if current user has voted
  if (window._csUser) {
    try {
      const existing = await getUserVote(report.id, window._csUser.id);
      if (existing === 'confirm') {
        document.getElementById('btn-confirm').classList.add('voted-confirm');
      } else if (existing === 'deny') {
        document.getElementById('btn-deny').classList.add('voted-deny');
      }
    } catch {
      // ignore
    }
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

    // Update UI
    const confirmBtn = document.getElementById('btn-confirm');
    const denyBtn = document.getElementById('btn-deny');
    confirmBtn.className = 'vote-btn';
    denyBtn.className = 'vote-btn';

    if (voteType === 'confirm') {
      confirmBtn.classList.add('voted-confirm');
      const count = parseInt(document.getElementById('confirm-count').textContent) || 0;
      document.getElementById('confirm-count').textContent = count + 1;
    } else {
      denyBtn.classList.add('voted-deny');
      const count = parseInt(document.getElementById('deny-count').textContent) || 0;
      document.getElementById('deny-count').textContent = count + 1;
    }

    showToast(`Vote recorded: ${voteType}`, 'success');
  } catch (err) {
    showToast('Failed to vote', 'error');
  }
}

export function closeDetail() {
  document.getElementById('report-detail').classList.add('hidden');
  currentReport = null;
}
