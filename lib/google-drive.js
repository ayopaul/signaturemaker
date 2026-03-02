import { google } from 'googleapis';

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

export function createOauthClient() {
  const { clientId, clientSecret, redirectUri } = getOauthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getDriveClientFromSession(session) {
  if (!session?.googleTokens) {
    return null;
  }

  const oauthClient = createOauthClient();
  oauthClient.setCredentials(session.googleTokens);

  return google.drive({
    version: 'v3',
    auth: oauthClient
  });
}

export async function getGoogleUserEmailFromTokens(tokens) {
  const oauthClient = createOauthClient();
  oauthClient.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
  const userInfo = await oauth2.userinfo.get();

  return userInfo.data.email || null;
}
