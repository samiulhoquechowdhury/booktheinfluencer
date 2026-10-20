import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-sm font-extrabold tracking-tight text-primary-text">BookTheInfluencer</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Staff sign-in</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
