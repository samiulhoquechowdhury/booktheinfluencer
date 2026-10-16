'use client';

import { ArrowRight, CalendarDays, MapPin, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { DatePicker } from '@repo/ui/date-picker';
import { Select } from '@repo/ui/select';
import { cn } from '@repo/ui/lib/cn';
import { CATEGORIES, CITIES } from '@/lib/reference';
import { Magnetic } from '@/lib/motion';

const Cell = ({ icon, label, htmlFor, children }: { icon: ReactNode; label: string; htmlFor: string; children: ReactNode }) => (
  <div className="group relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3 transition-colors focus-within:bg-surface-2/70 hover:bg-surface-2/50 md:min-w-[10rem] md:rounded-full md:px-5">
    <span className="shrink-0 text-primary-text" aria-hidden>{icon}</span>
    <span className="flex min-w-0 flex-1 flex-col">
      <label htmlFor={htmlFor} className="cursor-pointer text-[0.6875rem] font-semibold tracking-wide text-fg-muted uppercase">{label}</label>
      {children}
    </span>
  </div>
);

/** Glass search: Category · City · Date → /talent with filters. */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (city) sp.set('city', city);
    if (date) sp.set('date', date);
    const base = category ? `/talent/${category}` : '/talent';
    router.push(sp.size ? `${base}?${sp}` : base);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Find talent"
      className={cn('glass flex flex-col gap-1 rounded-3xl p-2 text-left shadow-float md:flex-row md:items-center md:rounded-full', className)}
    >
      <Cell icon={<Sparkles className="size-4" />} label="Category" htmlFor="sb-category">
        <Select
          id="sb-category"
          variant="bare"
          value={category}
          onValueChange={setCategory}
          emptyLabel="All talent"
          options={CATEGORIES.map((c) => ({ value: c.slug, label: c.name, description: c.description.split(' — ')[0] }))}
          contentClassName="md:min-w-[18rem] md:max-w-[24rem]"
        />
      </Cell>
      <span aria-hidden className="hidden h-8 w-px bg-border md:block" />
      <Cell icon={<MapPin className="size-4" />} label="City" htmlFor="sb-city">
        <Select
          id="sb-city"
          variant="bare"
          value={city}
          onValueChange={setCity}
          emptyLabel="Any city"
          options={CITIES.map((c) => ({ value: c.slug, label: c.name, description: c.state }))}
        />
      </Cell>
      <span aria-hidden className="hidden h-8 w-px bg-border md:block" />
      <Cell icon={<CalendarDays className="size-4" />} label="Date" htmlFor="sb-date">
        <DatePicker id="sb-date" variant="bare" value={date} onChange={setDate} placeholder="Any date" />
      </Cell>
      <Magnetic className="flex md:inline-flex">
        <button
          type="submit"
          className="group/s flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 font-semibold text-primary-fg transition-transform active:scale-[0.97] md:w-auto md:rounded-full"
        >
          Find talent
          <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover/s:translate-x-1" aria-hidden />
        </button>
      </Magnetic>
    </form>
  );
}
