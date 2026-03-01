const form = document.getElementById('signature-form');
const preview = document.getElementById('signature-preview');
const output = document.getElementById('signature-html-output');
const statusEl = document.getElementById('status');
const copyButton = document.getElementById('copy-html');
const downloadButton = document.getElementById('download-html');
const avatarUploadInput = document.getElementById('avatarUpload');
const logoUploadInput = document.getElementById('logoUpload');
const uploadButtons = document.querySelectorAll('[data-upload-target]');
const driveStatusEl = document.getElementById('drive-status');
const connectDriveButton = document.getElementById('connect-drive');
const disconnectDriveButton = document.getElementById('disconnect-drive');

let driveConnected = false;

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getData() {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function makeLink(label, href, color) {
  const safeHref = normalizeUrl(href);
  if (!safeHref) return '';
  return `<a href="${escapeHtml(safeHref)}" style="color:${color};text-decoration:none;">${escapeHtml(label)}</a>`;
}

function renderSignatureHtml(data) {
  const accent = data.accentColor || '#2160ff';
  const fullName = escapeHtml(data.fullName || '');
  const jobTitle = escapeHtml(data.jobTitle || '');
  const company = escapeHtml(data.company || '');
  const address = escapeHtml(data.address || '');

  const emailLink = data.email ? makeLink(data.email, `mailto:${data.email}`, accent) : '';
  const phoneLink = data.phone ? makeLink(data.phone, `tel:${data.phone}`, accent) : '';
  const websiteLink = data.website ? makeLink(data.website, data.website, accent) : '';

  const socials = [
    makeLink('LinkedIn', data.linkedin, accent),
    makeLink('X', data.twitter, accent),
    makeLink('Instagram', data.instagram, accent),
    makeLink('YouTube', data.youtube, accent)
  ].filter(Boolean);

  const avatarCell = data.avatarUrl
    ? `<td style="padding-right:16px;vertical-align:top;"><img src="${escapeHtml(normalizeUrl(data.avatarUrl))}" alt="Avatar" width="80" height="80" style="display:block;border-radius:12px;width:80px;height:80px;object-fit:cover;border:1px solid #dbe3f5;"></td>`
    : '';

  const logo = data.logoUrl
    ? `<tr><td style="padding-top:10px;"><img src="${escapeHtml(normalizeUrl(data.logoUrl))}" alt="Company logo" height="32" style="display:block;height:32px;max-width:170px;object-fit:contain;"></td></tr>`
    : '';

  return `<table cellpadding="0" cellspacing="0" role="presentation" style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.35;max-width:620px;border-collapse:collapse;">
  <tr>
    ${avatarCell}
    <td style="vertical-align:top;">
      <table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
        <tr>
          <td style="font-size:20px;font-weight:400;color:#0f172a;">${fullName}</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#475569;padding-top:2px;">${jobTitle}${company ? ` at ${company}` : ''}</td>
        </tr>
        <tr>
          <td style="padding-top:10px;border-top:2px solid ${accent};font-size:13px;color:#334155;">
            ${[phoneLink, emailLink, websiteLink].filter(Boolean).join(' | ')}
          </td>
        </tr>
        ${address ? `<tr><td style="padding-top:6px;font-size:12px;color:#64748b;">${address}</td></tr>` : ''}
        ${socials.length ? `<tr><td style="padding-top:8px;font-size:12px;">${socials.join(' | ')}</td></tr>` : ''}
        ${logo}
      </table>
    </td>
  </tr>
</table>`;
}

function setDriveUiStatus(connected, email = null) {
  driveConnected = connected;
  driveStatusEl.textContent = connected
    ? `Connected${email ? ` as ${email}` : ''}`
    : 'Not connected';
  connectDriveButton.disabled = connected;
  disconnectDriveButton.disabled = !connected;
}

async function refreshDriveStatus() {
  try {
    const response = await fetch('/api/google-drive/status');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to check Drive status');
    }

    setDriveUiStatus(result.connected, result.email);
  } catch (error) {
    setDriveUiStatus(false);
    statusEl.textContent = error instanceof Error ? error.message : 'Failed to check Drive status';
  }
}

function updateSignature() {
  const data = getData();
  document.documentElement.style.setProperty('--accent', data.accentColor || '#2160ff');
  const signatureHtml = renderSignatureHtml(data);
  preview.innerHTML = signatureHtml;
  output.value = signatureHtml;
}

async function uploadImage(file, targetInputName) {
  const uploadFormData = new FormData();
  uploadFormData.append('image', file);

  const data = getData();
  if (data.driveFolderId) {
    uploadFormData.append('driveFolderId', data.driveFolderId);
  }

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: uploadFormData
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Upload failed');
  }

  const targetInput = form.querySelector(`input[name="${targetInputName}"]`);

  if (!targetInput) {
    throw new Error(`Unknown target input: ${targetInputName}`);
  }

  targetInput.value = result.publicUrl;
  updateSignature();
  return result.publicUrl;
}

form.addEventListener('input', updateSignature);

uploadButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    if (!driveConnected) {
      statusEl.textContent = 'Connect your Google Drive account before uploading images.';
      return;
    }

    const target = button.getAttribute('data-upload-target');
    const input = target === 'avatarUrl' ? avatarUploadInput : logoUploadInput;

    if (!input.files?.[0]) {
      statusEl.textContent = 'Select an image before upload.';
      return;
    }

    const file = input.files[0];
    button.disabled = true;
    statusEl.textContent = `Uploading ${file.name}...`;

    try {
      const url = await uploadImage(file, target);
      statusEl.textContent = `Uploaded successfully: ${url}`;
    } catch (error) {
      statusEl.textContent = error instanceof Error ? error.message : 'Upload failed';
    } finally {
      button.disabled = false;
    }
  });
});

connectDriveButton.addEventListener('click', () => {
  window.location.href = '/api/google-drive/connect';
});

disconnectDriveButton.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/google-drive/disconnect', {
      method: 'POST'
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to disconnect');
    }

    setDriveUiStatus(false);
    statusEl.textContent = 'Google Drive disconnected.';
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : 'Failed to disconnect';
  }
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    statusEl.textContent = 'Signature HTML copied to clipboard.';
  } catch (_error) {
    statusEl.textContent = 'Clipboard copy failed. Copy manually from the box.';
  }
});

downloadButton.addEventListener('click', () => {
  const blob = new Blob([output.value], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = 'email-signature.html';
  a.click();
  URL.revokeObjectURL(objectUrl);
  statusEl.textContent = 'Downloaded email-signature.html';
});

function handleOauthResultInUrl() {
  const params = new URLSearchParams(window.location.search);
  const driveState = params.get('drive');
  if (!driveState) return;

  if (driveState === 'connected') {
    statusEl.textContent = 'Google Drive connected successfully.';
  } else if (driveState === 'error') {
    const message = params.get('message') || 'Google Drive connection failed.';
    statusEl.textContent = `Google Drive error: ${message}`;
  }

  params.delete('drive');
  params.delete('message');
  const next = params.toString();
  const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}`;
  window.history.replaceState({}, '', nextUrl);
}

updateSignature();
setDriveUiStatus(false);
handleOauthResultInUrl();
refreshDriveStatus();
