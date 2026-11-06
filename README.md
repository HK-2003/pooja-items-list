# Pooja Samagri

Web + Android/iOS app (Vite + React + Capacitor) with an Express + MongoDB API.

## Setup
1. Put your MongoDB link in `.env` → `MONGODB_URI=...`
2. `npm run server` — starts API on :4000 (seeds the 37 default items + a sample list on an empty DB)
3. `npm run dev` — web app
4. Mobile: set `VITE_API_URL` in `.env` to an address the phone can reach (LAN IP or deployed URL), then `npm run android` / `npm run ios`

Admin PIN defaults to `1234` (change it in Admin → Sheet & security).
Regenerate icons after editing `public/logo.svg`: `node scripts/make-icons.mjs && npx capacitor-assets generate`
