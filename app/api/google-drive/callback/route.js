import { NextResponse } from 'next/server';
import { createOauthClient, getGoogleUserEmailFromTokens } from '../../../../lib/google-drive.js';
import { attachSessionCookie, getOrCreateSession } from '../../../../lib/session-store.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const sessionMeta = getOrCreateSession(request);
  const state = String(request.nextUrl.searchParams.get('state') || '');
  const code = String(request.nextUrl.searchParams.get('code') || '');
  const oauthError = request.nextUrl.searchParams.get('error');

  if (oauthError) {
    const response = NextResponse.redirect(
      new URL(`/?drive=error&message=${encodeURIComponent(oauthError)}`, request.url)
    );
    attachSessionCookie(response, sessionMeta);
    return response;
  }

  if (!code || !state || !sessionMeta.session.oauthState || state !== sessionMeta.session.oauthState) {
    const response = NextResponse.redirect(
      new URL('/?drive=error&message=invalid_oauth_state', request.url)
    );
    attachSessionCookie(response, sessionMeta);
    return response;
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/google-drive/callback`;
    const oauthClient = createOauthClient(redirectUri);
    const tokenResponse = await oauthClient.getToken(code);
    const nextTokens = tokenResponse.tokens;

    if (!nextTokens?.access_token) {
      const response = NextResponse.redirect(
        new URL('/?drive=error&message=token_exchange_failed', request.url)
      );
      attachSessionCookie(response, sessionMeta);
      return response;
    }

    sessionMeta.session.googleTokens = {
      ...nextTokens,
      refresh_token: nextTokens.refresh_token || sessionMeta.session.googleTokens?.refresh_token
    };
    sessionMeta.session.oauthState = null;
    sessionMeta.session.googleEmail = await getGoogleUserEmailFromTokens(sessionMeta.session.googleTokens);

    const response = NextResponse.redirect(new URL('/?drive=connected', request.url));
    attachSessionCookie(response, sessionMeta);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'oauth_callback_failed';
    const response = NextResponse.redirect(
      new URL(`/?drive=error&message=${encodeURIComponent(message)}`, request.url)
    );
    attachSessionCookie(response, sessionMeta);
    return response;
  }
}
