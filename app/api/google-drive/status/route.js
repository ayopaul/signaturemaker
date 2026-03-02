import { NextResponse } from 'next/server';
import { attachSessionCookie, getOrCreateSession } from '../../../../lib/session-store.js';

export const runtime = 'nodejs';

export function GET(request) {
  const sessionMeta = getOrCreateSession(request);

  const response = NextResponse.json({
    connected: Boolean(sessionMeta.session.googleTokens),
    email: sessionMeta.session.googleEmail || null
  });

  attachSessionCookie(response, sessionMeta);
  return response;
}
