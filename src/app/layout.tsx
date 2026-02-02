import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Setlist Prepper - Konzert-Setlists mit Visual-Planung',
  description:
    'Plane Konzert-Setlists mit Visual-Beschreibungen, Beleuchtungsnotizen und Bühnenanweisungen. Echtzeit-Kollaboration im Team und PDF-Export.',
  keywords: [
    'Setlist',
    'Konzert',
    'Visuals',
    'VJ',
    'Lichtdesign',
    'Bühnenshow',
    'Kollaboration',
    'Bandplanung',
  ],
  authors: [{ name: 'Setlist Prepper' }],
  openGraph: {
    title: 'Setlist Prepper - Konzert-Setlists mit Visual-Planung',
    description:
      'Plane Konzert-Setlists mit Visual-Beschreibungen und Echtzeit-Kollaboration im Team.',
    type: 'website',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Setlist Prepper - Konzert-Setlists mit Visual-Planung',
    description:
      'Plane Konzert-Setlists mit Visual-Beschreibungen und Echtzeit-Kollaboration im Team.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
