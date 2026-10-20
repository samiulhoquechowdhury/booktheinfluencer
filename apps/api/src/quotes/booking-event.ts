import type { Lead } from '@repo/db';
import type { BookingEventSchema } from '@repo/schemas';
import { EVENT_TYPE_LABELS } from '@repo/utils';
import type { z } from 'zod';

type BookingEvent = z.input<typeof BookingEventSchema>;

/** The event as customers and talent see it (no customer contact details). */
export function toBookingEvent(l: Pick<Lead, 'eventType' | 'companyName' | 'eventDate' | 'startTime' | 'city' | 'venue' | 'audienceSize' | 'durationMins'>): BookingEvent {
  const label = EVENT_TYPE_LABELS[l.eventType as keyof typeof EVENT_TYPE_LABELS] ?? 'Event';
  return {
    type: l.eventType as BookingEvent['type'],
    title: l.companyName ? `${label} · ${l.companyName}` : label,
    date: l.eventDate.toISOString().slice(0, 10),
    startTime: l.startTime,
    city: l.city as BookingEvent['city'],
    venue: l.venue ?? '',
    audienceSize: l.audienceSize ?? 1,
    durationMins: l.durationMins ?? 60,
  };
}
