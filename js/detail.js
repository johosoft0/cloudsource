// ============================================================
// CloudSource — detail.js
// ============================================================

import { CONDITIONS } from './config.js';
import { submitVote, getUserVote, getPhotoUrl, reportPhoto, deleteReport } from './db.js';
import { timeAgo, distanceMiles, showToast, showXpFloat, getModMode, getReporterLevel,
  renderAvatarSmall, clearLastReportTime, updateChallengeProgress, getChallengeProgress,
  getTodaysChallenges, escapeHtml } from './utils.js';
import { refreshProfile, checkAchievements, tryCompleteChallenge } from './auth.js';

const VOTE_RADIUS_MILES = 5;
let currentReport = null;
let onReportDeleted = null;

const condMap = {};
CONDITIONS.forEach(c => { condMap[c.key] = c; });

export function initDetail(deleteCallback) {
  onReportDeleted = deleteCallback;
  document.getElementById('btn-confirm').addEventListener('click', () => handleVote('confirm'));
  document.getElementById('btn-deny').addEventListener('click', () => handleVote('deny'));
  document.getElementById('btn-close-detail').addEventListener('click', closeDetail);
  document.querySelector('#report-detail .modal-backdrop').addEventListener('click', closeDetail);
  document.getElementById('btn-flag-photo').addEventListener('click', handleFlagPhoto);
  document.getElementById('btn-delete-report').addEventListener('click', handleDelete);
}

export async function openDetail(report) {
  currentReport = report;
  const modal = document.getElementById('report-detail');
  const isMod = getModMode();

  // Photo
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
    photoEl.classList.add('hidden'); photoEl.src = '';
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

  // User info with avatar
  const rep = report.reputation || 25;
  const rLv = getReporterLevel(report.xp_report || 0);
  let badge = '';
  if (rep >= 75) badge = '<span class="user-badge badge-expert">Expert</span>';
  else if (rep >= 50) badge = '<span class="user-badge badge-trusted">Trusted</span>';
  const safeName = escapeHtml(report.display_name || 'Weather Watcher');
  document.getElementById('detail-user').innerHTML =
    `${renderAvatarSmall(report.xp_report || 0)} <span>${safeName} · ${rLv.title} ${badge}</span>`;

  // Votes
  document.getElementById('confirm-count').textContent = report.confirm_count || 0;
  document.getElementById('deny-count').textContent = report.deny_count || 0;

  const confirmBtn = document.getElementById('btn-confirm');
  const denyBtn = document.getElementById('btn-deny');
  const voteMsg = document.getElementById('vote-message');
  confirmBtn.className = 'vote-btn'; denyBtn.className = 'vote-btn';
  confirmBtn.disabled = false; denyBtn.disabled = false;
  if (voteMsg) voteMsg.textContent = '';

  const withinRange = isWithinVoteRange(report);
  let alreadyVoted = false;

  if (window._csUser) {
    try {
      const existing = await getUserVote(report.id, window._csUser.id);
      if (existing === 'confirm') { confirmBtn.classList.add('voted-confirm'); alreadyVoted = true; }
      else if (existing === 'deny') { denyBtn.classList.add('voted-deny'); alreadyVoted = true; }
    } catch {}
  }

  const isOwnReport = window._csUser && report.user_id === window._csUser.id;

  if (alreadyVoted) {
    confirmBtn.disabled = true; denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'You already voted on this report';
  } else if (isOwnReport) {
    confirmBtn.disabled = true; denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'Your report — auto-confirmed';
  } else if (!withinRange) {
    confirmBtn.disabled = true; denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'Too far away to vote (5 mi max)';
  } else if (!window._csUser) {
    confirmBtn.disabled = true; denyBtn.disabled = true;
    if (voteMsg) voteMsg.textContent = 'Sign in to vote';
  }

  // Delete button
  const deleteBtn = document.getElementById('btn-delete-report');
  deleteBtn.classList.toggle('hidden', !isOwnReport);

  modal.classList.remove('hidden');
}

function isWithinVoteRange(report) {
  const pos = window._csUserPos;
  if (!pos) return false;
  if (report.distance_miles != null) return report.distance_miles <= VOTE_RADIUS_MILES;
  if (report.lat && report.lng) return distanceMiles(pos.lat, pos.lng, report.lat, report.lng) <= VOTE_RADIUS_MILES;
  return false;
}

