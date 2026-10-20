'use client';

import { DropdownMenu } from 'radix-ui';
import { ChevronDown, CircleUserRound, Heart, LayoutDashboard, LogOut, Mic2, Plus, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@repo/ui/lib/cn';
import { useSession, useSetSession } from '@/lib/api/hooks';
import { FAIL_COOKIE, REAL_API } from '@/lib/api/constants';
import { LoginDialog } from './login-dialog';

const itemCls =
  'group/mi flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-surface-2';

function ItemIcon({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 transition-colors group-data-[highlighted]/mi:bg-surface-3 [&_svg]:size-4',
        tone === 'danger' ? 'text-danger' : 'text-fg-muted group-data-[highlighted]/mi:text-fg',
      )}
    >
      {children}
    </span>
  );
}

function Row({ icon, title, hint, tone }: { icon: ReactNode; title: string; hint?: string; tone?: 'default' | 'danger' }) {
  return (
    <>
      <ItemIcon tone={tone}>{icon}</ItemIcon>
      <span className="min-w-0">
        <span className={cn('block font-medium', tone === 'danger' && 'text-danger')}>{title}</span>
        {hint && <span className="block truncate text-xs text-fg-muted">{hint}</span>}
      </span>
    </>
  );
}

export function AccountMenu() {
  const { data: session } = useSession();
  const setSession = useSetSession();
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [failMode, setFailMode] = useState(false);
  useEffect(() => setFailMode(document.cookie.includes(`${FAIL_COOKIE}=1`)), []);

  if (!session || session.role === 'GUEST') {
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          aria-label="Log in"
          title="Log in"
          className="grid size-10 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <CircleUserRound className="size-[22px]" strokeWidth={1.75} aria-hidden />
        </button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  const initials = (session.name ?? '?').split(' ').map((p) => p[0]).join('').slice(0, 2);
  const toggleFail = () => {
    const next = !failMode;
    document.cookie = `${FAIL_COOKIE}=${next ? '1' : '0'}; path=/; max-age=${next ? 3600 : 0}`;
    setFailMode(next);
    toast(next ? 'Simulating API failures — lists will show error states' : 'API failure simulation off');
    router.refresh();
  };

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Account menu for ${session.name ?? 'your account'}`}
        className="group/acc flex h-10 items-center gap-1.5 rounded-full border border-border pr-2.5 pl-1 text-sm font-medium transition-colors outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-border-strong data-[state=open]:bg-surface-2"
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-primary-fg">{initials}</span>
        <ChevronDown className="size-4 text-fg-muted transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-data-[state=open]/acc:rotate-180" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="pop z-[95] w-72 overflow-hidden rounded-2xl border border-border bg-bg-elevated p-1.5 shadow-float"
        >
          <div className="relative mb-1 overflow-hidden rounded-xl p-3">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,var(--glow-1),transparent_60%)]" />
            <div className="relative flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-primary-fg">{initials}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{session.name}</span>
                <span className="block text-xs text-fg-muted">{session.role === 'TALENT' ? 'Talent · Nahid Afrin' : 'Customer account'}</span>
              </span>
            </div>
          </div>

          <DropdownMenu.Group>
            {session.role === 'CUSTOMER' ? (
              <>
                <DropdownMenu.Item asChild className={itemCls}>
                  <Link href="/account"><Row icon={<LayoutDashboard />} title="My bookings" hint="Quotes, payments, documents" /></Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={itemCls}>
                  <Link href="/account/favourites"><Row icon={<Heart />} title="Favourites" hint="Your shortlist" /></Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={itemCls}>
                  <Link href="/enquire"><Row icon={<Plus />} title="New brief" hint="Plan another event" /></Link>
                </DropdownMenu.Item>
              </>
            ) : (
              <DropdownMenu.Item asChild className={itemCls}>
                <Link href="/talent-portal"><Row icon={<Mic2 />} title="My portal" hint="Bookings, payouts, blackout dates" /></Link>
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Group>

          {!REAL_API && (
            <>
              <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
              <DropdownMenu.Label className="px-2.5 pt-1 pb-1.5 text-[0.6875rem] font-semibold tracking-wide text-fg-subtle uppercase">Demo tools</DropdownMenu.Label>
              <DropdownMenu.CheckboxItem checked={failMode} onSelect={(e) => { e.preventDefault(); toggleFail(); }} className={itemCls}>
                <Row icon={<WifiOff />} title="Simulate API errors" hint="Show error states" />
                <span
                  aria-hidden
                  className={cn('ml-auto h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors', failMode ? 'bg-warning' : 'bg-surface-3')}
                >
                  <span className={cn('block size-4 rounded-full bg-fg transition-transform duration-(--duration-base) ease-(--ease-out-expo)', failMode && 'translate-x-4 bg-black')} />
                </span>
              </DropdownMenu.CheckboxItem>
            </>
          )}

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
          <DropdownMenu.Item
            className={itemCls}
            onSelect={() =>
              setSession.mutate('GUEST', {
                onSuccess: () => {
                  toast('Signed out');
                  router.push('/');
                  router.refresh();
                },
              })
            }
          >
            <Row icon={<LogOut />} title="Sign out" tone="danger" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
