import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Collections } from '@/components/money/collections';

export const metadata: Metadata = { title: 'Payments' };

export default function PaymentsPage() {
  return (
    <Suspense>
      <Collections />
    </Suspense>
  );
}