async function handleVote(voteType) {
  if (!window._csUser || !currentReport) return;
  const confirmBtn = document.getElementById('btn-confirm');
  const denyBtn = document.getElementById('btn-deny');
  if (confirmBtn.disabled && denyBtn.disabled) return;

  try {
    await submitVote(currentReport.id, window._csUser.id, voteType);
    confirmBtn.className = 'vote-btn'; denyBtn.className = 'vote-btn';

    if (voteType === 'confirm') {
      confirmBtn.classList.add('voted-confirm');
      document.getElementById('confirm-count').textContent = (parseInt(document.getElementById('confirm-count').textContent) || 0) + 1;
    } else {
      denyBtn.classList.add('voted-deny');
      document.getElementById('deny-count').textContent = (parseInt(document.getElementById('deny-count').textContent) || 0) + 1;
    }

    confirmBtn.disabled = true; denyBtn.disabled = true;
    const voteMsg = document.getElementById('vote-message');
    if (voteMsg) voteMsg.textContent = 'Vote recorded';

    showToast(`Vote recorded: ${voteType}`, 'success');
    const votedBtn = voteType === 'confirm' ? confirmBtn : denyBtn;
    showXpFloat(votedBtn, 3, 'community');

    await refreshProfile();
    await checkAchievements();

    // Challenge tracking
    const progress = getChallengeProgress();
    const todayVotes = (progress._vote_count || 0) + 1;
    const todayConfirms = (progress._confirm_count || 0) + (voteType === 'confirm' ? 1 : 0);
    updateChallengeProgress('_vote_count', todayVotes);
    updateChallengeProgress('_confirm_count', todayConfirms);

    const challenges = getTodaysChallenges();
    for (const c of challenges) {
      if (c.check === 'five_votes' && todayVotes >= 5) await tryCompleteChallenge(c.id, c.xp, 'xp_community');
      if (c.check === 'three_votes' && todayVotes >= 3) await tryCompleteChallenge(c.id, c.xp, 'xp_community');
      if (c.check === 'confirm_three' && todayConfirms >= 3) await tryCompleteChallenge(c.id, c.xp, 'xp_community');
      if (c.check === 'quick_confirm' && voteType === 'confirm') {
        const reportAge = (Date.now() - new Date(currentReport.created_at).getTime()) / 60000;
        if (reportAge <= 10) await tryCompleteChallenge(c.id, c.xp, 'xp_community');
      }
      if (c.check === 'nearby_vote' && currentReport.distance_miles != null && currentReport.distance_miles <= 3) {
        await tryCompleteChallenge(c.id, c.xp, 'xp_community');
      }
    }
  } catch {
    showToast('Failed to vote', 'error');
  }
}

async function handleFlagPhoto() {
  if (!window._csUser) { showToast('Sign in to report photos', 'error'); return; }
  if (!currentReport) return;
  const isMod = getModMode();
  if (!confirm(isMod ? 'Submit a moderation report for this photo?' : 'Report this photo as inappropriate? It will be hidden immediately.')) return;
  const btn = document.getElementById('btn-flag-photo');
  btn.disabled = true;
  try {
    await reportPhoto(currentReport.id, window._csUser.id, 'flagged by user');
    if (isMod) {
      const nc = (currentReport.report_count || 0) + 1;
      currentReport.report_count = nc;
      const fc = document.getElementById('flag-count');
      if (fc) fc.textContent = `${nc}`;
      showToast(`Photo reported (${nc}/10 flags)`, 'success');
      if (nc >= 10) { document.getElementById('detail-photo').classList.add('hidden'); btn.classList.add('hidden'); showToast('Photo permanently removed', 'success'); }
    } else {
      showToast('Photo reported and hidden', 'success');
      document.getElementById('detail-photo').classList.add('hidden'); btn.classList.add('hidden');
    }
  } catch (err) {
    showToast((err.message || '').includes('unique') ? 'You already reported this photo' : 'Failed to report photo', 'error');
  } finally { btn.disabled = false; }
}

async function handleDelete() {
  if (!window._csUser || !currentReport || currentReport.user_id !== window._csUser.id) return;
  if (!confirm('Delete this report? This cannot be undone.')) return;
  const btn = document.getElementById('btn-delete-report');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await deleteReport(currentReport.id);
    clearLastReportTime();
    showToast('Report deleted', 'success');
    closeDetail();
    if (onReportDeleted) onReportDeleted();
  } catch { showToast('Failed to delete report', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Delete My Report'; }
}

export function closeDetail() {
  document.getElementById('report-detail').classList.add('hidden');
  currentReport = null;
}
