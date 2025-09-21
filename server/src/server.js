import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import authRoutes from './auth.js';
import orderRoutes from './orders.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Ensure data dir exists
const dataDir = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

