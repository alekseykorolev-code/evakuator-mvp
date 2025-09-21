## EVAK SPb — MVP (client + server)

Monorepo with client (React + Vite + Tailwind + Leaflet) and server (Express + SQLite + JWT + Nodemailer).

### Structure

- `client` — Vite React app
- `server` — Express API with SQLite

### Prerequisites

- Node.js 18+

### Setup

1) Server

```
cd server
cp .env.example .env
npm install
npm run dev
```

- Server: http://localhost:4000
- Admin seed: admin@example.com / admin123

2) Client

```
cd ../client
cp .env.example .env
npm install
npm run dev
```

- Client: http://localhost:5173

### Environment Variables (server/.env)

- `PORT=4000`
- `JWT_SECRET=change_me`
- `MANAGER_EMAIL=vk_rot@mail.ru`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (optional). If not set, emails are logged to console.

### API

- `POST /api/auth/register` — { email, password }
- `POST /api/auth/login` — { email, password }
- `GET /api/orders` — user orders (auth)
- `POST /api/orders` — create order (auth)
- `GET /api/orders/admin/all` — all orders (admin)
- `PUT /api/orders/admin/:id/status` — update status (admin)

### Frontend

- Home: dynamic map with floating form; estimate modal shows price (2000 + 100×км)
- Auth: email/password with JWT token in localStorage
- Dashboard: list user orders
- Admin: list all orders and change status

### Deploy

- Frontend: Vercel/Netlify
- Backend: Render/Heroku/Fly.io
- Set `VITE_API_BASE` in client to deployed server URL

### Sample server .env

```
PORT=4000
JWT_SECRET=dev_secret_change_me
MANAGER_EMAIL=vk_rot@mail.ru
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### Notes

- MVP distance uses straight line (Haversine). Swap to routing API later if needed.
- Emails via Nodemailer; without SMTP config, content is logged.
