'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@repo/ui/button';
import { Input } from '@repo/ui/field';
import { OtpInput } from '@repo/ui/otp-input';
import { Skeleton } from '@repo/ui/skeleton';
import { api, ApiError } from '@/lib/api/client';
import { REAL_API } from '@/lib/api/constants';
import { qk } from '@/lib/api/keys';

/** AUTH-3 for talent and representatives: prove the invited phone with a code, then straight into the portal. */
export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['invite', token], queryFn: () => api.invites.preview(token), enabled: REAL_API, retry: false });
  const [sent, setSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.invites.sendCode(token);
      setSent(true);
      setResendIn(r.resendInSeconds);
      toast.success('Code sent');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const accept = async () => {
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code');
    setBusy(true);
    setError(null);
    try {
      await api.invites.accept(token, code, name.trim() || undefined);
      await qc.invalidateQueries({ queryKey: qk.session });
      toast.success('Welcome aboard');
      router.push('/talent-portal');
      router.refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const heading = <h1 className="font-display text-4xl font-extrabold tracking-tight">Your invite</h1>;
  if (!REAL_API) return <>{heading}<p className="mt-4 text-fg-muted">Invite links work once the site is connected to the live booking system.</p></>;
  if (q.isError)
    return (
      <>
        {heading}
        <p role="alert" className="mt-4 text-danger">{q.error instanceof ApiError ? q.error.message : 'This invite link isn’t valid.'}</p>
        <Link href="/" className={`${buttonVariants({ variant: 'outline' })} mt-6`}>Back to the site</Link>
      </>
    );
  if (!q.data) return <Skeleton className="h-64 rounded-2xl" />;
  if (q.data.method === 'password') return <>{heading}<p className="mt-4 text-fg-muted">This is a staff invite. Open it in the admin app link you were sent.</p></>;

  return (
    <>
      {heading}
      <p className="mt-3 text-fg-muted">
        You’ve been invited{q.data.name ? `, ${q.data.name},` : ''} to manage your bookings, payouts and dates. We’ll text a code to {q.data.phone ?? 'your number'} to confirm it’s you.
      </p>
      <form
        className="mt-8 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void (sent ? accept() : sendCode());
        }}
      >
        {sent && (
          <>
            <Input label="Your name (optional)" autoComplete="name" defaultValue={q.data.name ?? ''} onChange={(e) => setName(e.target.value)} />
            <div>
              <p className="mb-2 text-sm text-fg-muted">Code from the text message</p>
              <OtpInput value={code} onChange={setCode} error={Boolean(error)} />
            </div>
          </>
        )}
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-label="Working" /> : sent ? 'Accept invite' : 'Text me a code'}
          </Button>
          {sent && (
            <Button type="button" variant="ghost" size="lg" disabled={busy || resendIn > 0} onClick={() => void sendCode()}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </Button>
          )}
        </div>
      </form>
    </>
  );
}
