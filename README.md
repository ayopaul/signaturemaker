# Email Signature Generator

A web app for creating HTML email signatures with live preview, HTML export, and Google Drive image upload through each user's own Google account.

## Features

- Signature builder form with live preview
- Copy HTML and download HTML output
- Google Drive OAuth connect/disconnect per user
- Avatar/logo uploads to connected user Drive
- Optional custom Drive folder ID per upload

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Add your OAuth values to `.env`:

```env
PORT=3000
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google-drive/callback
```

3. Run locally:

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## Google Cloud Requirements

- Enable the Google Drive API
- Configure OAuth consent screen
- Create OAuth client type: Web application
- Add redirect URI: `http://localhost:3000/api/google-drive/callback`

## API Routes

- `GET /api/health`
- `GET /api/google-drive/status`
- `GET /api/google-drive/connect`
- `GET /api/google-drive/callback`
- `POST /api/google-drive/disconnect`
- `POST /api/upload-image` (`image` file field, optional `driveFolderId`)

## Notes

- Session/token storage is in-memory in this starter project.
- Restarting server clears active Drive sessions.
- For production, add secure token storage, auth, CSRF protection, and rate limiting.
