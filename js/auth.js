// ============================================================
// CloudSource — auth.js
// Auth flows, profile display, achievements
// ============================================================

import { ACHIEVEMENTS } from './config.js';
import {
  getUser, getProfile, signInWithEmail, signOut, onAuthChange
} from './db.js';
import { showToast } from './utils.js';

let currentUser = null;
let currentProfile = null;
let onUserChange = null;

/**
 * Initialize auth UI and state
 */
export async function initAuth(userChangeCallback) {
  onUserChange = userChangeCallback;

  // Wire up auth form
  document.getElementById('btn-send-magic').addEventListener('click', handleMagicLink);
  document.getElementById('auth-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleMagicLink();
  });
  document.getElementById('btn-signout').addEventListener('click', handleSignOut);
  document.getElementById('btn-profile').addEventListener('click', openProfileModal);
  document.getElementById('btn-close-auth').addEventListener('click', closeProfileModal);
  document.getElementById('btn-close-profile').addEventListener('click', closeProfileModal);
  document.querySelector('#profile-modal .modal-backdrop').addEventListener('click', closeProfileModal);

  // Listen for auth state changes (handles magic link redirect)
  onAuthChange(async (user) => {
    currentUser = user;
    window._csUser = user;

    if (user) {
      try {
        currentProfile = await getProfile(user.id);
      } catch {
        currentProfile = null;
      }
      renderProfileView();
    } else {
      currentProfile = null;
      renderAuthView();
    }

    if (onUserChange) onUserChange(user);
  });

  // Check initial session
  const user = await getUser();
  currentUser = user;
  window._csUser = user;

  if (user) {
    try {
      currentProfile = await getProfile(user.id);
    } catch {
      currentProfile = null;
    }
    renderProfileView();
  }

  return user;
}

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

async function handleSignOut() {
  try {
    await signOut();
    currentUser = null;
    currentProfile = null;
    window._csUser = null;
    renderAuthView();
    closeProfileModal();
    showToast('Signed out');
  } catch {
    showToast('Failed to sign out', 'error');
  }
}

function renderAuthView() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-status').textContent = '';
}

function renderProfileView() {
  if (!currentProfile) return;

  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('profile-view').classList.remove('hidden');

  // Level badge
  document.getElementById('profile-level-badge').textContent = currentProfile.level || 1;

  // Name + reputation
  document.getElementById('profile-name').textContent = currentProfile.display_name || 'Weather Watcher';

  const rep = currentProfile.reputation || 25;
  let repLabel = 'Newcomer';
  if (rep >= 75) repLabel = 'Local Expert';
  else if (rep >= 50) repLabel = 'Trusted';
  else if (rep >= 25) repLabel = 'Active';
  document.getElementById('profile-rep').textContent = `${repLabel} · ${rep.toFixed(1)} reputation`;

  // Stats
  document.getElementById('profile-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${currentProfile.total_reports || 0}</div>
      <div class="stat-label">Reports</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${currentProfile.streak_days || 0}</div>
      <div class="stat-label">Day Streak</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${currentProfile.level || 1}</div>
      <div class="stat-label">Level</div>
    </div>
  `;

  // Achievements
  const earned = currentProfile.achievements || [];
  const achieveHtml = ACHIEVEMENTS.map(a => {
    const unlocked = earned.includes(a.key);
    return `
      <div class="achievement ${unlocked ? '' : 'locked'}">
        <span class="achievement-icon">${a.icon}</span>
        <div>
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('profile-achievements').innerHTML = `
    <h3>Achievements</h3>
    ${achieveHtml}
  `;
}

export function openProfileModal() {
  if (currentUser && currentProfile) {
    renderProfileView();
  } else {
    renderAuthView();
  }
  document.getElementById('profile-modal').classList.remove('hidden');
}

export function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentProfile() {
  return currentProfile;
}

/**
 * Refresh profile data from DB
 */
export async function refreshProfile() {
  if (!currentUser) return;
  try {
    currentProfile = await getProfile(currentUser.id);
    renderProfileView();
  } catch {
    // ignore
  }
}
