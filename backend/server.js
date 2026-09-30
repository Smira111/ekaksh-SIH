const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const { readDb, writeDb } = require("./db");
const freshState = require("./defaultState");

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE = "ek_sid";
const TTL = 30 * 24 * 3600 * 1000; // 30-day sessions

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "100kb" }));

// ---- Auth helpers ---------------------------------------------------------
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
const samePw = (pw, u) => {
  const a = Buffer.from(hashPw(pw, u.salt), "hex"), b = Buffer.from(u.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const readCookies = (req) =>
  Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((a) => a[0]).map((a) => [a[0], decodeURIComponent(a[1] || "")]));
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, created: u.created });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function startSession(res, db, uid) {
  const now = Date.now();
  for (const k in db.sessions) if (db.sessions[k].exp < now) delete db.sessions[k];
  const tok = crypto.randomBytes(32).toString("hex");
  db.sessions[sha(tok)] = { uid, exp: now + TTL };
  res.cookie(COOKIE, tok, { httpOnly: true, sameSite: "lax", maxAge: TTL, secure: process.env.NODE_ENV === "production" });
}

// Slow down password guessing: 10 failed logins / 15 min per IP.
const fails = new Map();
const blocked = (ip) => { const f = fails.get(ip); return f && f.n >= 10 && Date.now() - f.t < 15 * 60 * 1000; };
const noteFail = (ip) => { const f = fails.get(ip); fails.set(ip, f && Date.now() - f.t < 15 * 60 * 1000 ? { n: f.n + 1, t: f.t } : { n: 1, t: Date.now() }); };

function auth(req, res, next) {
  const db = readDb();
  const tok = readCookies(req)[COOKIE];
  const s = tok && db.sessions[sha(tok)];
  const u = s && s.exp > Date.now() && db.users.find((x) => x.id === s.uid);
  if (!u) return res.status(401).json({ error: "Please log in" });
  req.db = db; req.user = u; req.tokHash = sha(tok);
  next();
}
const S = (req) => req.user.state;
const commit = (req) => writeDb(req.db);

