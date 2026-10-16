'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@repo/ui/lib/use-reduced-motion';
import { Button } from '@repo/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--danger)_25%,transparent),transparent_60%)]" />
      <div className="relative max-w-lg text-center">
        <motion.p
          aria-hidden
          className="font-display text-[clamp(5rem,18vw,12rem)] leading-none font-black tracking-[-0.06em]"
          animate={reduce ? undefined : { x: [0, -4, 4, -2, 0], opacity: [1, 0.7, 1, 0.85, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.4 }}
        >
          <span className="text-outline">Mic</span> <span className="text-gradient">drop.</span>
        </motion.p>
        <h1 className="mt-6 font-display text-h2 font-extrabold">Something went wrong on our side.</h1>
        <p className="mt-3 text-fg-muted">It’s not you. Try again, and if it keeps happening, your manager can help.</p>
        {error.digest && <p className="tabular mt-2 text-xs text-fg-subtle">Error ref: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}><RotateCcw aria-hidden /> Try again</Button>
          <Button asChild size="lg" variant="outline"><Link href="/">Back home</Link></Button>
        </div>
      </div>
    </main>
  );
}
