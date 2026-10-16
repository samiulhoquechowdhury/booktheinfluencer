'use client';

import { NavigationMenu } from 'radix-ui';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';
import { CITIES } from '@/lib/reference';
import type { NavData } from './nav-types';

/** "Talent" mega panel: categories with imagery, featured act, cities, next steps. */
export function TalentMegaMenu({ nav }: { nav: NavData }) {
  return (
    <div className="grid w-[min(880px,calc(100vw-3rem))] grid-cols-[1.35fr_1fr] gap-2 p-2">
      <div className="rounded-2xl p-2">
        <p className="px-3 pt-2 pb-3 text-[0.6875rem] font-semibold tracking-wide text-fg-subtle uppercase">Browse by category</p>
        <ul className="grid gap-0.5">
          {nav.categories.map((c, i) => (
            <li key={c.slug}>
              <NavigationMenu.Link asChild>
                <Link href={`/talent/${c.slug}`} className="group/cat flex items-center gap-4 rounded-xl p-2 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2">
                  <span className="duotone relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-3">
                    {c.image.src && (
                      <Image src={c.image.src} alt="" fill sizes="56px" quality={60} placeholder={c.image.blurDataURL ? 'blur' : 'empty'} blurDataURL={c.image.blurDataURL} className="object-cover transition-transform duration-500 group-hover/cat:scale-110" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="tabular text-[0.6875rem] font-bold text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-display text-lg font-extrabold tracking-tight">{c.name}</span>
                    </span>
                    <span className="block truncate text-xs text-fg-muted">{c.blurb}</span>
                  </span>
                  <span className="tabular shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-semibold text-fg-muted transition-colors group-hover/cat:bg-bg">{c.count}</span>
                  <ArrowRight className="size-4 shrink-0 -translate-x-1 text-fg-muted opacity-0 transition-[opacity,transform] duration-(--duration-base) group-hover/cat:translate-x-0 group-hover/cat:opacity-100" aria-hidden />
                </Link>
              </NavigationMenu.Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        {nav.featured && (
          <NavigationMenu.Link asChild>
            <Link href={`/t/${nav.featured.slug}`} className="group/feat relative isolate flex min-h-56 flex-1 flex-col justify-end overflow-hidden rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Image src={nav.featured.image.src} alt={nav.featured.image.alt} fill sizes="340px" placeholder={nav.featured.image.blurDataURL ? 'blur' : 'empty'} blurDataURL={nav.featured.image.blurDataURL} className="-z-20 object-cover transition-transform duration-700 group-hover/feat:scale-105" />
              <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <span className="glass absolute top-4 left-4 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold text-white">Featured</span>
              <span className="text-xs font-medium text-white/70">{nav.featured.role} · {nav.featured.city}</span>
              <span className="mt-1 flex items-center justify-between gap-3 font-display text-2xl font-extrabold tracking-tight text-white">
                {nav.featured.name}
                <span className="grid size-9 place-items-center rounded-full bg-white text-black transition-transform duration-(--duration-slow) group-hover/feat:rotate-45">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </span>
            </Link>
          </NavigationMenu.Link>
        )}
        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-wide text-fg-subtle uppercase">
            <MapPin className="size-3" aria-hidden /> By city
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {CITIES.map((c) => (
              <li key={c.slug}>
                <NavigationMenu.Link asChild>
                  <Link href={`/talent?city=${c.slug}`} className="block rounded-full border border-border px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors outline-none hover:border-border-strong hover:bg-bg hover:text-fg focus-visible:border-primary-text">
                    {c.name}
                  </Link>
                </NavigationMenu.Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-4 rounded-2xl bg-surface px-5 py-3.5">
        <NavigationMenu.Link asChild>
          <Link href="/talent" className="group/all inline-flex items-center gap-2 text-sm font-semibold outline-none hover:text-primary-text focus-visible:underline">
            All {nav.total} verified acts <ArrowRight className="size-4 transition-transform group-hover/all:translate-x-0.5" aria-hidden />
          </Link>
        </NavigationMenu.Link>
        <p className="text-sm text-fg-muted">
          Not sure who fits?{' '}
          <NavigationMenu.Link asChild>
            <Link href="/enquire" className="font-semibold text-fg underline-offset-4 outline-none hover:underline focus-visible:underline">Plan with an expert</Link>
          </NavigationMenu.Link>
        </p>
      </div>
    </div>
  );
}
