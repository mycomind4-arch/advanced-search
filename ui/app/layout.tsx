import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Shell } from '@/components/shell/Shell';

export const metadata: Metadata = {
  title: 'Advanced Search — Investigation Workspace',
  description: 'Multi-source research and evidence workspace for coordinated investigation',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
