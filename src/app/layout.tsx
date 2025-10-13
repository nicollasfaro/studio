

'use client';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { BusinessInfoProvider, useBusinessInfo } from '@/components/BusinessInfoProvider';
import { useEffect } from 'react';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { info, isLoading } = useBusinessInfo();

  useEffect(() => {
    if (info?.name) {
      document.title = info.name;
    } else if (!isLoading) {
      document.title = "Thainnes Cuba Ciuldin"; // Fallback title
    }
  }, [info, isLoading]);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registrado com sucesso no escopo:', registration.scope);
        })
        .catch((err) => {
          console.error('Falha ao registrar o Service Worker:', err);
        });
    }
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster />
    </>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="description" content="Your one-stop beauty and wellness salon." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Belleza&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
         <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased flex flex-col'
        )}
      >
        <FirebaseClientProvider>
          <BusinessInfoProvider>
            <ThemeProvider>
              <AppLayout>{children}</AppLayout>
            </ThemeProvider>
          </BusinessInfoProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

    