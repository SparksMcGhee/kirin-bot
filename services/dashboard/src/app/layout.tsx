import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kirin Dashboard',
  description: 'Self-hosted LLM-powered content filtering',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

