import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createOauthClient } from '../../../../lib/google-drive.js';
import { attachSessionCookie, getOrCreateSession } from '../../../../lib/session-store.js';

export const runtime = 'nodejs';

export function GET(request) {
  try {
    const sessionMeta = getOrCreateSession(request);
    const oauthClient = createOauthClient();
    const state = crypto.randomBytes(16).toString('hex');

    sessionMeta.session.oauthState = state;

    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      state,
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });

    const response = NextResponse.redirect(authUrl);
    attachSessionCookie(response, sessionMeta);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown connect error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
