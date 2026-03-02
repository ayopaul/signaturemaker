import { NextResponse } from 'next/server';
import { attachSessionCookie, getOrCreateSession } from '../../../../lib/session-store.js';

export const runtime = 'nodejs';

export function POST(request) {
  const sessionMeta = getOrCreateSession(request);

  sessionMeta.session.googleTokens = null;
  sessionMeta.session.googleEmail = null;
  sessionMeta.session.oauthState = null;

  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, sessionMeta);
  return response;
}
