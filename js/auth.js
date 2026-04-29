// ============================================================
// CloudSource — auth.js
// Auth, profile editing, XP display, achievements
// ============================================================

import { ACHIEVEMENTS, REPORTER_LEVEL_DIVISOR, COMMUNITY_LEVEL_DIVISOR } from './config.js';
import { getUser, getProfile, updateProfile, signInWithEmail, signOut, onAuthChange } from './db.js';
import { showToast } from './utils.js';

let currentUser = null;
let currentProfile = null;
let isEditing = false;

/**
 * Initialize auth UI and state
 */
export async function initAuth() {
  // Wire up event listeners
  document.getElementById('btn-send-magic').addEventListener('click', handleMagicLink);
  document.getElementById('auth-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleMagicLink();
  });
  document.getElementById('btn-signout').addEventListener('click', handleSignOut);
  document.getElementById('btn-profile').addEventListener('click', openProfileModal);
  document.getElementById('btn-close-profile').addEventListener('click', closeProfileModal);
  document.querySelector('#profile-modal .modal-backdrop').addEventListener('click', closeProfileModal);
  document.getElementById('btn-edit-name').addEventListener('click', startEditing);
  document.getElementById('btn-save-name').addEventListener('click', saveName);
  document.getElementById('btn-cancel-edit').addEventListener('click', cancelEditing);

  // Auth state listener
  onAuthChange(async (user) => {
    currentUser = user;
    window._csUser = user;
    if (user) {
      try { currentProfile = await getProfile(user.id); } catch { currentProfile = null; }
      switchToProfileView();
    } else {
      currentProfile = null;
      switchToAuthView();
    }
  });

  // Initial session check
  const user = await getUser();
  currentUser = user;
  window._csUser = user;
  if (user) {
    try { currentProfile = await getProfile(user.id); } catch { currentProfile = null; }
    switchToProfileView();
  } else {
    switchToAuthView();
  }

  return user;
}

// ── View Switching (the ONLY place visibility is controlled) ──

function switchToAuthView() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-status').textContent = '';
}

function switchToProfileView() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('profile-view').classList.remove('hidden');
  populateProfile();
}

// ── Profile Population ───────────────────────────────────

function populateProfile() {
  const p = currentProfile;
  const fallbackName = currentUser?.email?.split('@')[0] || 'Weather Watcher';

  // Level badge
  document.getElementById('profile-level-badge').textContent = p?.level || 1;

  // Name
  document.getElementById('profile-name').textContent = p?.display_name || fallbackName;

  // Reputation label
  const rep = p?.reputation || 25;
  let repLabel = 'Newcomer';
  if (rep >= 75) repLabel = 'Local Expert';
  else if (rep >= 50) repLabel = 'Trusted';
  else if (rep >= 25) repLabel = 'Active';
  document.getElementById('profile-rep').textContent = `${repLabel} · ${rep.toFixed(1)} rep`;

  // XP levels
  const reporterLv = Math.floor((p?.xp_report || 0) / REPORTER_LEVEL_DIVISOR) + 1;
  const communityLv = Math.floor((p?.xp_community || 0) / COMMUNITY_LEVEL_DIVISOR) + 1;

  // Stats grid
  document.getElementById('profile-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${p?.total_reports || 0}</div>
      <div class="stat-label">Reports</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${p?.streak_days || 0}</div>
      <div class="stat-label">Day Streak</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${reporterLv}</div>
      <div class="stat-label">Reporter Lv</div>
      <div class="stat-xp">${p?.xp_report || 0} XP</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${communityLv}</div>
      <div class="stat-label">Community Lv</div>
      <div class="stat-xp">${p?.xp_community || 0} XP</div>
    </div>
  `;

  // Achievements
  const earned = p?.achievements || [];
  document.getElementById('profile-achievements').innerHTML = `
    <h3>Achievements</h3>
    ${ACHIEVEMENTS.map(a => `
      <div class="achievement ${earned.includes(a.key) ? '' : 'locked'}">
        <span class="achievement-icon">${a.icon}</span>
        <div>
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
      </div>
    `).join('')}
  `;

  // Hide edit controls
  document.getElementById('name-edit-row').classList.add('hidden');
}

// ── Profile Editing ──────────────────────────────────────

function startEditing() {
  isEditing = true;
  const nameInput = document.getElementById('edit-name-input');
  nameInput.value = currentProfile?.display_name || '';
  document.getElementById('name-edit-row').classList.remove('hidden');
  document.getElementById('btn-edit-name').classList.add('hidden');
  nameInput.focus();
}

async function saveName() {
  const nameInput = document.getElementById('edit-name-input');
  const newName = nameInput.value.trim();

  if (!newName || newName.length < 2) {
    showToast('Name must be at least 2 characters', 'error');
    return;
  }
  if (newName.length > 20) {
    showToast('Name must be 20 characters or less', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-name');
  btn.disabled = true;

  try {
    currentProfile = await updateProfile(currentUser.id, { display_name: newName });
    showToast('Name updated!', 'success');
    cancelEditing();
    populateProfile();
  } catch (err) {
    const msg = err.message?.includes('duplicate') || err.message?.includes('unique')
      ? 'That name is already taken'
      : 'Failed to update name';
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
  }
}

function cancelEditing() {
  isEditing = false;
  document.getElementById('name-edit-row').classList.add('hidden');
  document.getElementById('btn-edit-name').classList.remove('hidden');
}

// ── Magic Link ───────────────────────────────────────────

async function handleMagicLink() {
  const emailInput = document.getElementById('auth-email');
  const status = document.getElementById('auth-status');
  const btn = document.getElementById('btn-send-magic');
  const email = emailInput.value.trim();

  if (!email || !email.includes('@')) {
    status.textContent = 'Enter a valid email';
    status.className = 'auth-status error';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await signInWithEmail(email);
    status.textContent = 'Check your email for the magic link!';
    status.className = 'auth-status success';
  } catch (err) {
    status.textContent = err.message || 'Failed to send link';
    status.className = 'auth-status error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Magic Link';
  }
}

// ── Sign Out ─────────────────────────────────────────────

async function handleSignOut() {
  try {
    await signOut();
    currentUser = null;
    currentProfile = null;
    window._csUser = null;
    switchToAuthView();
    closeProfileModal();
    showToast('Signed out');
  } catch {
    showToast('Failed to sign out', 'error');
  }
}

// ── Modal Open/Close ─────────────────────────────────────

export function openProfileModal() {
  if (currentUser) {
    switchToProfileView();
  } else {
    switchToAuthView();
  }
  document.getElementById('profile-modal').classList.remove('hidden');
}

export function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
  cancelEditing();
}

// ── Public Getters ───────────────────────────────────────

export function getCurrentUser() { return currentUser; }
export function getCurrentProfile() { return currentProfile; }

export async function refreshProfile() {
  if (!currentUser) return;
  try {
    currentProfile = await getProfile(currentUser.id);
    populateProfile();
  } catch { /* ignore */ }
}
