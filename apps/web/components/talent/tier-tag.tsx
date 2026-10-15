import { Crown, Sparkles } from 'lucide-react';
import type { Tier } from '@repo/schemas';

/** "Premium" (gold) and "Featured" (paid placement — clearly marked, design.md §6.1). */
export function TierTag({ tier, featured }: { tier: Tier; featured: boolean }) {
  return (
    <>
      {featured && (
        <span className="glass inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.6875rem] font-semibold text-fg">
          <Sparkles className="size-3 text-accent" aria-hidden /> Featured
        </span>
      )}
      {tier === 'PREMIUM' && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-1 text-[0.6875rem] font-bold text-black">
          <Crown className="size-3" aria-hidden /> Premium
        </span>
      )}
    </>
  );
}