// ---- Auth routes ----------------------------------------------------------
app.post("/api/auth/signup", (req, res) => {
  const { name, email, password, farm, lang } = req.body || {};
  const em = String(email || "").trim().toLowerCase();
  if (!String(name || "").trim()) return res.status(400).json({ error: "Please enter your name" });
  if (!EMAIL.test(em)) return res.status(400).json({ error: "Please enter a valid email" });
  if (String(password || "").length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const db = readDb();
  if (db.users.some((u) => u.email === em)) return res.status(409).json({ error: "An account with this email already exists" });
  const salt = crypto.randomBytes(16).toString("hex");
  const state = freshState();
  if (String(farm || "").trim()) state.farm.name = String(farm).trim().slice(0, 80);
  if (["en", "hi", "mr"].includes(lang)) state.lang = lang;
  const user = { id: crypto.randomUUID(), name: String(name).trim().slice(0, 80), email: em, salt, hash: hashPw(password, salt), created: Date.now(), state };
  db.users.push(user);
  startSession(res, db, user.id);
  writeDb(db);
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  if (blocked(req.ip)) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
  const { email, password } = req.body || {};
  const db = readDb();
  const u = db.users.find((x) => x.email === String(email || "").trim().toLowerCase());
  if (!u || !samePw(String(password || ""), u)) { noteFail(req.ip); return res.status(401).json({ error: "Wrong email or password" }); }
  fails.delete(req.ip);
  startSession(res, db, u.id);
  writeDb(db);
  res.json({ user: publicUser(u) });
});

app.post("/api/auth/logout", (req, res) => {
  const db = readDb();
  const tok = readCookies(req)[COOKIE];
  if (tok) { delete db.sessions[sha(tok)]; writeDb(db); }
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.put("/api/auth/profile", auth, (req, res) => {
  const { name, farm, loc, head } = req.body || {};
  if (name !== undefined) { if (!String(name).trim()) return res.status(400).json({ error: "Name cannot be empty" }); req.user.name = String(name).trim().slice(0, 80); }
  if (farm !== undefined && String(farm).trim()) S(req).farm.name = String(farm).trim().slice(0, 80);
  if (loc !== undefined) S(req).farm.loc = String(loc).trim().slice(0, 80);
  if (head !== undefined && Number(head) > 0) S(req).farm.head = Math.min(100000, Math.round(Number(head)));
  commit(req);
  res.json({ user: publicUser(req.user), farm: S(req).farm });
});

app.put("/api/auth/password", auth, (req, res) => {
  const { current, next } = req.body || {};
  if (!samePw(String(current || ""), req.user)) return res.status(403).json({ error: "Current password is wrong" });
  if (String(next || "").length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  req.user.salt = crypto.randomBytes(16).toString("hex");
  req.user.hash = hashPw(next, req.user.salt);
  for (const k in req.db.sessions) if (req.db.sessions[k].uid === req.user.id && k !== req.tokHash) delete req.db.sessions[k]; // log out other devices
  commit(req);
  res.json({ ok: true });
});

// Permanently delete the account (needs the password)
app.delete("/api/account", auth, (req, res) => {
  if (!samePw(String((req.body || {}).password || ""), req.user)) return res.status(403).json({ error: "Password is wrong" });
  req.db.users = req.db.users.filter((u) => u.id !== req.user.id);
  for (const k in req.db.sessions) if (req.db.sessions[k].uid === req.user.id) delete req.db.sessions[k];
  commit(req);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// ---- Farm data (all private to the logged-in user) ------------------------
app.get("/api/state", auth, (req, res) => res.json(S(req)));
app.get("/api/farm", auth, (req, res) => res.json(S(req).farm));
app.put("/api/farm", auth, (req, res) => { S(req).farm = { ...S(req).farm, ...req.body }; commit(req); res.json(S(req).farm); });
app.get("/api/cattle", auth, (req, res) => res.json(S(req).cattle));

const findCow = (req, res) => {
  const cow = S(req).cattle.find((c) => c.id === Number(req.params.id));
  if (!cow) res.status(404).json({ error: "Cow not found" });
  return cow;
};
app.get("/api/cattle/:id", auth, (req, res) => { const c = findCow(req, res); if (c) res.json(c); });
app.post("/api/cattle/:id/protocol", auth, (req, res) => {
  const { index } = req.body || {};
  if (typeof index !== "number") return res.status(400).json({ error: "Body must include a numeric 'index'" });
  const cow = findCow(req, res); if (!cow) return;
  cow.done = cow.done || [];
  cow.done[index] = !cow.done[index];
  commit(req); res.json(cow);
});
app.post("/api/cattle/:id/resolve", auth, (req, res) => {
  const cow = findCow(req, res); if (!cow) return;
  Object.assign(cow, { risk: "ok", issue: null, tags: [], onset: null, done: [] });
  commit(req); res.json(cow);
});
app.get("/api/gateways", auth, (req, res) => res.json(S(req).gateways));
app.get("/api/stats", auth, (req, res) => res.json(S(req).stats));
app.post("/api/milking", auth, (req, res) => {
  const { cowId, yield: y } = req.body || {};
  if (cowId !== undefined && !S(req).cattle.some((c) => c.id === Number(cowId))) return res.status(404).json({ error: "Cow not found" });
  S(req).stats.milking += 1; commit(req);
  res.status(201).json({ stats: S(req).stats, cowId: cowId ?? null, yield: y ?? null });
});
app.post("/api/vet-alert", auth, (req, res) => {
  S(req).stats.treatments += 1; commit(req);
  res.status(201).json({ stats: S(req).stats, name: (req.body || {}).name || null });
});
app.post("/api/sync", auth, (req, res) => { S(req).lastSync = Date.now(); commit(req); res.json({ lastSync: S(req).lastSync }); });
app.put("/api/settings/lang", auth, (req, res) => {
  const { lang } = req.body || {};
  if (!["en", "hi", "mr"].includes(lang)) return res.status(400).json({ error: "lang must be one of en, hi, mr" });
  S(req).lang = lang; commit(req); res.json({ lang });
});
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// ---- Static frontend ------------------------------------------------------
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_DIR));
app.get("*", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));

app.listen(PORT, () => console.log(`EKAKSH running at http://localhost:${PORT}`));
