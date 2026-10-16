import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { cn } from '@repo/ui/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${BRAND.name} — home`} className={cn('group inline-flex min-w-0 items-center gap-1.5', className)}>
      <span className="truncate font-display text-[0.9375rem] font-black tracking-[-0.04em] min-[360px]:text-[1.0625rem] min-[400px]:text-xl">{BRAND.wordmark}</span>
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-gradient transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover:scale-150" />
    </Link>
  );
}
