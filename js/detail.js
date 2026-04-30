// ============================================================
// CloudSource — detail.js
// Report detail: photo, info, distance-gated voting, flagging
// ============================================================

import { CONDITIONS } from './config.js';
import { submitVote, getUserVote, getPhotoUrl, reportPhoto } from './db.js';
import { timeAgo, distanceMiles, showToast, showXpFloat, getModMode } from './utils.js';

const VOTE_RADIUS_MILES = 5;
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
  const isMod = getModMode();

  // Photo — mod-aware display
  const photoEl = document.getElementById('detail-photo');
  const flagBtn = document.getElementById('btn-flag-photo');
  const flagCount = document.getElementById('flag-count');
  photoEl.classList.remove('photo-flagged');

  const hasPhoto = report.photo_path;
  const isHidden = report.photo_hidden;

  if (hasPhoto && (!isHidden || isMod)) {
    photoEl.src = getPhotoUrl(report.photo_path);
    photoEl.classList.remove('hidden');
    if (isHidden && isMod) photoEl.classList.add('photo-flagged');
    flagBtn.classList.remove('hidden');
    if (flagCount) flagCount.textContent = report.report_count ? `${report.report_count}` : '';
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

  // Vote counts (reporter's self-confirm is included)
  document.getElementById('confirm-count').textContent = report.confirm_count || 0;
  document.getElementById('deny-count').textContent = report.deny_count || 0;

  // ── Voting eligibility ──
  const confirmBtn = document.getElementById('btn-confirm');
  const denyBtn = document.getElementById('btn-deny');
  const voteSection = document.getElementById('detail-votes');
  const voteMsg = document.getElementById('vote-message');

  confirmBtn.className = 'vote-btn';
  denyBtn.className = 'vote-btn';
  confirmBtn.disabled = false;
  denyBtn.disabled = false;
  if (voteMsg) voteMsg.textContent = '';

  // Check distance — can only vote within 5 miles
  const withinRange = isWithinVoteRange(report);

  // Check if user already voted
  let alreadyVoted = false;
  if (window._csUser) {
    try {
      const existing = await getUserVote(report.id, window._csUser.id);
      if (existing === 'confirm') {
        confirmBtn.classList.add('voted-confirm');
        alreadyVoted = true;
      } else if (existing === 'deny') {
        denyBtn.classList.add('voted-deny');
        alreadyVoted = true;
      }
    } catch { /* ignore */ }
  }

  // Disable voting if out of range, already voted, or own report
  const isOwnReport = window._csUser && report.user_id === window._csUser.id;

  if (alreadyVoted) {
    confirmBtn.disabled = true;
    denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'You already voted on this report';
  } else if (isOwnReport) {
    confirmBtn.disabled = true;
    denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'Your report — auto-confirmed';
  } else if (!withinRange) {
    confirmBtn.disabled = true;
    denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'Too far away to vote (5 mi max)';
  } else if (!window._csUser) {
    confirmBtn.disabled = true;
    denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'Sign in to vote';
  }

  modal.classList.remove('hidden');
}

function isWithinVoteRange(report) {
  const pos = window._csUserPos;
  if (!pos || report.distance_miles == null) {
    // If we have lat/lng on both, compute manually
    if (pos && report.lat && report.lng) {
      return distanceMiles(pos.lat, pos.lng, report.lat, report.lng) <= VOTE_RADIUS_MILES;
    }
    return false;
  }
  return report.distance_miles <= VOTE_RADIUS_MILES;
}

async function handleVote(voteType) {
  if (!window._csUser || !currentReport) return;

  const confirmBtn = document.getElementById('btn-confirm');
  const denyBtn = document.getElementById('btn-deny');

  // Double-check: don't allow if already disabled
  if (confirmBtn.disabled && denyBtn.disabled) return;

  try {
    await submitVote(currentReport.id, window._csUser.id, voteType);

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

    // Lock both buttons after voting
    confirmBtn.disabled = true;
    denyBtn.disabled = true;
    const voteMsg = document.getElementById('vote-message');
    if (voteMsg) voteMsg.textContent = 'Vote recorded';

    showToast(`Vote recorded: ${voteType}`, 'success');
    const votedBtn = voteType === 'confirm' ? confirmBtn : denyBtn;
    showXpFloat(votedBtn, 3, 'community');
  } catch (err) {
    const msg = (err.message || '').includes('unique')
      ? 'You already voted on this report'
      : 'Failed to vote';
    showToast(msg, 'error');
  }
}

async function handleFlagPhoto() {
  if (!window._csUser) { showToast('Sign in to report photos', 'error'); return; }
  if (!currentReport) return;

  const isMod = getModMode();
  const msg = isMod
    ? 'Submit a moderation report for this photo?'
    : 'Report this photo as inappropriate? It will be hidden immediately.';
  if (!confirm(msg)) return;

  const btn = document.getElementById('btn-flag-photo');
  btn.disabled = true;
  try {
    await reportPhoto(currentReport.id, window._csUser.id, 'flagged by user');
    if (isMod) {
      // Mods: update count, keep photo visible
      const newCount = (currentReport.report_count || 0) + 1;
      currentReport.report_count = newCount;
      const flagCount = document.getElementById('flag-count');
      if (flagCount) flagCount.textContent = `${newCount}`;
      showToast(`Photo reported (${newCount}/10 flags)`, 'success');
      if (newCount >= 10) {
        document.getElementById('detail-photo').classList.add('hidden');
        btn.classList.add('hidden');
        showToast('Photo permanently removed at 10 flags', 'success');
      }
    } else {
      // Non-mods: hide photo
      showToast('Photo reported and hidden', 'success');
      document.getElementById('detail-photo').classList.add('hidden');
      btn.classList.add('hidden');
    }
  } catch (err) {
    const emsg = (err.message || '').includes('unique') ? 'You already reported this photo' : 'Failed to report photo';
    showToast(emsg, 'error');
  } finally { btn.disabled = false; }
}

export function closeDetail() {
  document.getElementById('report-detail').classList.add('hidden');
  currentReport = null;
}
