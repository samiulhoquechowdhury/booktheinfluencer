import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TalentDetail } from '@/components/talents/talent-detail';

export const metadata: Metadata = { title: 'Talent' };

export default async function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <TalentDetail id={id} />
    </Suspense>
  );
}
