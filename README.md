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
## Zero API Keys

The entire stack runs with zero API keys in the client:
- **Supabase anon key** is safe to expose (RLS controls access)
- **Open-Meteo** requires no key or signup
- **OpenStreetMap tiles** are free with attribution
- **GitHub Pages** is free static hosting

## License

MIT
