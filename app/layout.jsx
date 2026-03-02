import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata = {
  title: 'Sigar - Free Email Signature Generator',
  description:
    'Sigar is a free email signature generator with live preview, HTML export, and Google Drive image upload.',
  icons: {
    icon: '/assets/sigar-logo.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="e551b348-8918-4a94-be1c-f6f751ac25fc"
          type="text/javascript"
          async
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BCNLP50H4K" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-BCNLP50H4K');
            `
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
