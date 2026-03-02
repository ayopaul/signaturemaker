const form = document.getElementById('signature-form');
const preview = document.getElementById('signature-preview');
const output = document.getElementById('signature-html-output');
const statusEl = document.getElementById('status');
const copyButton = document.getElementById('copy-html');
const copyOutlookButton = document.getElementById('copy-outlook');
const downloadButton = document.getElementById('download-html');
const avatarUploadInput = document.getElementById('avatarUpload');
const logoUploadInput = document.getElementById('logoUpload');
const uploadButtons = document.querySelectorAll('[data-upload-target]');
const pickerSelects = document.querySelectorAll('[data-picker-select]');
const pickerRefreshButtons = document.querySelectorAll('[data-picker-refresh]');
const pickerUseButtons = document.querySelectorAll('[data-picker-use]');
const driveStatusEl = document.getElementById('drive-status');
const connectDriveButton = document.getElementById('connect-drive');
const disconnectDriveButton = document.getElementById('disconnect-drive');
const previewPanel = document.querySelector('.preview-panel');
const mobilePreviewToggle = document.getElementById('mobile-preview-toggle');
const progressStorageKey = 'email_signature_progress_v1';
const previewPanelStateKey = 'preview_panel_mobile_collapsed_v1';

let driveConnected = false;
let driveImageFiles = [];

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

function saveProgress() {
  try {
    const data = getData();
    localStorage.setItem(progressStorageKey, JSON.stringify(data));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function restoreProgress() {
  try {
    const raw = localStorage.getItem(progressStorageKey);
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return;

    Object.entries(saved).forEach(([name, value]) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) return;
      if (field instanceof HTMLInputElement && field.type === 'file') return;
      field.value = String(value ?? '');
    });
  } catch (_error) {
    // Ignore invalid stored data.
  }
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 800px)').matches;
}

function setPreviewCollapsed(collapsed) {
  if (!previewPanel || !mobilePreviewToggle) return;
  previewPanel.classList.toggle('is-collapsed', collapsed);
  mobilePreviewToggle.textContent = collapsed ? 'Expand' : 'Collapse';
  mobilePreviewToggle.setAttribute('aria-expanded', String(!collapsed));
}

function loadPreviewCollapsedPreference() {
  try {
    const raw = localStorage.getItem(previewPanelStateKey);
    if (raw === null) return true;
    return raw === 'true';
  } catch (_error) {
    return true;
  }
}

