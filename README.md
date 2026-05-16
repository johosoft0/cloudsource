# Cloudsource Weather

Hyper-local, crowd-sourced weather intelligence for the Grand Strand and beyond. See what's actually happening on your street through geolocated photo reports — not generalized forecasts from miles away.

**Built by JoCo Labs**

## Features

- **Live Map** — Real-time report markers with opacity decay over 6 hours, trust-weighted sizing, and viewport-based loading up to 50 miles
- **Photo Reports** — Snap a photo, tag the condition and intensity, submit in under 15 seconds
- **Timeline Scrub** — Slide back through the last 6 hours of weather history
- **Voting** — Confirm or deny reports within 5 miles to build community trust
- **NEXRAD Radar** — Iowa State Mesonet radar overlay with 7-frame animation
- **Dual XP System** — Reporter XP for submissions (base + photo + note bonuses), Community XP for voting
- **20-Level Rank Progressions** — Reporter ranks (Drizzle Spotter → Force of Nature) and Community ranks (Observer → Voice of the Crowd) with color-tiered avatars
- **Reputation System** — 0–100 score driven by vote outcomes, with 7-day deny-spam detection and moderation rep hits
- **Daily Challenges** — 3 rotating challenges per day (report, community, streak) with bonus XP
- **15 Achievements** — Milestones for reports, streaks, reputation, voting, and levels
- **Photo Moderation** — Community flagging with progressive rep penalties and auto-deletion at 10 flags
- **Confidence Scoring** — Each report gets a 0–1 confidence score based on reporter reputation and vote consensus
- **Baseline Weather Comparison** — Every report stores what Open-Meteo said alongside what the user observed
- **WMO Code Standardization** — Conditions mapped to international weather codes for data interoperability
- **Rate Limiting** — 1 report per hour (client-side, cleared on delete)
- **GPS Privacy** — Location fuzzed ~100m before storage, cached coordinates also fuzzed
- **XSS Protection** — Display names escaped before innerHTML insertion
- **PWA** — Installable on any device, works from home screen

## Tech Stack

- **Frontend**: Vanilla JS (ES Modules), Leaflet.js + OpenStreetMap, no build tools
- **Backend**: Supabase (Postgres + PostGIS, Auth via magic link, Storage, Realtime)
- **Weather**: Open-Meteo (forecast baseline, no API key)
- **Radar**: Iowa State Mesonet / NEXRAD (free tile cache)
- **Hosting**: GitHub Pages (static files, no build step)
- **Domain**: cloudsourceweather.app

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migrations in order in the Supabase SQL Editor
3. Update `js/config.js` with your Supabase URL and anon key
4. Configure the photos storage bucket (public, 5MB limit, jpeg/png/webp only)
5. Deploy to GitHub Pages or any static host
6. Set Supabase Auth redirect URLs to your domain

## Project Structure

```
cloudsource/
├── index.html          ← Single-page app entry
├── terms.html          ← Terms of service & privacy policy
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (disabled during dev)
├── CNAME               ← Custom domain for GitHub Pages
├── css/
│   └── app.css         ← Full design system
├── js/
│   ├── app.js          ← Boot, GPS, data loading, help modal
│   ├── config.js       ← Supabase creds, constants, levels, challenges
│   ├── db.js           ← Supabase client (auth, queries, storage, realtime)
│   ├── utils.js        ← Geo, time, avatar, XP levels, rate limiting, challenges
│   ├── weather.js      ← Open-Meteo conditions + baseline fetch
│   ├── map.js          ← Leaflet map, markers, radius circle
│   ├── radar.js        ← NEXRAD radar overlay + animation
│   ├── report.js       ← Report submission + challenge tracking
│   ├── timeline.js     ← 6-hour time scrub + filtering
│   ├── detail.js       ← Report detail modal + voting + delete
│   └── auth.js         ← Auth, profile, achievements, daily challenges
└── assets/
    └── icons/          ← PWA icons (192px, 512px)
```

## Data Model

Reports include structured observation data alongside forecast baselines:

- **Condition** — 10 types mapped to WMO Present Weather codes
- **Intensity** — 1–5 scale
- **Baseline** — What Open-Meteo predicted at report time (condition + temp)
- **Confidence** — 0–1 score computed from reporter reputation + vote consensus
- **Status** — Active reports visible for 6 hours, then soft-archived (never deleted)

A `weather_grid` table is ready for future hourly aggregation by 1km grid cell.

## Zero API Keys

The entire stack runs with zero third-party API keys:
- **Supabase anon key** is designed for frontend use (RLS controls access)
- **Open-Meteo** requires no key or signup
- **Iowa State Mesonet** NEXRAD tiles are free public data
- **OpenStreetMap tiles** are free with attribution
- **GitHub Pages** is free static hosting

## License

MIT
