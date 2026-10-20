import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TalentList } from '@/components/talents/talent-list';

export const metadata: Metadata = { title: 'Talents' };

export default function TalentsPage() {
  return (
    <Suspense>
      <TalentList />
    </Suspense>
  );
}
