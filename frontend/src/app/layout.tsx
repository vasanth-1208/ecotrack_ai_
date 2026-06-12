import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import AccessibilityPanel from '../components/AccessibilityPanel';
import SimulatorModal from '../components/SimulatorModal';
import ServiceWorkerRegistration from '../components/pwa/ServiceWorkerRegistration';
import { APP_DESCRIPTION, APP_NAME, APP_THEME_COLOR } from '../constants/ecotrack';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export const viewport = {
  themeColor: APP_THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col`}>
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <AccessibilityPanel />
        <SimulatorModal />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
