'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { CursorFollower, LenisProvider, TransitionProvider } from '@/lib/motion';

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 1,
          },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={qc}>
        <LenisProvider>
          <TransitionProvider>
            {children}
            <CursorFollower />
            <Toaster
              position="bottom-center"
              toastOptions={{
                className: '!rounded-xl !border !border-border !bg-bg-elevated !text-fg !shadow-float',
              }}
            />
          </TransitionProvider>
        </LenisProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
