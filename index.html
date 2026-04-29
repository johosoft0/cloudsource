// ============================================================
// CloudSource — weather.js
// Baseline weather from Open-Meteo (no API key)
// ============================================================

import { OPEN_METEO_URL } from './config.js';

// WMO weather code → human label + icon
const WMO_CODES = {
  0:  { label: 'Clear',           icon: '☀️' },
  1:  { label: 'Mostly Clear',    icon: '🌤️' },
  2:  { label: 'Partly Cloudy',   icon: '⛅' },
  3:  { label: 'Overcast',        icon: '☁️' },
  45: { label: 'Fog',             icon: '🌫️' },
  48: { label: 'Freezing Fog',    icon: '🌫️' },
  51: { label: 'Light Drizzle',   icon: '🌦️' },
  53: { label: 'Drizzle',         icon: '🌦️' },
  55: { label: 'Heavy Drizzle',   icon: '🌧️' },
  61: { label: 'Light Rain',      icon: '🌦️' },
  63: { label: 'Rain',            icon: '🌧️' },
  65: { label: 'Heavy Rain',      icon: '🌧️' },
  71: { label: 'Light Snow',      icon: '🌨️' },
  73: { label: 'Snow',            icon: '❄️' },
  75: { label: 'Heavy Snow',      icon: '❄️' },
  77: { label: 'Snow Grains',     icon: '❄️' },
  80: { label: 'Light Showers',   icon: '🌦️' },
  81: { label: 'Showers',         icon: '🌧️' },
  82: { label: 'Heavy Showers',   icon: '🌧️' },
  85: { label: 'Snow Showers',    icon: '🌨️' },
  86: { label: 'Heavy Snow Shwrs',icon: '🌨️' },
  95: { label: 'Thunderstorm',    icon: '⛈️' },
  96: { label: 'T-storm + Hail',  icon: '⛈️' },
  99: { label: 'T-storm + Hail',  icon: '⛈️' },
};

/**
 * Fetch current conditions from Open-Meteo
 * @param {number} lat
 * @param {number} lng
 * @returns {{ temp: number, label: string, icon: string, windSpeed: number, humidity: number }}
 */
export async function fetchCurrentWeather(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
  });

  const res = await fetch(`${OPEN_METEO_URL}?${params}`);
  if (!res.ok) throw new Error('Weather fetch failed');

  const json = await res.json();
  const current = json.current;

  const code = current.weather_code;
  const wmo = WMO_CODES[code] || { label: 'Unknown', icon: '❓' };

  return {
    temp: Math.round(current.temperature_2m),
    label: wmo.label,
    icon: wmo.icon,
    windSpeed: Math.round(current.wind_speed_10m),
    humidity: current.relative_humidity_2m,
    code,
  };
}

/**
 * Update the top bar with current conditions
 */
export async function updateConditionsBar(lat, lng) {
  const textEl = document.getElementById('conditions-text');
  const tempEl = document.getElementById('conditions-temp');

  try {
    const weather = await fetchCurrentWeather(lat, lng);
    textEl.textContent = `${weather.icon} ${weather.label}`;
    tempEl.textContent = `${weather.temp}°F`;
  } catch {
    textEl.textContent = 'Weather unavailable';
    tempEl.textContent = '';
  }
}
