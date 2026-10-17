'use client';

import { ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cn } from '@repo/ui/lib/cn';

/** Single-field search: free text → /talent?q=… (empty search opens the full roster). */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/talent?q=${encodeURIComponent(term)}` : '/talent');
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Find talent"
      className={cn(
        'group/sb flex w-full items-center gap-2 rounded-full border border-border bg-bg-elevated p-1.5 pl-5 shadow-float transition-[border-color,box-shadow] duration-(--duration-base) focus-within:border-primary-text focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_18%,transparent)]',
        className,
      )}
    >
      <Search className="size-5 shrink-0 text-fg-muted transition-colors group-focus-within/sb:text-primary-text" aria-hidden />
      <label htmlFor="hero-search" className="sr-only">Search talent</label>
      <input
        id="hero-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search actors, singers, creators…"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
        className="h-12 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label="Search"
        className="group/go relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient text-primary-fg shadow-[0_10px_28px_-12px_var(--glow-1)] transition-[transform,box-shadow] duration-(--duration-base) ease-(--ease-out-expo) hover:scale-105 hover:shadow-[0_14px_34px_-10px_var(--glow-1)] active:scale-95"
      >
        {/* Arrow exits right while a twin slides in from the left. */}
        <ArrowRight className="size-5 transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/go:translate-x-[180%] group-focus-visible/go:translate-x-[180%]" aria-hidden />
        <ArrowRight className="absolute size-5 -translate-x-[180%] transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/go:translate-x-0 group-focus-visible/go:translate-x-0" aria-hidden />
      </button>
    </form>
  );
}
