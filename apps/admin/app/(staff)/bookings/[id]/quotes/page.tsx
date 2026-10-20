import type { Metadata } from 'next';
import { QuoteBuilder } from '@/components/quote-builder';

export const metadata: Metadata = { title: 'Quotes' };

export default async function QuotesPage({ params }: { params: Promise<{ id: string }> }) {
  return <QuoteBuilder bookingId={(await params).id} />;
}
