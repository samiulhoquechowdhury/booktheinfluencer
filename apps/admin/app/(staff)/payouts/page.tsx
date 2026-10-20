import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Payouts } from '@/components/money/payouts';

export const metadata: Metadata = { title: 'Payouts' };

export default function PayoutsPage() {
  return (
    <Suspense>
      <Payouts />
    </Suspense>
  );
}
