import type { Metadata } from 'next';
import { BookingDetail } from '@/components/account/booking-detail';

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Booking ${(await params).ref}`, robots: { index: false } };
}

export default async function BookingPage({ params }: Props) {
  const { ref } = await params;
  return <BookingDetail bookingRef={decodeURIComponent(ref)} />;
}
