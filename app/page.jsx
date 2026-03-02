import Script from 'next/script';

export default function Page() {
  return (
    <>
      <div className="page-bg" />
      <main className="container">
        <header className="header">
          <div>
            <img src="/assets/sigar-logo.png" alt="Sigar logo" className="app-logo" />
            <h1>Sigar</h1>
            <p className="subtext">
              Build, preview, and export an HTML email signature with cloud-hosted avatar and logo images.
            </p>
          </div>
        </header>

        <section className="panel form-panel">
          <h2>Profile</h2>
          <form id="signature-form" className="form-grid">
            <label>
              <span className="label-title">Full name</span>
              <input name="fullName" defaultValue="Alex Morgan" required />
            </label>
            <label>
              <span className="label-title">Job title</span>
              <input name="jobTitle" defaultValue="Head of Product" />
            </label>
            <label>
              <span className="label-title">Company</span>
              <input name="company" defaultValue="Northwind Labs" />
            </label>
            <label>
              <span className="label-title">Phone</span>
              <input name="phone" defaultValue="+1 (555) 019-9921" />
            </label>
            <label>
              <span className="label-title">Email</span>
              <input name="email" defaultValue="alex@northwindlabs.com" />
            </label>
            <label>
              <span className="label-title">Website</span>
              <input name="website" defaultValue="https://northwindlabs.com" />
            </label>
            <label className="wide">
              <span className="label-title">Address</span>
              <input name="address" defaultValue="310 Montgomery St, San Francisco, CA" />
            </label>

            <div className="section-divider" />
            <h3 className="section-title">Social Links</h3>
            <label>
              <span className="label-title">LinkedIn</span>
              <input name="linkedin" defaultValue="https://linkedin.com/in/alexmorgan" />
            </label>
            <label>
              <span className="label-title">X / Twitter</span>
              <input name="twitter" defaultValue="https://x.com/alexmorgan" />
            </label>
            <label>
              <span className="label-title">Instagram</span>
              <input name="instagram" defaultValue="https://instagram.com/alexmorgan" />
            </label>
            <label>
              <span className="label-title">YouTube</span>
              <input name="youtube" defaultValue="https://youtube.com/@alexmorgan" />
            </label>

            <div className="section-divider" />
            <h3 className="section-title">Google Drive</h3>
            <div className="upload-group wide">
              <div className="upload-item drive-connect">
                <div className="drive-head">
                  <label>
                    <span className="label-title">Google Drive account</span>
                  </label>
                  <p id="drive-status" className="drive-status">
                    Checking connection...
                  </p>
                </div>
                <div className="drive-actions">
                  <button id="connect-drive" type="button">
                    Connect Google Drive
                  </button>
                  <button id="disconnect-drive" type="button">
                    Disconnect
                  </button>
                </div>
                <label>
                  <span className="label-title">Drive folder ID (optional)</span>
                  <input
                    name="driveFolderId"
                    placeholder="If empty, uploads go to user's My Drive root"
                  />
                </label>
              </div>

              <div className="section-divider upload-divider" />
              <h3 className="upload-title">Uploads</h3>

              <div className="upload-item">
                <label htmlFor="avatarUpload">
                  <span className="label-title">Upload avatar to Google Drive</span>
                </label>
                <input id="avatarUpload" type="file" accept="image/*" />
                <label htmlFor="avatarDriveSelect">
                  <span className="label-title">Pick existing Drive image</span>
                </label>
                <select id="avatarDriveSelect" data-picker-select="avatarUrl" />
                <div className="picker-actions">
                  <button type="button" data-picker-refresh="avatarUrl">
                    Refresh Drive Images
                  </button>
                  <button type="button" data-picker-use="avatarUrl">
                    Use Selected
                  </button>
                </div>
                <button type="button" data-upload-target="avatarUrl">
                  Upload avatar
                </button>
              </div>

              <div className="upload-item">
                <label htmlFor="logoUpload">
                  <span className="label-title">Upload logo to Google Drive</span>
                </label>
                <input id="logoUpload" type="file" accept="image/*" />
                <label htmlFor="logoDriveSelect">
                  <span className="label-title">Pick existing Drive image</span>
                </label>
                <select id="logoDriveSelect" data-picker-select="logoUrl" />
                <div className="picker-actions">
                  <button type="button" data-picker-refresh="logoUrl">
                    Refresh Drive Images
                  </button>
                  <button type="button" data-picker-use="logoUrl">
                    Use Selected
                  </button>
                </div>
                <button type="button" data-upload-target="logoUrl">
                  Upload logo
                </button>
              </div>
            </div>

            <div className="section-divider" />
            <h3 className="section-title">Branding</h3>
            <label>
              <span className="label-title">Accent color</span>
              <input type="color" name="accentColor" defaultValue="#2160ff" />
            </label>
            <label>
              <span className="label-title">Avatar image URL</span>
              <input name="avatarUrl" placeholder="https://..." />
            </label>
            <label>
              <span className="label-title">Logo image URL</span>
              <input name="logoUrl" placeholder="https://..." />
            </label>
          </form>
        </section>

        <section className="panel preview-panel">
          <div className="preview-head">
            <h2>Preview</h2>
            <button
              id="mobile-preview-toggle"
              type="button"
              className="mobile-preview-toggle"
              aria-expanded="false"
            >
              Expand
            </button>
            <div className="actions">
              <button id="copy-html" type="button">
                Copy HTML
              </button>
              <button id="copy-outlook" type="button">
                Copy for Outlook
              </button>
              <button id="download-html" type="button">
                Download HTML
              </button>
            </div>
          </div>
          <div className="preview-content">
            <div className="preview-card">
              <div id="signature-preview" />
            </div>

            <label className="html-output-label" htmlFor="signature-html-output">
              Generated HTML
            </label>
            <textarea id="signature-html-output" readOnly />
            <p id="status" className="status" />
          </div>
        </section>
      </main>

      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
