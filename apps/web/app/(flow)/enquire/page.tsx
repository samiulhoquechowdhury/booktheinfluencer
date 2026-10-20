import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnquiryFallback } from '@/components/enquiry/enquiry-fallback';
import { EnquiryStepper } from '@/components/enquiry/enquiry-stepper';

export const metadata: Metadata = {
  title: 'Plan your event — send a brief',
  description: 'One brief, verified availability and an itemised quote — usually within 24 hours.',
  alternates: { canonical: '/enquire' },
};

export default function EnquirePage() {
  return (
    <div className="shell">
      <Suspense fallback={<EnquiryFallback />}>
        <EnquiryStepper />
      </Suspense>
    </div>
  );
}
