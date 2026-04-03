import path from 'path';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { getDriveClientFromSession } from '../../../lib/google-drive.js';
import { attachSessionCookie, getOrCreateSession } from '../../../lib/session-store.js';

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
    const formData = await request.formData();
    const file = formData.get('image');

    if (!(file instanceof File)) {
      const response = NextResponse.json(
        {
          error: 'No file uploaded. Use field name "image".'
        },
        { status: 400 }
      );
      attachSessionCookie(response, sessionMeta);
      return response;
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const extension = path.extname(file.name || '') || '.png';
    const safeBaseName = path
      .basename(file.name || 'signature-image', extension)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .slice(0, 60);
    const filename = `${safeBaseName || 'signature-image'}-${Date.now()}${extension}`;

    const driveFolderId = String(formData.get('driveFolderId') || '').trim();

    const requestBody = driveFolderId
      ? { name: filename, parents: [driveFolderId] }
      : { name: filename };

    const createdFile = await drive.files.create({
      requestBody,
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: Readable.from(fileBuffer)
      },
      fields: 'id,name'
    });

    const fileId = createdFile.data.id;

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

    const response = NextResponse.json({
      fileId,
      fileName: createdFile.data.name,
      publicUrl
    });

    attachSessionCookie(response, sessionMeta);
    return response;
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Unknown upload error';
    const message = raw.includes('has not been used in project') || raw.includes('it is disabled')
      ? 'Google Drive API is not enabled for this project. Enable it at console.cloud.google.com under APIs & Services.'
      : `Image upload failed: ${raw}`;
    const response = NextResponse.json({ error: message }, { status: 500 });
    attachSessionCookie(response, sessionMeta);
    return response;
  }
}
