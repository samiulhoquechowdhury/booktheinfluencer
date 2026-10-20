import type { TalentPage } from '@repo/schemas';
import { TalentCard } from '@/components/talent/talent-card';

/**
 * Server-rendered stand-in for <ListingView> while it waits for the URL's search params (it bails out of
 * static rendering). Same layout and the real first page of cards, so the HTML carries every profile link
 * (SEO) and nothing jumps when the interactive view takes over (CLS).
 */
export function ListingFallback({ initial }: { initial: TalentPage }) {
  return (
    <div className="shell pb-24">
      <div className="grid gap-10 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] xl:gap-14">
        <aside aria-hidden className="hidden lg:block">
          <div className="glass sticky top-24 h-[calc(100dvh-7rem)] rounded-2xl" />
        </aside>
        <section aria-labelledby="results-heading-static">
          <div className="glass -mx-4 mb-6 flex h-[4.25rem] items-center border-x-0 px-4 md:-mx-8 md:px-8 lg:mx-0 lg:h-11 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <p id="results-heading-static" className="tabular hidden text-sm text-fg-muted lg:block">
              {initial.total} {initial.total === 1 ? 'act' : 'acts'} match
            </p>
          </div>
          <div className="mb-6" />
          <ul className="grid grid-cols-1 gap-x-3 gap-y-8 min-[400px]:grid-cols-2 sm:gap-x-4 md:grid-cols-3 md:gap-x-6 md:gap-y-10 2xl:grid-cols-4">
            {initial.items.map((t) => (
              <li key={t.slug}>
                <TalentCard talent={t} sizes="(min-width: 1440px) 240px, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 47vw" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
