// ============================================================
// CloudSource — config.js
// ============================================================

export const SUPABASE_URL = 'https://akhqfhihgakjlgsajppx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraHFmaGloZ2Framxnc2FqcHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTE5MjksImV4cCI6MjA5Mjk4NzkyOX0.eu_EXab5Z7zsRpjJvcMJMUDTyLjPdCtJFDgtIbzB50A';

export const INITIAL_ZOOM = 13;
export const DEFAULT_RADIUS = 5;
export const REPORT_TTL_MINUTES = 360;
export const REPORT_ARCHIVE_HOURS = 24;
export const MAX_PHOTO_WIDTH = 1200;
export const MAX_PHOTO_QUALITY = 0.8;
export const PHOTO_GPS_MAX_DISTANCE_MI = 1.0;
export const REPORT_COOLDOWN_MINUTES = 60;

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const NWS_API_URL = 'https://api.weather.gov';
export const NWS_USER_AGENT = 'CloudSource/1.0 (cloudsource-app)';
export const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export const XP_REPORT_BASE = 10;
export const XP_PHOTO_BONUS = 10;
export const XP_NOTE_BONUS = 5;
export const XP_VOTE = 3;
export const XP_CHALLENGE_REPORT = 25;
export const XP_CHALLENGE_COMMUNITY = 15;

// Reporter levels — 20 levels
export const REPORTER_LEVELS = [
  { level: 1,  xp: 0,     title: 'Drizzle Spotter',     badge: '🌱' },
  { level: 2,  xp: 100,   title: 'Cloud Watcher',       badge: '☁️' },
  { level: 3,  xp: 200,   title: 'Rain Reader',         badge: '🌦️' },
  { level: 4,  xp: 350,   title: 'Weather Scout',       badge: '🔭' },
  { level: 5,  xp: 500,   title: 'Storm Tracker',       badge: '⛈️' },
  { level: 6,  xp: 700,   title: 'Forecast Runner',     badge: '🏃' },
  { level: 7,  xp: 900,   title: 'Tempest Sage',        badge: '🌪️' },
  { level: 8,  xp: 1150,  title: 'Cyclone Hunter',      badge: '🎯' },
  { level: 9,  xp: 1400,  title: 'Weather Oracle',      badge: '🔮' },
  { level: 10, xp: 1700,  title: 'Atmosphere Master',   badge: '👑' },
  { level: 11, xp: 2000,  title: 'Barometer Baron',     badge: '🌡️' },
  { level: 12, xp: 2400,  title: 'Nimbus Captain',      badge: '⚓' },
  { level: 13, xp: 2800,  title: 'Gale Commander',      badge: '🫡' },
  { level: 14, xp: 3300,  title: 'Thunder Marshal',     badge: '⚡' },
  { level: 15, xp: 3800,  title: 'Jet Stream Rider',    badge: '🛩️' },
  { level: 16, xp: 4400,  title: 'Pressure Front Ace',  badge: '🃏' },
  { level: 17, xp: 5000,  title: 'Supercell Wrangler',  badge: '🤠' },
  { level: 18, xp: 5800,  title: 'Eye of the Storm',    badge: '🌀' },
  { level: 19, xp: 6600,  title: 'Climate Sovereign',   badge: '🏔️' },
  { level: 20, xp: 7500,  title: 'Force of Nature',     badge: '💎' },
];

// Community levels — 20 levels
export const COMMUNITY_LEVELS = [
  { level: 1,  xp: 0,     title: 'Observer',            badge: '👁️' },
  { level: 2,  xp: 50,    title: 'Responder',           badge: '💬' },
  { level: 3,  xp: 100,   title: 'Verifier',            badge: '✅' },
  { level: 4,  xp: 175,   title: 'Validator',           badge: '🛡️' },
  { level: 5,  xp: 250,   title: 'Guardian',            badge: '⚔️' },
  { level: 6,  xp: 350,   title: 'Sentinel',            badge: '🗼' },
  { level: 7,  xp: 450,   title: 'Watchkeeper',         badge: '🔔' },
  { level: 8,  xp: 575,   title: 'Warden',              badge: '🏛️' },
  { level: 9,  xp: 700,   title: 'Overseer',            badge: '🦅' },
  { level: 10, xp: 850,   title: 'Steward',             badge: '🌟' },
  { level: 11, xp: 1000,  title: 'Arbiter',             badge: '⚖️' },
  { level: 12, xp: 1200,  title: 'Truthseeker',         badge: '🔍' },
  { level: 13, xp: 1400,  title: 'Signal Keeper',       badge: '📡' },
  { level: 14, xp: 1650,  title: 'Consensus Builder',   badge: '🤝' },
  { level: 15, xp: 1900,  title: 'Trust Anchor',        badge: '⚓' },
  { level: 16, xp: 2200,  title: 'Weather Judge',       badge: '🧑‍⚖️' },
  { level: 17, xp: 2500,  title: 'Beacon Warden',       badge: '🗽' },
  { level: 18, xp: 2900,  title: 'Network Pillar',      badge: '🏗️' },
  { level: 19, xp: 3300,  title: 'Grand Moderator',     badge: '🏅' },
  { level: 20, xp: 3750,  title: 'Voice of the Crowd',  badge: '💎' },
];

