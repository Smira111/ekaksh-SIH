# EKAKSH — Precision Cattle Care

A precision cattle-monitoring app: an Express/Node **backend** with real
accounts (sign up, log in, log out, change password, delete account) and a
JSON-file database, plus a redesigned **frontend** — the same dashboard,
herd list, health-warnings and settings screens as before, now wrapped in a
soft, light UI with a proper landing page, sign-up and login.

```
ekaksh/
├── backend/
│   ├── server.js         Routes: auth + farm-data API (also serves the frontend)
│   ├── db.js             Tiny JSON-file "database" (data/db.json, created on first run)
│   ├── defaultState.js   Seed data for a brand-new farm account
│   └── package.json
└── frontend/
    ├── index.html         App shell + original dashboard logic (HTML+CSS+JS)
    ├── theme.css          The new soft/light visual theme (loaded over the original CSS)
    └── auth.js            Landing page, login/sign-up, account settings, session handling
```

## Run it

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:3000**. The backend serves the frontend too, so
there's only one URL.

## What's new

- **Accounts.** Sign up with name, farm name, email and password. Passwords
  are salted + hashed (scrypt) and never stored in plain text. Sessions use
  an HTTP-only cookie, valid 30 days.
- **Every farm's data is private.** Cattle, gateways, milking/vet stats,
  language and farm profile are all scoped to the logged-in user — signing
  in as a different account shows a different (empty, freshly-seeded) farm.
- **Settings → account card**: shows the logged-in user, with **Edit
  profile** (name / farm name / location / herd size), **Change password**
  (also logs out other devices), and **Log out**.
- **Delete account** now requires your password and permanently removes
  your user record and farm data (not just a reset-to-demo like before).
- **New landing page** at `/` for logged-out visitors, with a "Create free
  account" and "I have an account" flow, in all three languages (English /
  Hindi / Marathi), matching the app's own language switcher.
- **Visual redesign** inspired by Playbook's soft, light look: a lavender/
  cream palette, rounded 20–30px cards, soft shadows instead of hard
  borders, and Plus Jakarta Sans in place of the old serif/system mix. All
  original functionality — dashboard, herd list, health warnings, protocol
  checklists, milking log, vet alerts, sync, language switch — is unchanged,
  just restyled. `theme.css` is additive, so the original `index.html`
  styling is still there underneath if you ever want to A/B the two looks.
- **Offline fallback kept**: opening `index.html` directly as a file (no
  backend) still falls back to the old bundled-defaults + `localStorage`
  demo mode, skipping straight past login.

## API reference

All endpoints are under `/api` and return JSON. Endpoints marked 🔒 require
being logged in (the `ek_sid` session cookie).

| Method | Path                        | Description                                    |
|--------|-----------------------------|-------------------------------------------------|
| POST   | `/api/auth/signup`          | Create an account `{name, email, password, farm?, lang?}` |
| POST   | `/api/auth/login`           | Log in `{email, password}`                       |
| POST   | `/api/auth/logout`          | Log out (clears the session)                     |
| GET    | `/api/auth/me`         🔒   | Current user                                     |
| PUT    | `/api/auth/profile`   🔒   | Update name / farm name / location / herd size   |
| PUT    | `/api/auth/password`  🔒   | Change password `{current, next}`                |
| DELETE | `/api/account`        🔒   | Permanently delete the account `{password}`      |
| GET    | `/api/state`          🔒   | Full app state (farm, cattle, gateways, stats)   |
| GET/PUT| `/api/farm`           🔒   | Farm profile                                     |
| GET    | `/api/cattle`         🔒   | All cattle records                               |
| GET    | `/api/cattle/:id`     🔒   | One cow's record                                 |
| POST   | `/api/cattle/:id/protocol` 🔒 | Toggle a forecast checklist item `{index}`  |
| POST   | `/api/cattle/:id/resolve`  🔒 | Mark a cow's risk resolved / healthy        |
| GET    | `/api/gateways`       🔒   | Sensor / gateway node statuses                   |
| GET    | `/api/stats`          🔒   | Milking log & treatment counters                 |
| POST   | `/api/milking`        🔒   | Log a milking `{cowId, yield}`                   |
| POST   | `/api/vet-alert`      🔒   | Trigger a vet alert `{name}`                     |
| POST   | `/api/sync`           🔒   | Simulate a cloud sync, updates `lastSync`        |
| PUT    | `/api/settings/lang`  🔒   | Set language `{lang: "en"|"hi"|"mr"}`            |
| GET    | `/api/health`               | Basic health check                               |

## Notes / next steps

Still a small JSON-file datastore (now `{users, sessions}` instead of one
shared farm) — swap `backend/db.js` for Postgres/SQLite later without
touching route handlers. No email verification or password-reset flow yet;
would need an email provider for that. Rate limiting on login is a simple
in-memory per-IP counter, fine for a demo/single instance, not for a
multi-process deployment (use Redis or similar there).
