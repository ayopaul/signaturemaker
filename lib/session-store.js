import crypto from 'crypto';

const SESSION_COOKIE = 'sig_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

const sessions = new Map();

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}

setInterval(cleanupExpiredSessions, 1000 * 60 * 30).unref();

export function getOrCreateSession(request) {
  const existingSessionId = request.cookies.get(SESSION_COOKIE)?.value;

  if (existingSessionId && sessions.has(existingSessionId)) {
    const existingSession = sessions.get(existingSessionId);
    existingSession.updatedAt = Date.now();
    return {
      sessionId: existingSessionId,
      session: existingSession,
      isNew: false
    };
  }

  const sessionId = crypto.randomUUID();
  const session = {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    oauthState: null,
    googleTokens: null,
    googleEmail: null
  };

  sessions.set(sessionId, session);

  return {
    sessionId,
    session,
    isNew: true
  };
}

export function attachSessionCookie(response, sessionMeta) {
  if (!sessionMeta?.isNew) return;

  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionMeta.sessionId,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  });
}