// Conditions
export const CONDITIONS = [
  { key: 'clear',        icon: '☀️', label: 'Clear',       color: '#fbbf24' },
  { key: 'partly_cloudy',icon: '⛅', label: 'Partly',      color: '#a3c4e0' },
  { key: 'cloudy',       icon: '☁️', label: 'Cloudy',      color: '#94a3b8' },
  { key: 'light_rain',   icon: '🌦️', label: 'Lt Rain',     color: '#60a5fa' },
  { key: 'heavy_rain',   icon: '🌧️', label: 'Hv Rain',     color: '#3b82f6' },
  { key: 'storm',        icon: '⛈️', label: 'Storm',       color: '#8b5cf6' },
  { key: 'snow',         icon: '❄️', label: 'Snow',        color: '#e0e7ff' },
  { key: 'fog',          icon: '🌫️', label: 'Fog',         color: '#6b7280' },
  { key: 'wind',         icon: '💨', label: 'Wind',        color: '#14b8a6' },
  { key: 'other',        icon: '🌀', label: 'Other',       color: '#f472b6' },
];

// Achievements
export const ACHIEVEMENTS = [
  { key: 'first_drop',       icon: '💧', name: 'First Drop',      desc: 'Submit your first report' },
  { key: 'ten_reports',      icon: '🔟', name: 'Double Digits',   desc: 'Submit 10 reports' },
  { key: 'fifty_reports',    icon: '🏆', name: 'Half Century',    desc: 'Submit 50 reports' },
  { key: 'century',          icon: '💯', name: 'Century Club',    desc: 'Submit 100 reports' },
  { key: 'sunrise_streak',   icon: '🌅', name: 'Sunrise Streak',  desc: '7-day report streak' },
  { key: 'fortnight',        icon: '📅', name: 'Fortnight',       desc: '14-day report streak' },
  { key: 'local_legend',     icon: '⭐', name: 'Local Legend',    desc: 'Reach reputation 75+' },
  { key: 'night_owl',        icon: '🦉', name: 'Night Owl',       desc: 'Report between midnight and 5 AM' },
  { key: 'shutterbug',       icon: '📸', name: 'Shutterbug',      desc: 'Submit 10 reports with photos' },
  { key: 'first_vote',       icon: '🗳️', name: 'Civic Duty',      desc: 'Cast your first vote' },
  { key: 'fifty_votes',      icon: '📊', name: 'Poll Worker',     desc: 'Cast 50 votes' },
  { key: 'reporter_5',       icon: '🏅', name: 'Storm Tracker',   desc: 'Reach Reporter Level 5' },
  { key: 'reporter_10',      icon: '👑', name: 'Atmosphere Master',desc: 'Reach Reporter Level 10' },
  { key: 'community_5',      icon: '⚔️', name: 'Guardian',        desc: 'Reach Community Level 5' },
  { key: 'community_10',     icon: '🌟', name: 'Steward',         desc: 'Reach Community Level 10' },
];

// Daily challenge templates (rotated by day-of-year)
export const DAILY_CHALLENGES = {
  report: [
    { id: 'photo_report',    text: '📸 Submit a report with a photo',           check: 'photo_report',  xp: 25 },
    { id: 'three_conditions',text: '🌈 Report 3 different conditions today',    check: 'three_conds',   xp: 25 },
    { id: 'early_bird',      text: '🌅 Submit a report before 8 AM',            check: 'early_bird',    xp: 25 },
    { id: 'detailed_report', text: '📝 Submit a report with both photo and note',check: 'detailed',     xp: 25 },
    { id: 'two_reports',     text: '✌️ Submit 2 reports today',                  check: 'two_reports',   xp: 25 },
  ],
  community: [
    { id: 'five_votes',      text: '🗳️ Vote on 5 reports today',                check: 'five_votes',    xp: 15 },
    { id: 'quick_confirm',   text: '⚡ Confirm a report posted <10 min ago',    check: 'quick_confirm', xp: 15 },
    { id: 'nearby_vote',     text: '📍 Vote on a report within 3 miles',        check: 'nearby_vote',   xp: 15 },
    { id: 'three_votes',     text: '👍 Vote on 3 reports today',                check: 'three_votes',   xp: 15 },
    { id: 'confirm_streak',  text: '✅ Confirm 3 reports in a row',             check: 'confirm_three', xp: 15 },
  ],
  streak: [
    { id: 'extend_streak',   text: '🔥 Extend your report streak another day',  check: 'streak_extend', xp: 25 },
  ],
};
