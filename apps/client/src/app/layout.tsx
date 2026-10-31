import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '700', '800'],
  variable: '--font-bricolage',
});
const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: { default: 'TrustedHands', template: '%s · TrustedHands' },
  description: 'Verified help for home, errands and repairs in Kigali.',
  applicationName: 'TrustedHands',
  appleWebApp: { capable: true, title: 'TrustedHands', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#FBF6EE',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
