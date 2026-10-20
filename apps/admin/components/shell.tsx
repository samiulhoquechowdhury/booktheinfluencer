'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { BarChart3, KanbanSquare, LogOut, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@repo/ui/lib/cn';
import { api } from '@/lib/api/client';
import { ROLE_LABELS, can } from '@/lib/roles';
import type { StaffRole, StaffUser } from '@/lib/types';
import { UserProvider } from './user-context';

/** Sections built so far (design.md §Admin). More arrive with each milestone. */
const NAV: { href: string; label: string; icon: typeof BarChart3; roles: StaffRole[] }[] = [
  { href: '/', label: 'Overview', icon: BarChart3, roles: ['SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS'] },
  { href: '/leads', label: 'Pipeline', icon: KanbanSquare, roles: ['SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS'] },
];

export function Shell({ user, children }: { user: StaffUser; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => can(user, ...n.roles));
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  const signOut = async () => {
    await api.post('/session/logout').catch(() => undefined);
    toast('Signed out');
    router.replace('/login');
    router.refresh();
  };

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Main">
      <p className="px-3 pt-2 pb-4 font-display text-lg font-extrabold tracking-tight">
        BookTheInfluencer <span className="text-primary-text">Admin</span>
      </p>
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          aria-current={active(n.href) ? 'page' : undefined}
          className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', active(n.href) ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface hover:text-fg')}
        >
          <n.icon className="size-4" aria-hidden />
          {n.label}
        </Link>
      ))}
      <div className="mt-auto rounded-xl border border-border p-3">
        <p className="truncate text-sm font-semibold">{user.name ?? user.email}</p>
        <p className="truncate text-xs text-fg-muted">{user.roles.map((r) => ROLE_LABELS[r]).join(' · ')}</p>
        <button type="button" onClick={signOut} className="mt-3 flex items-center gap-2 text-sm font-medium text-danger hover:underline">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <UserProvider user={user}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-border bg-bg-elevated lg:block">{nav}</aside>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-bg-elevated px-4 lg:hidden">
          <span className="font-display font-extrabold">Admin</span>
          <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)} className="grid size-10 place-items-center rounded-lg hover:bg-surface-2">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </header>
        {open && <div className="fixed inset-x-0 top-14 bottom-0 z-40 bg-bg-elevated lg:hidden">{nav}</div>}
        <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
