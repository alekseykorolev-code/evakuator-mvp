import { Router } from 'express';
import { db, calculatePrice } from './db.js';
import { authRequired, adminRequired } from './middleware.js';
import nodemailer from 'nodemailer';

const router = Router();

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

async function sendNewOrderEmail(order) {
  const to = process.env.MANAGER_EMAIL || 'vk_rot@mail.ru';
  const subject = 'Новая заявка на эвакуатор';
  const text = `Новая заявка:
Время: ${order.createdAt}
Клиент: ${order.userEmail}
Пикап: ${order.pickupAddress}
Доставка: ${order.dropoffAddress}
Тип ТС: ${order.vehicleType}
Марка: ${order.vehicleBrand || '-'}
Опции: на ходу=${order.isRunning ? 'да' : 'нет'}, документы=${order.hasDocs ? 'да' : 'нет'}, лебедка=${order.canWinch ? 'да' : 'нет'}
Расстояние: ${order.distanceKm} км
Цена: ${order.price} ₽
Комментарий: ${order.comment || '-'}
Статус: ${order.status}
`;
  const transporter = createTransport();
  if (!transporter) {
    console.log('Email transport not configured. Would send to', to, { subject, text });
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || to,
    to,
    subject,
    text
  });
}

router.get('/', authRequired, (req, res) => {
  const list = db.prepare('SELECT * FROM orders WHERE userId = ? ORDER BY datetime(createdAt) DESC').all(req.user.id);
  res.json(list);
});

router.post('/', authRequired, async (req, res) => {
  const body = req.body || {};
  const required = ['pickupAddress', 'dropoffAddress', 'vehicleType', 'distanceKm'];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || String(body[k]).trim() === '') {
      return res.status(400).json({ error: `Missing field: ${k}` });
    }
  }
  const distanceKm = Number(body.distanceKm) || 0;
  const price = calculatePrice(distanceKm);
  const createdAt = new Date().toISOString();
  const status = 'в работе';
  const info = db.prepare(`
    INSERT INTO orders (
      userId, createdAt, pickupAddress, dropoffAddress, isRunning, hasDocs, canWinch, vehicleType, vehicleBrand, comment, distanceKm, price, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    createdAt,
    String(body.pickupAddress),
    String(body.dropoffAddress),
    body.isRunning ? 1 : 0,
    body.hasDocs ? 1 : 0,
    body.canWinch ? 1 : 0,
    String(body.vehicleType),
    body.vehicleBrand ? String(body.vehicleBrand) : null,
    body.comment ? String(body.comment) : null,
    distanceKm,
    price,
    status
  );

  const saved = db.prepare('SELECT o.*, u.email as userEmail FROM orders o JOIN users u ON u.id = o.userId WHERE o.id = ?').get(info.lastInsertRowid);
  try { await sendNewOrderEmail(saved); } catch (e) { console.error('Email error:', e?.message || e); }
  res.status(201).json(saved);
});

router.get('/admin/all', authRequired, adminRequired, (req, res) => {
  const list = db.prepare('SELECT o.*, u.email as userEmail FROM orders o JOIN users u ON u.id = o.userId ORDER BY datetime(o.createdAt) DESC').all();
  res.json(list);
});

router.put('/admin/:id/status', authRequired, adminRequired, (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['в работе', 'готово', 'отмена'].includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  const row = db.prepare('SELECT o.*, u.email as userEmail FROM orders o JOIN users u ON u.id = o.userId WHERE o.id = ?').get(id);
  res.json(row);
});

export default router;