function savePreviewCollapsedPreference(collapsed) {
  try {
    localStorage.setItem(previewPanelStateKey, String(collapsed));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function syncPreviewCollapseForViewport() {
  if (!previewPanel || !mobilePreviewToggle) return;

  if (!isMobileViewport()) {
    previewPanel.classList.remove('is-collapsed');
    mobilePreviewToggle.setAttribute('aria-expanded', 'true');
    mobilePreviewToggle.textContent = 'Collapse';
    return;
  }

  const collapsed = loadPreviewCollapsedPreference();
  setPreviewCollapsed(collapsed);
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

function getTargetInput(targetInputName) {
  return form.querySelector(`input[name="${targetInputName}"]`);
}

function getPickerSelect(targetInputName) {
  return document.querySelector(`[data-picker-select="${targetInputName}"]`);
}

function setTargetImageUrl(targetInputName, url) {
  const targetInput = getTargetInput(targetInputName);
  if (!targetInput) {
    throw new Error(`Unknown target input: ${targetInputName}`);
  }

  targetInput.value = url;
  updateSignature();
  saveProgress();
}

function renderDriveImageOptions() {
  pickerSelects.forEach((select) => {
    const previousValue = select.value;
    const options = [
      '<option value="">Select a Drive image...</option>',
      ...driveImageFiles.map((file) => `<option value="${file.id}">${escapeHtml(file.name || file.id)}</option>`)
    ];

    select.innerHTML = options.join('');

    if (previousValue && driveImageFiles.some((file) => file.id === previousValue)) {
      select.value = previousValue;
    }
  });
}

async function loadDriveImages() {
  if (!driveConnected) {
    driveImageFiles = [];
    renderDriveImageOptions();
    return;
  }

  const response = await fetch('/api/google-drive/images?limit=50');
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to load Drive images');
  }

  driveImageFiles = Array.isArray(result.files) ? result.files : [];
  renderDriveImageOptions();
}

async function useSelectedDriveImage(targetInputName) {
  const select = getPickerSelect(targetInputName);
  if (!select) {
    throw new Error(`Missing picker for target: ${targetInputName}`);
  }

  const fileId = String(select.value || '').trim();
  if (!fileId) {
    throw new Error('Pick a Drive image first.');
  }

  const response = await fetch('/api/google-drive/select-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileId })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to use selected image');
  }

  setTargetImageUrl(targetInputName, result.publicUrl);
  return result.publicUrl;
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
    if (result.connected) {
      await loadDriveImages();
    } else {
      driveImageFiles = [];
      renderDriveImageOptions();
    }
  } catch (error) {
    setDriveUiStatus(false);
    driveImageFiles = [];
    renderDriveImageOptions();
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

function buildOutlookHtml(baseHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><!--[if mso]><div><![endif]-->${baseHtml}<!--[if mso]></div><![endif]--></body></html>`;
}

function htmlToPlainText(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  return (container.textContent || container.innerText || '').trim();
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

  setTargetImageUrl(targetInputName, result.publicUrl);
  return result.publicUrl;
}

form.addEventListener('input', updateSignature);
form.addEventListener('input', saveProgress);

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
      await loadDriveImages();
    } catch (error) {
      statusEl.textContent = error instanceof Error ? error.message : 'Upload failed';
    } finally {
      button.disabled = false;
    }
  });
});

pickerRefreshButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    if (!driveConnected) {
      statusEl.textContent = 'Connect your Google Drive account before loading images.';
      return;
    }

    button.disabled = true;
    statusEl.textContent = 'Loading images from Google Drive...';
    try {
      await loadDriveImages();
      statusEl.textContent = 'Drive images refreshed.';
    } catch (error) {
      statusEl.textContent = error instanceof Error ? error.message : 'Failed to refresh Drive images';
    } finally {
      button.disabled = false;
    }
  });
});

pickerUseButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    if (!driveConnected) {
      statusEl.textContent = 'Connect your Google Drive account before selecting images.';
      return;
    }

    const target = button.getAttribute('data-picker-use');
    button.disabled = true;
    statusEl.textContent = 'Applying selected Drive image...';

    try {
      const publicUrl = await useSelectedDriveImage(target);
      statusEl.textContent = `Applied image: ${publicUrl}`;
      await loadDriveImages();
    } catch (error) {
      statusEl.textContent = error instanceof Error ? error.message : 'Failed to apply selected Drive image';
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
    driveImageFiles = [];
    renderDriveImageOptions();
    statusEl.textContent = 'Google Drive disconnected.';
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : 'Failed to disconnect';
  }
});

mobilePreviewToggle.addEventListener('click', () => {
  const collapsed = !previewPanel.classList.contains('is-collapsed');
  setPreviewCollapsed(collapsed);
  savePreviewCollapsedPreference(collapsed);
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    statusEl.textContent = 'Signature HTML copied to clipboard.';
  } catch (_error) {
    statusEl.textContent = 'Clipboard copy failed. Copy manually from the box.';
  }
});

copyOutlookButton.addEventListener('click', async () => {
  const baseHtml = output.value;
  const outlookHtml = buildOutlookHtml(baseHtml);
  const plainText = htmlToPlainText(baseHtml);

  try {
    if (!window.ClipboardItem || !navigator.clipboard?.write) {
      await navigator.clipboard.writeText(outlookHtml);
      statusEl.textContent = 'Outlook HTML copied as text fallback.';
      return;
    }

    const item = new ClipboardItem({
      'text/html': new Blob([outlookHtml], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' })
    });

    await navigator.clipboard.write([item]);
    statusEl.textContent = 'Copied for Outlook. Paste directly in Outlook signature editor.';
  } catch (_error) {
    try {
      await navigator.clipboard.writeText(outlookHtml);
      statusEl.textContent = 'Copied Outlook HTML as text fallback.';
    } catch (_nestedError) {
      statusEl.textContent = 'Outlook copy failed. Try Copy HTML or manual paste from output.';
    }
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

restoreProgress();
renderDriveImageOptions();
updateSignature();
setDriveUiStatus(false);
handleOauthResultInUrl();
refreshDriveStatus();
syncPreviewCollapseForViewport();
window.addEventListener('resize', syncPreviewCollapseForViewport);
