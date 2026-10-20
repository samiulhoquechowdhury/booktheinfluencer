'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import type { StaffLoginResult } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/field';
import { OtpInput } from '@repo/ui/otp-input';
import { api, ApiError } from '@/lib/api/client';

/** AUTH-2: email + password, then the authenticator code. First sign-in shows the authenticator setup. */
export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<StaffLoginResult | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      setStep(await api.post<StaffLoginResult>('/session/login', { email, password }));
      setCode('');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!step || !/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your authenticator app');
    setBusy(true);
    setError(null);
    try {
      await api.post('/session/mfa', { mfaToken: step.mfaToken, code });
      // Only same-site paths: never bounce to another origin from ?next=.
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
      router.refresh();
    } catch (e) {
      fail(e);
      if (e instanceof ApiError && (e.code === 'MFA_TOKEN_INVALID' || e.status === 401)) setStep(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="mt-8 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void (step ? verify() : login());
      }}
    >
      {!step ? (
        <>
          <Input type="email" label="Work email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </>
      ) : (
        <div className="grid gap-4">
          {step.setup && (
            <div className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <KeyRound className="size-4 text-primary-text" aria-hidden /> Set up your authenticator
              </p>
              <p className="mt-2 text-fg-muted">Add this account in Google Authenticator, Microsoft Authenticator or 1Password, then enter the code it shows.</p>
              <p className="mt-3 text-xs text-fg-subtle">Setup key</p>
              <code className="mt-1 block rounded-lg bg-surface-2 px-3 py-2 font-mono text-sm tracking-wider break-all select-all">{step.setup.secret}</code>
              <a href={step.setup.otpauthUrl} className="mt-2 inline-block text-xs font-medium text-primary-text underline-offset-4 hover:underline">
                Open in an authenticator app on this device
              </a>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm text-fg-muted">Authenticator code</p>
            <OtpInput value={code} onChange={setCode} error={Boolean(error)} />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-label="Working" /> : step ? 'Verify and sign in' : 'Continue'}
      </Button>
      {step && (
        <button type="button" className="text-sm text-fg-muted hover:text-fg" onClick={() => setStep(null)}>
          Use a different account
        </button>
      )}
    </form>
  );
}
