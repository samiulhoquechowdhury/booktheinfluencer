import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Pipeline } from '@/components/pipeline';

export const metadata: Metadata = { title: 'Pipeline' };

export default function LeadsPage() {
  return (
    <Suspense>
      <Pipeline />
    </Suspense>
  );
}
