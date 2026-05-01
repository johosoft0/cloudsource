# CloudSource

Hyper-local, crowd-sourced weather intelligence. See what's actually happening on your street through geolocated photo reports, not generalized forecasts miles away.

## Features

- **Live Map** — Real-time report markers with opacity decay and trust-weighted sizing
- **Photo Reports** — Snap a photo, tag the condition, submit in under 15 seconds
- **Time Scrub** — Scrub back through the last 2 hours of reports
- **Voting** — Confirm or deny reports to build community trust
- **Reputation System** — Build your score through accurate, consistent contributions
- **Achievements** — Earn recognition for milestones and unique conditions documented
- **Baseline Weather** — Open-Meteo current conditions overlay (no API key needed)
- **PWA** — Installable on any device, offline app shell

## Tech Stack

- **Frontend**: Vanilla JS (ES Modules), Leaflet.js + OpenStreetMap
- **Backend**: Supabase (Postgres + PostGIS, Auth, Storage, Realtime)
- **Weather**: Open-Meteo (zero API keys)
- **Hosting**: GitHub Pages (static files, no build step)

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration SQL in the Supabase SQL Editor
3. Update `js/config.js` with your Supabase URL and anon key
4. Deploy to GitHub Pages or any static host

## Project Structure

```
cloudsource/
├── index.html          ← Single-page app entry
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline shell)
├── css/
│   └── app.css         ← Full design system
├── js/
│   ├── app.js          ← Entry point, module orchestration
│   ├── config.js       ← Supabase creds, constants, conditions
│   ├── db.js           ← Supabase client (auth, queries, storage, realtime)
│   ├── utils.js        ← Geo, time, image resize, toasts
│   ├── weather.js      ← Open-Meteo baseline conditions
│   ├── map.js          ← Leaflet map, markers, radius circle
│   ├── report.js       ← Report submission flow
│   ├── timeline.js     ← Time scrub + filtering
│   ├── detail.js       ← Report detail popup + voting
│   └── auth.js         ← Auth UI, profile, achievements
└── assets/
    └── icons/          ← PWA icons
```

## Zero API Keys

The entire stack runs with zero API keys in the client:
- **Supabase anon key** is safe to expose (RLS controls access)
- **Open-Meteo** requires no key or signup
- **OpenStreetMap tiles** are free with attribution
- **GitHub Pages** is free static hosting

## License

MIT
