import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SuccessView } from '@/components/enquiry/success-view';

export const metadata: Metadata = { title: 'Brief received', robots: { index: false } };

export default function EnquirySuccessPage() {
  return (
    <Suspense>
      <SuccessView />
    </Suspense>
  );
}
