// ============================================================
// CloudSource — config.js
// ============================================================

export const SUPABASE_URL = 'https://akhqfhihgakjlgsajppx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraHFmaGloZ2Framxnc2FqcHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTE5MjksImV4cCI6MjA5Mjk4NzkyOX0.eu_EXab5Z7zsRpjJvcMJMUDTyLjPdCtJFDgtIbzB50A';

export const INITIAL_ZOOM = 13;
export const RADIUS_OPTIONS = [0.5, 5, 10];
export const DEFAULT_RADIUS = 5;
export const REPORT_TTL_MINUTES = 120;
export const REPORT_ARCHIVE_HOURS = 24;
export const MAX_PHOTO_WIDTH = 1200;
export const MAX_PHOTO_QUALITY = 0.8;
export const PHOTO_GPS_MAX_DISTANCE_MI = 1.0;

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const NWS_API_URL = 'https://api.weather.gov';
export const NWS_USER_AGENT = 'CloudSource/1.0 (cloudsource-app)';
export const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';

// XP constants (mirrored from SQL triggers)
export const XP_REPORT_BASE = 10;
export const XP_PHOTO_BONUS = 10;
export const XP_NOTE_BONUS = 5;
export const XP_INTENSITY_BONUS = 5;
export const XP_VOTE = 3;

// Reporter levels — 100 XP per level, 10 levels
export const REPORTER_LEVELS = [
  { level: 1,  xp: 0,    title: 'Drizzle Spotter',   badge: '🌱' },
  { level: 2,  xp: 100,  title: 'Cloud Watcher',     badge: '☁️' },
  { level: 3,  xp: 200,  title: 'Rain Reader',       badge: '🌦️' },
  { level: 4,  xp: 300,  title: 'Weather Scout',     badge: '🔭' },
  { level: 5,  xp: 400,  title: 'Storm Tracker',     badge: '⛈️' },
  { level: 6,  xp: 500,  title: 'Forecast Runner',   badge: '🏃' },
  { level: 7,  xp: 600,  title: 'Tempest Sage',      badge: '🌪️' },
  { level: 8,  xp: 700,  title: 'Cyclone Hunter',    badge: '🎯' },
  { level: 9,  xp: 800,  title: 'Weather Oracle',    badge: '🔮' },
  { level: 10, xp: 900,  title: 'Atmosphere Master', badge: '👑' },
];

// Community levels — 50 XP per level, 10 levels
export const COMMUNITY_LEVELS = [
  { level: 1,  xp: 0,    title: 'Observer',    badge: '👁️' },
  { level: 2,  xp: 50,   title: 'Responder',   badge: '💬' },
  { level: 3,  xp: 100,  title: 'Verifier',    badge: '✅' },
  { level: 4,  xp: 150,  title: 'Validator',    badge: '🛡️' },
  { level: 5,  xp: 200,  title: 'Guardian',     badge: '⚔️' },
  { level: 6,  xp: 250,  title: 'Sentinel',     badge: '🗼' },
  { level: 7,  xp: 300,  title: 'Watchkeeper',  badge: '🔔' },
  { level: 8,  xp: 400,  title: 'Warden',       badge: '🏛️' },
  { level: 9,  xp: 500,  title: 'Overseer',     badge: '🦅' },
  { level: 10, xp: 650,  title: 'Steward',      badge: '🌟' },
];

// Condition definitions
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

// Achievement definitions
export const ACHIEVEMENTS = [
  { key: 'first_drop',     icon: '💧', name: 'First Drop',      desc: 'Submit your first report' },
  { key: 'early_warning',  icon: '⚡', name: 'Early Warning',   desc: 'First to report a confirmed condition' },
  { key: 'storm_chaser',   icon: '🌪️', name: 'Storm Chaser',    desc: 'Report during a severe weather alert' },
  { key: 'sunrise_streak', icon: '🌅', name: 'Sunrise Streak',  desc: '7-day report streak' },
  { key: 'local_legend',   icon: '⭐', name: 'Local Legend',    desc: 'Reach reputation 75+' },
  { key: 'ten_reports',    icon: '🔟', name: 'Double Digits',   desc: 'Submit 10 reports' },
  { key: 'fifty_reports',  icon: '🏆', name: 'Half Century',    desc: 'Submit 50 reports' },
  { key: 'night_owl',      icon: '🦉', name: 'Night Owl',       desc: 'Report between midnight and 5 AM' },
];
