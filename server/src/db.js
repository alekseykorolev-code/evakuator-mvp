import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_PATH = path.join(DB_DIR, 'data.sqlite');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    isAdmin INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    pickupAddress TEXT NOT NULL,
    dropoffAddress TEXT NOT NULL,
    isRunning INTEGER NOT NULL,
    hasDocs INTEGER NOT NULL,
    canWinch INTEGER NOT NULL,
    vehicleType TEXT NOT NULL,
    vehicleBrand TEXT,
    comment TEXT,
    distanceKm REAL NOT NULL,
    price INTEGER NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

export function seedAdminUser(bcrypt) {
  const email = 'admin@example.com';
  const password = 'admin123';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!existing) {
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (email, passwordHash, isAdmin, createdAt) VALUES (?, ?, ?, ?)')
      .run(email, passwordHash, 1, new Date().toISOString());
  }
}

export function calculatePrice(distanceKm) {
  const base = 2000;
  const perKm = 100;
  const km = Math.max(0, Math.ceil(Number(distanceKm) || 0));
  return base + km * perKm;
}

