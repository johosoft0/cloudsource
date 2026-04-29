// ============================================================
// CloudSource — config.js
// App-wide constants and configuration
// ============================================================

export const SUPABASE_URL = 'https://akhqfhihgakjlgsajppx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraHFmaGloZ2Framxnc2FqcHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTE5MjksImV4cCI6MjA5Mjk4NzkyOX0.eu_EXab5Z7zsRpjJvcMJMUDTyLjPdCtJFDgtIbzB50A';

// Default location (Surfside Beach, SC)
export const DEFAULT_LAT = 33.6051;
export const DEFAULT_LNG = -78.9731;
export const DEFAULT_ZOOM = 13;

// Radius options in miles
export const RADIUS_OPTIONS = [0.5, 5, 10];
export const DEFAULT_RADIUS = 5;

// Report lifecycle
export const REPORT_TTL_MINUTES = 120; // 2 hours on live map
export const REPORT_ARCHIVE_HOURS = 24; // kept in timeline scrub

// Photo constraints
export const MAX_PHOTO_WIDTH = 1200;
export const MAX_PHOTO_QUALITY = 0.8;

// Open-Meteo (no key needed)
export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// NWS API (no key needed, just User-Agent)
export const NWS_API_URL = 'https://api.weather.gov';
export const NWS_USER_AGENT = 'CloudSource/1.0 (cloudsource-app)';

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
