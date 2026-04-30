// ============================================================
// CloudSource — auth.js
// Auth, tabbed profile (General / Reporter / Community)
// ============================================================

import { ACHIEVEMENTS, REPORTER_LEVELS, COMMUNITY_LEVELS } from './config.js';
import { getUser, getProfile, updateProfile, signInWithEmail, signOut, onAuthChange } from './db.js';
import { showToast, getModMode, setModMode } from './utils.js';

let currentUser = null;
let currentProfile = null;

// ── Init ─────────────────────────────────────────────────

export async function initAuth() {
  // Auth form
  document.getElementById('btn-send-magic').addEventListener('click', handleMagicLink);
  document.getElementById('auth-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleMagicLink();
  });

  // Profile actions
  document.getElementById('btn-signout').addEventListener('click', handleSignOut);
  document.getElementById('btn-profile').addEventListener('click', openProfileModal);
  document.getElementById('btn-close-profile').addEventListener('click', closeProfileModal);
  document.querySelector('#profile-modal .modal-backdrop').addEventListener('click', closeProfileModal);

  // Name editing
  document.getElementById('btn-edit-name').addEventListener('click', () => {
    const row = document.getElementById('name-edit-row');
    const input = document.getElementById('edit-name-input');
    input.value = currentProfile?.display_name || '';
    row.classList.remove('hidden');
    document.getElementById('btn-edit-name').classList.add('hidden');
    input.focus();
  });
  document.getElementById('btn-save-name').addEventListener('click', saveName);
  document.getElementById('btn-cancel-edit').addEventListener('click', cancelEdit);

  // Tab switching
  document.querySelectorAll('#profile-view .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

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

  // Initial session
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

// ── View Switching ───────────────────────────────────────

function switchToAuthView() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-status').textContent = '';
}

function switchToProfileView() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('profile-view').classList.remove('hidden');
  cancelEdit();
  populateGeneral();
  populateReporter();
  populateCommunity();
  switchTab('general');
}

// ── Tab Switching ────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('#profile-view .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('#profile-view .tab-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== `tab-${tabId}`);
  });
}

// ── General Tab ──────────────────────────────────────────

function populateGeneral() {
  const p = currentProfile;
  const fallback = currentUser?.email?.split('@')[0] || 'Weather Watcher';

  // Header
  const rLv = getReporterLevel(p?.xp_report || 0);
  document.getElementById('profile-level-badge').textContent = rLv.level;
  document.getElementById('profile-name').textContent = p?.display_name || fallback;

  const rep = p?.reputation || 25;
  let repLabel = 'Newcomer';
  if (rep >= 75) repLabel = 'Local Expert';
  else if (rep >= 50) repLabel = 'Trusted';
  else if (rep >= 25) repLabel = 'Active';
  document.getElementById('profile-rep').textContent = `${repLabel} · ${rep.toFixed(1)} rep`;

  // Stats
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
      <div class="stat-value">${rLv.level}</div>
      <div class="stat-label">Reporter Lv</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${getCommunityLevel(p?.xp_community || 0).level}</div>
      <div class="stat-label">Community Lv</div>
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

  // Mod toggle
  const modToggle = document.getElementById('mod-toggle');
  if (modToggle) {
    modToggle.checked = getModMode();
    modToggle.onchange = () => {
      setModMode(modToggle.checked);
      if (modToggle.checked) {
        showToast('Mod mode enabled — you may see flagged photos');
      } else {
        showToast('Mod mode disabled');
      }
    };
  }
}

// ── Reporter Tab ─────────────────────────────────────────

