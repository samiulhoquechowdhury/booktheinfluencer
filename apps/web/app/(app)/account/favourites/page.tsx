'use client';

import Link from 'next/link';
import { Button } from '@repo/ui/button';
import { EmptyState } from '@repo/ui/empty-state';
import { TalentCard } from '@/components/talent/talent-card';
import { TalentCardSkeleton } from '@/components/talent/talent-card-skeleton';
import { ApiError } from '@/lib/api/client';
import { useFavourites } from '@/lib/api/hooks';
import { AnimatePresence, motion } from 'motion/react';

export default function FavouritesPage() {
  const q = useFavourites(true);
  return (
    <div className="pb-10">
      <p className="eyebrow">Shortlist</p>
      <h1 className="mt-2 mb-10 font-display text-display font-black">
        Favourites<span className="text-gradient">.</span>
      </h1>
      {q.isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <TalentCardSkeleton key={i} />)}</div>
      ) : q.isError ? (
        <EmptyState art="error" title="Couldn’t load favourites" description={q.error instanceof ApiError ? q.error.message : 'Please try again.'} action={<Button onClick={() => void q.refetch()}>Try again</Button>} />
      ) : !q.data?.length ? (
        <EmptyState art="heart" title="Nothing saved yet" description="Tap the heart on any profile to build a shortlist you can send in one brief." action={<Button asChild><Link href="/talent">Browse talent</Link></Button>} />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {q.data.map((t) => (
                <motion.li key={t.slug} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                  <TalentCard talent={t} sizes="(min-width: 1024px) 22vw, 46vw" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="mt-14 flex justify-center">
            <Button asChild size="lg">
              <Link href={`/enquire?talent=${q.data.slice(0, 5).map((t) => t.slug).join(',')}`}>Send one brief for {Math.min(5, q.data.length)} talents</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
