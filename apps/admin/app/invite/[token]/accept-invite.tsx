'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@repo/ui/button';
import { Input } from '@repo/ui/field';
import { Skeleton } from '@repo/ui/skeleton';
import { api, ApiError } from '@/lib/api/client';
import { ROLE_LABELS } from '@/lib/roles';
import type { Role } from '@/lib/types';

type Preview = { name: string | null; email: string | null; phone: string | null; roles: Role[]; expiresAt: string; method: 'password' | 'otp' };

/** AUTH-3 for staff: choose a password; the authenticator is set up at first sign-in. */
export function AcceptInvite({ token }: { token: string }) {
  const q = useQuery({ queryKey: ['invite', token], queryFn: () => api.get<Preview>(`/invites/${encodeURIComponent(token)}`), retry: false });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (q.isError) {
    return (
      <>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Invite</h1>
        <p role="alert" className="mt-6 text-sm text-danger">
          {q.error instanceof ApiError ? q.error.message : 'This invite link isn’t valid.'}
        </p>
        <Link href="/login" className={`${buttonVariants({ variant: 'outline' })} mt-6`}>
          Go to sign-in
        </Link>
      </>
    );
  }
  if (!q.data) return <Skeleton className="mt-6 h-64 rounded-2xl" />;
  const inv = q.data;
  if (inv.method === 'otp')
    return <p className="mt-6 text-sm text-fg-muted">This invite is for the talent portal on the website. Open the link you were sent on your phone.</p>;
  if (done)
    return (
      <>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <CheckCircle2 className="size-7 text-success" aria-hidden /> You’re in
        </h1>
        <p className="mt-3 text-sm text-fg-muted">Sign in with {inv.email} and your new password. You’ll set up an authenticator app on the way.</p>
        <Link href="/login" className={`${buttonVariants({ size: 'lg' })} mt-6 w-full`}>
          Sign in
        </Link>
      </>
    );

  const submit = async () => {
    if (password.length < 12) return setError('Use at least 12 characters.');
    if (password !== confirm) return setError('The passwords don’t match.');
    setBusy(true);
    setError(null);
    try {
      await api.post(`/invites/${encodeURIComponent(token)}/accept`, { password, ...(name.trim() ? { name: name.trim() } : {}) });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Join the team</h1>
      <p className="mt-2 text-sm text-fg-muted">
        {inv.email} · {inv.roles.map((r) => ROLE_LABELS[r]).join(', ')}
      </p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label="Your name" autoComplete="name" defaultValue={inv.name ?? ''} onChange={(e) => setName(e.target.value)} />
        <input type="email" autoComplete="username" value={inv.email ?? ''} readOnly hidden />
        <Input type="password" label="Choose a password (12+ characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Input type="password" label="Repeat the password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-label="Saving" /> : 'Set password'}
        </Button>
      </form>
    </>
  );
}
