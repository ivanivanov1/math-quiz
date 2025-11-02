# Multiplication Table Practice App

A lightweight React + Express project (UI in Bulgarian) that helps children master the 1×1–10×10 multiplication table. The app serves randomized questions, times each run, and stores scores in SQLite with a searchable leaderboard.

## Prerequisites

- Node.js 20.19.0 or newer (Vite prints a warning on 20.18.x; upgrade when possible).
- npm 10+ (bundled with Node 20).

## Getting Started

1. **Install dependencies**

   ```bash
   # Backend
   cd server
   npm install

   # Frontend
   cd ../client
   npm install
   ```

2. **Run the backend (port 4000)**

   ```bash
   cd server
   npm run dev
   ```

   The server automatically creates `data.sqlite3` in the `server` folder.

3. **Run the frontend (port 5173)**

   ```bash
   cd client
   npm run dev
   ```

   The Vite dev server proxies `/api` calls to `http://localhost:4000`, so the client and server work together during development.

## Production Builds

- **Frontend:** `npm run build` under `client/` produces static assets in `client/dist`.
- **Backend:** run `npm run start` in `server/` to launch the Express API in production mode. You can serve the compiled frontend separately (Netlify, Vercel, static hosting, etc.).

## One-box (VPS) Deployment

1. **Build the frontend**
   ```bash
   cd client
   npm install
   npm run build
   ```

2. **Install and start the backend**
   ```bash
   cd ../server
   npm install
   NODE_ENV=production PORT=4000 npm run start
   ```

   The Express server automatically serves the compiled React app from `client/dist` whenever the folder exists.

3. **SQLite data**
   - Created automatically in `server/data.sqlite3`.
   - Back it up or delete it whenever you need a fresh leaderboard.

4. **Keep the node process alive**
   - Use a supervisor such as `pm2`, `forever`, or a systemd unit. Example systemd unit:
     ```ini
     [Unit]
     Description=Multiplication practice API
     After=network.target

     [Service]
     Type=simple
     WorkingDirectory=/opt/math-tests/server
     ExecStart=/usr/bin/env NODE_ENV=production PORT=4000 npm run start
     Restart=on-failure
     Environment=PATH=/usr/local/bin:/usr/bin

     [Install]
     WantedBy=multi-user.target
     ```

5. **Reverse proxy with Nginx**
   - Point your domain at the VPS and use a simple proxy block:
     ```nginx
     server {
       listen 80;
       server_name yourdomain.com;

       location / {
         proxy_pass http://127.0.0.1:4000;
         proxy_http_version 1.1;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
       }
     }
     ```

   - Obtain TLS certificates with Let’s Encrypt (`certbot`) and update the server block to listen on 443.

6. **Environment variables**
   - No extra variables are required unless you want to override the API base URL. The frontend falls back to same-origin requests (`/api/...`), so the built app works behind the proxy without changes.

7. **Rolling updates**
   - Pull the latest code, rebuild the frontend (`client/npm run build`), then restart the backend service. No asset copying is necessary—the backend reads directly from `client/dist`.

## Testing & Checks

- `client/npm run check` – type-check the React codebase with TypeScript.
- `client/npm run build` – validates Vite compilation.

(You can extend the project with automated tests later; the current scope focuses on manual validation.)

## Scoring Rules

- Each correct answer is worth **10 base points**.
- Time limit = `questionCount × 6` seconds.
- Finish within the limit to earn a **time bonus**: `(timeLimit − elapsedSeconds) × 2` (rounded down, minimum 0).
- Your final score is `max(basePoints + timeBonus, floorScore)` where `floorScore = basePoints × 0.3`.
- If you exceed the time limit, you receive the floor score.

## API Overview

| Method | Endpoint                            | Description                                      |
| ------ | ----------------------------------- | ------------------------------------------------ |
| POST   | `/api/sessions`                     | Start a new session and receive randomized questions. |
| POST   | `/api/sessions/:sessionId/complete` | Submit answers, compute the score, and persist the run. |
| GET    | `/api/leaderboard`                  | Fetch paginated, searchable runs (20 per page).       |

## Project Structure

```
math-tests/
├── server/            # Express API + SQLite persistence
└── client/            # React frontend (Vite, Tailwind, shadcn/ui)
```

Enjoy practicing the multiplication table!
