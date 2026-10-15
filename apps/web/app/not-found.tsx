import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@repo/ui/button';
import { SiteHeader } from '@/components/shell/site-header';
import { NotFoundArt } from '@/components/shell/not-found-art';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative grid min-h-dvh place-items-center overflow-hidden px-4 pt-20">
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_60%)]" />
        <div className="relative text-center">
          <NotFoundArt />
          <h1 className="mt-6 font-display text-h1 font-black">This stage is empty.</h1>
          <p className="mx-auto mt-3 max-w-md text-fg-muted">The page you’re after has left the building — or never had a soundcheck. Let’s get you back to the show.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href="/"><ArrowLeft aria-hidden /> Back home</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/talent"><Search aria-hidden /> Browse talent</Link></Button>
          </div>
        </div>
      </main>
    </>
  );
}
