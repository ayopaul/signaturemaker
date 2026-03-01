import crypto from 'crypto';
import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const sessionCookieName = 'sig_session';
const sessionTtlMs = 1000 * 60 * 60 * 24 * 14;

const sessions = new Map();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

app.use(express.json());
app.use(express.static(publicDir));

function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, rawCookie) => {
    const [rawName, ...rawValueParts] = rawCookie.split('=');
    const name = rawName?.trim();
    if (!name) return acc;
    const value = rawValueParts.join('=');
    acc[name] = decodeURIComponent(value);
    return acc;
  }, {});
}

function getOrCreateSession(req, res) {
  const cookies = parseCookies(req);
  let sessionId = cookies[sessionCookieName];

  if (!sessionId || !sessions.has(sessionId)) {
    sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      oauthState: null,
      googleTokens: null,
      googleEmail: null
    });

    res.setHeader(
      'Set-Cookie',
      `${sessionCookieName}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`
    );
  }

  const session = sessions.get(sessionId);
  session.updatedAt = Date.now();
  return { sessionId, session };
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.updatedAt > sessionTtlMs) {
      sessions.delete(sessionId);
    }
  }
}

setInterval(cleanupExpiredSessions, 1000 * 60 * 30).unref();

function getOauthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing OAuth config. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI.'
    );
  }

  return { clientId, clientSecret, redirectUri };
}

function createOauthClient() {
  const { clientId, clientSecret, redirectUri } = getOauthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getSignedInOauthClient(req, res) {
  const { session } = getOrCreateSession(req, res);

  if (!session?.googleTokens) {
    return null;
  }

  const oauth2Client = createOauthClient();
  oauth2Client.setCredentials(session.googleTokens);
  return oauth2Client;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/google-drive/status', (req, res) => {
  try {
    const { session } = getOrCreateSession(req, res);

    return res.json({
      connected: Boolean(session.googleTokens),
      email: session.googleEmail || null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown status error';
    return res.status(500).json({
      error: message
    });
  }
});

app.get('/api/google-drive/connect', (req, res) => {
  try {
    const { session } = getOrCreateSession(req, res);
    const oauth2Client = createOauthClient();
    const state = crypto.randomBytes(16).toString('hex');

    session.oauthState = state;

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      state,
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });

    return res.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown connect error';
    return res.status(500).send(message);
  }
});

app.get('/api/google-drive/callback', async (req, res) => {
  try {
    const { session } = getOrCreateSession(req, res);
    const state = String(req.query.state || '');
    const code = String(req.query.code || '');
    const oauthError = req.query.error ? String(req.query.error) : null;

    if (oauthError) {
      return res.redirect(`/?drive=error&message=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state || !session.oauthState || state !== session.oauthState) {
      return res.redirect('/?drive=error&message=invalid_oauth_state');
    }

    const oauth2Client = createOauthClient();
    const tokenResponse = await oauth2Client.getToken(code);
    const nextTokens = tokenResponse.tokens;

    if (!nextTokens?.access_token) {
      return res.redirect('/?drive=error&message=token_exchange_failed');
    }

    session.googleTokens = {
      ...nextTokens,
      refresh_token: nextTokens.refresh_token || session.googleTokens?.refresh_token
    };
    session.oauthState = null;

    oauth2Client.setCredentials(session.googleTokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    session.googleEmail = userInfo.data.email || null;

    return res.redirect('/?drive=connected');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'oauth_callback_failed';
    return res.redirect(`/?drive=error&message=${encodeURIComponent(message)}`);
  }
});

app.post('/api/google-drive/disconnect', (req, res) => {
  try {
    const { session } = getOrCreateSession(req, res);
    session.googleTokens = null;
    session.googleEmail = null;
    session.oauthState = null;

    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'disconnect_failed';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded. Use field name "image".'
      });
    }

    const oauth2Client = getSignedInOauthClient(req, res);

    if (!oauth2Client) {
      return res.status(401).json({
        error: 'Google Drive is not connected. Connect your account first.'
      });
    }

    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client
    });

    const extension = path.extname(req.file.originalname) || '.png';
    const safeBaseName = path
      .basename(req.file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .slice(0, 60);
    const filename = `${safeBaseName || 'signature-image'}-${Date.now()}${extension}`;

    const folderId = String(req.body.driveFolderId || '').trim();
    const requestBody = folderId
      ? {
          name: filename,
          parents: [folderId]
        }
      : {
          name: filename
        };

    const createdFile = await drive.files.create({
      requestBody,
      media: {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer)
      },
      fields: 'id, name'
    });

    const fileId = createdFile?.data?.id;

    if (!fileId) {
      throw new Error('Drive did not return a file id.');
    }

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return res.json({
      fileId,
      fileName: createdFile.data.name,
      publicUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error';
    return res.status(500).json({
      error: `Image upload failed: ${message}`
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Email signature app running on http://localhost:${port}`);
});
