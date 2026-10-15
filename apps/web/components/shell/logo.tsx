import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { cn } from '@repo/ui/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${BRAND.name} — home`} className={cn('group inline-flex items-center gap-1.5', className)}>
      <span className="font-display text-xl font-black tracking-[-0.04em]">{BRAND.wordmark}</span>
      <span aria-hidden className="size-2 rounded-full bg-brand-gradient transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover:scale-150" />
    </Link>
  );
}
