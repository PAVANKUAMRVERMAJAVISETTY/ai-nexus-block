import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Nexus Block — Agentic Knowledge OS & Developer Sandbox',
  description:
    'An agentic knowledge platform and multi-tenant developer sandbox for discovering AI tools, documenting projects, learning technologies, and maintaining a living developer portfolio.',
  metadataBase: new URL('https://ainexusblock.com'),
  openGraph: {
    title: 'AI Nexus Block',
    description: 'Agentic Knowledge OS & Developer Sandbox',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Nexus Block',
    description: 'Agentic Knowledge OS & Developer Sandbox',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
