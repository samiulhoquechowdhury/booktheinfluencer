'use client';

import { ArrowRight, CalendarDays, MapPin, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { todayIST } from '@repo/utils';
import { cn } from '@repo/ui/lib/cn';
import { CATEGORIES, CITIES } from '@/lib/reference';
import { Magnetic } from '@/lib/motion';

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

  const cell = 'group relative flex min-w-0 flex-1 items-center gap-3 md:min-w-[9.5rem] rounded-2xl px-4 py-3 transition-colors focus-within:bg-surface-2/70 hover:bg-surface-2/50 md:rounded-full md:px-5';
  const fieldCls = 'w-full min-w-0 cursor-pointer appearance-none bg-transparent text-[0.9375rem] font-medium text-fg outline-none';

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Find talent"
      className={cn('glass flex flex-col gap-1 rounded-3xl p-2 shadow-float md:flex-row md:items-center md:rounded-full', className)}
    >
      <label className={cell}>
        <Sparkles className="size-4 shrink-0 text-primary-text" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.6875rem] font-semibold tracking-wide text-fg-muted uppercase">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls} aria-label="Category">
            <option value="">All talent</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </span>
      </label>
      <span aria-hidden className="hidden h-8 w-px bg-border md:block" />
      <label className={cell}>
        <MapPin className="size-4 shrink-0 text-primary-text" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.6875rem] font-semibold tracking-wide text-fg-muted uppercase">City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls} aria-label="City">
            <option value="">Any city</option>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </span>
      </label>
      <span aria-hidden className="hidden h-8 w-px bg-border md:block" />
      <label className={cell}>
        <CalendarDays className="size-4 shrink-0 text-primary-text" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.6875rem] font-semibold tracking-wide text-fg-muted uppercase">Date</span>
          <input type="date" min={todayIST()} value={date} onChange={(e) => setDate(e.target.value)} className={cn(fieldCls, '[color-scheme:inherit]', !date && 'text-fg-muted')} aria-label="Event date" />
        </span>
      </label>
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
