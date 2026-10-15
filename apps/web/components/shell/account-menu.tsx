'use client';

import { DropdownMenu } from 'radix-ui';
import { ChevronDown, Heart, LayoutDashboard, LogOut, Mic2, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSession, useSetSession } from '@/lib/api/hooks';
import { FAIL_COOKIE } from '@/lib/api/constants';
import { LoginDialog } from './login-dialog';

const itemCls =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-2';

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
          className="h-10 rounded-full px-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          Log in
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex h-10 items-center gap-2 rounded-full border border-border pr-3 pl-1 text-sm font-medium transition-colors hover:border-border-strong">
        <span className="grid size-8 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-primary-fg">{initials}</span>
        <span className="hidden max-w-28 truncate sm:inline">{session.name}</span>
        <ChevronDown className="size-4 text-fg-muted" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[95] min-w-56 rounded-xl border border-border bg-bg-elevated p-1.5 shadow-float data-[state=open]:animate-in"
        >
          <DropdownMenu.Label className="px-3 pt-2 pb-1 text-xs text-fg-subtle">
            {session.role === 'TALENT' ? 'Talent portal' : 'Customer account'}
          </DropdownMenu.Label>
          {session.role === 'CUSTOMER' ? (
            <>
              <DropdownMenu.Item asChild className={itemCls}>
                <Link href="/account"><LayoutDashboard className="size-4" /> My bookings</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild className={itemCls}>
                <Link href="/account/favourites"><Heart className="size-4" /> Favourites</Link>
              </DropdownMenu.Item>
            </>
          ) : (
            <DropdownMenu.Item asChild className={itemCls}>
              <Link href="/talent-portal"><Mic2 className="size-4" /> My portal</Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={itemCls} onSelect={toggleFail}>
            <WifiOff className="size-4" /> {failMode ? 'Stop simulating errors' : 'Simulate API errors'}
          </DropdownMenu.Item>
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
            <LogOut className="size-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
