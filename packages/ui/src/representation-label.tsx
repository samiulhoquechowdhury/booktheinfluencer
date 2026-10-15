import { REPRESENTATION_LABELS } from '@repo/utils';
import type { RepresentationType } from '@repo/schemas';
import { cn } from './lib/cn';

/** "Talent-managed" / "Agency-managed" / "Platform-coordinated" — exactly as the data says. */
export function RepresentationLabel({
  type,
  className,
}: {
  type: RepresentationType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide text-fg-muted',
        className,
      )}
    >
      {REPRESENTATION_LABELS[type]}
    </span>
  );
}
