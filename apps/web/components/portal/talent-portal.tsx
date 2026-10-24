'use client';

import { Skeleton } from '@repo/ui/skeleton';
import { REAL_API } from '@/lib/api/constants';
import { useOnboarding } from '@/lib/api/hooks';
import { OnboardingView } from './onboarding-view';
import { PortalView } from './portal-view';

/** Talent area: new talent finish their profile first (onboarding); approved talent get the portal. */
export function TalentPortal() {
  const q = useOnboarding();
  // Demo (mock) mode has no onboarding; the demo talent is already live.
  if (!REAL_API) return <PortalView />;
  if (q.isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-12">
        <Skeleton className="hidden h-80 rounded-2xl lg:block" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }
  if (q.data && q.data.status !== 'LIVE' && q.data.status !== 'HIDDEN') return <OnboardingView data={q.data} />;
  return <PortalView />;
}
