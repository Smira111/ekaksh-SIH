// Tiny file-backed database: { users: [...], sessions: {...} }.
// Each user owns their own farm state (cattle, gateways, stats, ...).
// Swap this module for Postgres/SQLite later; server.js only uses readDb()/writeDb().
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "data", "db.json");
const empty = () => ({ users: [], sessions: {} });

function readDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) writeDb(empty());
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    // Older single-farm files (no accounts) are ignored and replaced.
    return db && Array.isArray(db.users) ? db : empty();
  } catch (e) {
    return empty();
  }
}

function writeDb(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE); // atomic-ish write, avoids corrupt files
  return db;
}

module.exports = { readDb, writeDb };
