import { Skeleton } from '@repo/ui/skeleton';
import { StepperProgress } from './stepper-progress';

/** Server-rendered first step of the brief while the stepper hydrates: the heading paints from HTML (LCP). */
export function EnquiryFallback() {
  return (
    <div className="mx-auto max-w-2xl" aria-hidden>
      <StepperProgress steps={['Event', 'Talent & budget', 'Contact']} current={0} />
      <div className="mt-10 space-y-5">
        <p className="mb-8 block">
          <span className="eyebrow">Step 1 of 3</span>
          <span className="mt-2 block font-display text-h1 font-extrabold">
            Tell us about the <span className="font-serif font-normal italic">event</span>
          </span>
        </p>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[3.625rem] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
