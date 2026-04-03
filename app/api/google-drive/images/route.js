import { NextResponse } from 'next/server';
import { getDriveClientFromSession } from '../../../../lib/google-drive.js';
import { attachSessionCookie, getOrCreateSession } from '../../../../lib/session-store.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const sessionMeta = getOrCreateSession(request);
  const drive = getDriveClientFromSession(sessionMeta.session);

  if (!drive) {
    const response = NextResponse.json(
      {
        error: 'Google Drive is not connected. Connect your account first.'
      },
      { status: 401 }
    );
    attachSessionCookie(response, sessionMeta);
    return response;
  }

  try {
    const rawLimit = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 30, 1), 100);

    const listResponse = await drive.files.list({
      q: "trashed = false and mimeType contains 'image/'",
      pageSize: limit,
      orderBy: 'modifiedTime desc',
      fields: 'files(id,name,mimeType,thumbnailLink,webViewLink,modifiedTime,permissions(type,role))'
    });

    const files = (listResponse.data.files || []).map((file) => {
      const permissions = file.permissions || [];
      const hasPublicRead = permissions.some(
        (permission) => permission.type === 'anyone' && permission.role === 'reader'
      );

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        thumbnailLink: file.thumbnailLink || null,
        webViewLink: file.webViewLink || null,
        publicUrl: hasPublicRead ? `https://lh3.googleusercontent.com/d/${file.id}` : null
      };
    });

    const response = NextResponse.json({ files });
    attachSessionCookie(response, sessionMeta);
    return response;
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Failed to fetch images';
    const message = raw.includes('has not been used in project') || raw.includes('it is disabled')
      ? 'Google Drive API is not enabled for this project. Enable it at console.cloud.google.com under APIs & Services.'
      : raw;
    const response = NextResponse.json({ error: message }, { status: 500 });
    attachSessionCookie(response, sessionMeta);
    return response;
  }
}
