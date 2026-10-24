import type { Metadata } from 'next';
import { BookingsList } from '@/components/account/bookings-list';

export const metadata: Metadata = { title: 'Your bookings', robots: { index: false } };

export default function BookingsPage() {
  return <BookingsList />;
}
