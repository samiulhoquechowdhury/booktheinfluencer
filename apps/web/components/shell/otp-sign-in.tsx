'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { IndianMobileSchema, type Session } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/field';
import { OtpInput } from '@repo/ui/otp-input';
import { ApiError } from '@/lib/api/client';
import { useRequestCode, useVerifyCode } from '@/lib/api/hooks';

/** Phone + one-time code sign-in (AUTH-1). Customers: new numbers get an account. Talent: only the number on their invite works. */
export function OtpSignIn({ onSignedIn, as = 'customer' }: { onSignedIn: (s: Session) => void; as?: 'customer' | 'talent' }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | undefined>();
  const requestCode = useRequestCode();
  const verify = useVerifyCode();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = () => {
    const parsed = IndianMobileSchema.safeParse(phone);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Enter a valid mobile number');
    setError(null);
    requestCode.mutate(parsed.data, {
      onSuccess: (r) => {
        setSentTo(parsed.data);
        setResendIn(r.resendInSeconds);
        setCode('');
        setHint(r.devHint);
        toast.success('Code sent', { description: r.devHint });
      },
      onError: (e) => setError(e instanceof ApiError ? e.message : 'Couldn’t send the code. Try again.'),
    });
  };

  const submit = () => {
    if (!sentTo || !/^\d{6}$/.test(code)) return setError('Enter the 6-digit code');
    setError(null);
    verify.mutate({ phone: sentTo, code, as }, { onSuccess: onSignedIn, onError: (e) => setError(e instanceof ApiError ? e.message : 'Couldn’t sign in. Try again.') });
  };

  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (sentTo) submit();
        else send();
      }}
    >
      <Input type="tel" inputMode="tel" label="Mobile number" prefix="+91" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={Boolean(sentTo) && verify.isPending} />
      {sentTo && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm text-fg-muted">Enter the 6-digit code sent to ••••{sentTo.slice(-4)}.</p>
          {hint && <p className="mb-3 rounded-lg bg-gold-soft px-3 py-2 text-xs font-semibold text-gold-text">{hint}</p>}
          <OtpInput value={code} onChange={setCode} error={Boolean(error)} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={requestCode.isPending || verify.isPending}>
          {requestCode.isPending || verify.isPending ? <Loader2 className="animate-spin" aria-label="Working" /> : sentTo ? 'Sign in' : 'Send code'}
        </Button>
        {sentTo && (
          <Button type="button" variant="ghost" size="lg" onClick={send} disabled={resendIn > 0 || requestCode.isPending}>
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </Button>
        )}
      </div>
    </form>
  );
}
