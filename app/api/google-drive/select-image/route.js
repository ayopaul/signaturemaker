import { NextResponse } from 'next/server';
import { getDriveClientFromSession } from '../../../../lib/google-drive.js';
import { attachSessionCookie, getOrCreateSession } from '../../../../lib/session-store.js';

export const runtime = 'nodejs';

export async function POST(request) {
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
    const body = await request.json();
    const fileId = String(body?.fileId || '').trim();

    if (!fileId) {
      const response = NextResponse.json(
        {
          error: 'Missing required field: fileId'
        },
        { status: 400 }
      );
      attachSessionCookie(response, sessionMeta);
      return response;
    }

    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
    } catch (permissionError) {
      const message = permissionError instanceof Error ? permissionError.message : '';
      if (!message.toLowerCase().includes('already')) {
        throw permissionError;
      }
    }

    const fileResponse = await drive.files.get({
      fileId,
      fields: 'id,name'
    });

    const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

    const response = NextResponse.json({
      fileId,
      fileName: fileResponse.data.name,
      publicUrl
    });

    attachSessionCookie(response, sessionMeta);
    return response;
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Failed to pick image';
    const message = raw.includes('has not been used in project') || raw.includes('it is disabled')
      ? 'Google Drive API is not enabled for this project. Enable it at console.cloud.google.com under APIs & Services.'
      : raw;
    const response = NextResponse.json({ error: message }, { status: 500 });
    attachSessionCookie(response, sessionMeta);
    return response;
  }
}
