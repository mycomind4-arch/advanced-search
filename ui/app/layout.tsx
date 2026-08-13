import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Advanced Search', description: 'Multi-source research and evidence workspace' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
