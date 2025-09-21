import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, seedAdminUser } from './db.js';

const router = Router();

// Ensure admin exists on first import
seedAdminUser(bcrypt);

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || String(password).length < 6) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email, passwordHash, createdAt) VALUES (?, ?, ?)')
    .run(email, passwordHash, new Date().toISOString());
  const user = { id: info.lastInsertRowid, email, isAdmin: 0 };
  const token = jwt.sign({ id: user.id, email, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const record = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!record) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(String(password || ''), record.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const isAdmin = !!record.isAdmin;
  const token = jwt.sign({ id: record.id, email: record.email, isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: record.id, email: record.email, isAdmin } });
});

export default router;

