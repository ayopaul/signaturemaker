# Sigar (Next.js)

Sigar is a free email signature generator built with Next.js (App Router).
It includes Google Drive OAuth so users can upload images or pick existing Drive images for avatar/logo.

## Stack

- Next.js (React)
- App Router API route handlers
- Google Drive API (`googleapis`)
- Vercel Analytics (`<Analytics />` in layout)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env` from `.env.example`:

```env
PORT=3000
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google-drive/callback
```

## Google Cloud Setup

1. Enable Google Drive API
2. Configure OAuth consent screen
3. Create OAuth Client (Web application)
4. Add redirect URI:
   - `http://localhost:3000/api/google-drive/callback`

## API Routes

- `GET /api/health`
- `GET /api/google-drive/status`
- `GET /api/google-drive/connect`
- `GET /api/google-drive/callback`
- `POST /api/google-drive/disconnect`
- `GET /api/google-drive/images`
- `POST /api/google-drive/select-image`
- `POST /api/upload-image`

## Notes

- Session/token storage is in-memory for this starter setup.
- Restarting the Next server clears active Drive sessions.
- For production, add persistent secure token storage and hardening.
