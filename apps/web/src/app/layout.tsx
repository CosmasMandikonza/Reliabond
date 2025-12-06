import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reliabond | Agent Reliability Exchange',
  description: 'Autonomous SLA enforcement through bonded agents. Monitor, verify, and compensate.',
  keywords: ['SLA', 'reliability', 'agents', 'Web3', 'bonds', 'Nullshot'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