function populateReporter() {
  const xp = currentProfile?.xp_report || 0;
  const current = getReporterLevel(xp);
  const nextIdx = REPORTER_LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = REPORTER_LEVELS[nextIdx] || null;
  const xpInLevel = next ? xp - current.xp : 0;
  const xpNeeded = next ? next.xp - current.xp : 1;
  const pct = next ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;

  const el = document.getElementById('reporter-content');
  el.innerHTML = `
    <div class="level-hero">
      <span class="level-hero-badge">${current.badge}</span>
      <div class="level-hero-info">
        <div class="level-hero-title">${current.title}</div>
        <div class="level-hero-sub">Reporter Level ${current.level}</div>
      </div>
    </div>

    <div class="xp-bar-wrap">
      <div class="xp-bar-track">
        <div class="xp-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="xp-bar-label">
        <span>${xp} XP</span>
        <span>${next ? `${next.xp} XP to Lv ${next.level}` : 'MAX LEVEL'}</span>
      </div>
    </div>

    <div class="xp-breakdown">
      <h4>XP per report</h4>
      <div class="xp-row"><span>Base submission</span><span>+10</span></div>
      <div class="xp-row"><span>Attach photo</span><span>+10</span></div>
      <div class="xp-row"><span>Add note</span><span>+5</span></div>
      <div class="xp-row total"><span>Max per report</span><span>25</span></div>
    </div>

    <h4 style="margin-top:16px;">All Ranks</h4>
    <div class="level-list">
      ${REPORTER_LEVELS.map(l => `
        <div class="level-row ${l.level <= current.level ? 'unlocked' : 'locked'}">
          <span class="level-row-badge">${l.badge}</span>
          <div class="level-row-info">
            <span class="level-row-title">Lv ${l.level} — ${l.title}</span>
            <span class="level-row-xp">${l.xp} XP</span>
          </div>
          ${l.level === current.level ? '<span class="level-you">YOU</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ── Community Tab ────────────────────────────────────────

function populateCommunity() {
  const xp = currentProfile?.xp_community || 0;
  const current = getCommunityLevel(xp);
  const nextIdx = COMMUNITY_LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = COMMUNITY_LEVELS[nextIdx] || null;
  const xpInLevel = next ? xp - current.xp : 0;
  const xpNeeded = next ? next.xp - current.xp : 1;
  const pct = next ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;

  const el = document.getElementById('community-content');
  el.innerHTML = `
    <div class="level-hero">
      <span class="level-hero-badge">${current.badge}</span>
      <div class="level-hero-info">
        <div class="level-hero-title">${current.title}</div>
        <div class="level-hero-sub">Community Level ${current.level}</div>
      </div>
    </div>

    <div class="xp-bar-wrap">
      <div class="xp-bar-track">
        <div class="xp-bar-fill xp-bar-community" style="width:${pct}%"></div>
      </div>
      <div class="xp-bar-label">
        <span>${xp} XP</span>
        <span>${next ? `${next.xp} XP to Lv ${next.level}` : 'MAX LEVEL'}</span>
      </div>
    </div>

    <div class="xp-breakdown">
      <h4>XP per action</h4>
      <div class="xp-row"><span>Confirm or deny a report</span><span>+3</span></div>
    </div>

    <h4 style="margin-top:16px;">All Ranks</h4>
    <div class="level-list">
      ${COMMUNITY_LEVELS.map(l => `
        <div class="level-row ${l.level <= current.level ? 'unlocked' : 'locked'}">
          <span class="level-row-badge">${l.badge}</span>
          <div class="level-row-info">
            <span class="level-row-title">Lv ${l.level} — ${l.title}</span>
            <span class="level-row-xp">${l.xp} XP</span>
          </div>
          ${l.level === current.level ? '<span class="level-you">YOU</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ── Level Helpers ────────────────────────────────────────

function getReporterLevel(xp) {
  let result = REPORTER_LEVELS[0];
  for (const l of REPORTER_LEVELS) {
    if (xp >= l.xp) result = l;
    else break;
  }
  return result;
}

function getCommunityLevel(xp) {
  let result = COMMUNITY_LEVELS[0];
  for (const l of COMMUNITY_LEVELS) {
    if (xp >= l.xp) result = l;
    else break;
  }
  return result;
}

// ── Name Editing ─────────────────────────────────────────

async function saveName() {
  const input = document.getElementById('edit-name-input');
  const name = input.value.trim();
  if (!name || name.length < 2) { showToast('Name must be at least 2 characters', 'error'); return; }
  if (name.length > 20) { showToast('Name must be 20 characters or less', 'error'); return; }

  const btn = document.getElementById('btn-save-name');
  btn.disabled = true;
  try {
    currentProfile = await updateProfile(currentUser.id, { display_name: name });
    showToast('Name updated!', 'success');
    cancelEdit();
    populateGeneral();
  } catch (err) {
    const msg = (err.message || '').includes('unique') ? 'That name is already taken' : 'Failed to update name';
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
  }
}

function cancelEdit() {
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
  } catch { showToast('Failed to sign out', 'error'); }
}

// ── Modal ────────────────────────────────────────────────

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
  cancelEdit();
}

export function getCurrentUser() { return currentUser; }
export function getCurrentProfile() { return currentProfile; }

export async function refreshProfile() {
  if (!currentUser) return;
  try {
    currentProfile = await getProfile(currentUser.id);
    populateGeneral();
    populateReporter();
    populateCommunity();
  } catch {}
}
