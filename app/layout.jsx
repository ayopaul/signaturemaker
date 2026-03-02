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
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
