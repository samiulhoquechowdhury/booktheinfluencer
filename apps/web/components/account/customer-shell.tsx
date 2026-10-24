'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CalendarCheck, Heart, LayoutDashboard, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { DashboardShell, HelpCard } from '@/components/dashboard/dashboard-shell';
import { useSession } from '@/lib/api/hooks';

/** Customer account frame: overview, bookings, favourites and a quick "new brief" action. */
export function CustomerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  return (
    <DashboardShell
      name={session?.name ?? 'Your account'}
      caption="Customer account"
      nav={[
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/account', active: pathname === '/account' },
        { key: 'bookings', label: 'Bookings', icon: CalendarCheck, href: '/account/bookings', active: pathname.startsWith('/account/bookings') },
        { key: 'favourites', label: 'Favourites', icon: Heart, href: '/account/favourites', active: pathname.startsWith('/account/favourites') },
        { key: 'new', label: 'New brief', icon: Plus, href: '/enquire', active: false },
      ]}
      footer={
        <HelpCard
          title="Need a hand?"
          body="Your manager’s phone and WhatsApp are on every booking. For anything else, write to us."
          action={
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/contact"><MessageCircle aria-hidden /> Contact us</Link>
            </Button>
          }
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
