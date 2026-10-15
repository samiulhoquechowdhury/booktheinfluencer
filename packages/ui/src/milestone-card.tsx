import { formatDate, formatDateTime } from '@repo/utils';
import type { CustomerMilestone } from '@repo/schemas';
import { CheckCircle2, Clock, AlertTriangle, CalendarClock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Money } from './money';
import { cn } from './lib/cn';

const STATUS = {
  PAID: { label: 'Paid', icon: CheckCircle2, cls: 'text-success' },
  DUE: { label: 'Due', icon: Clock, cls: 'text-warning' },
  OVERDUE: { label: 'Overdue', icon: AlertTriangle, cls: 'text-danger' },
  UPCOMING: { label: 'Upcoming', icon: CalendarClock, cls: 'text-fg-muted' },
} as const;

export function MilestoneCard({
  milestone,
  action,
  className,
}: {
  milestone: CustomerMilestone;
  action?: ReactNode;
  className?: string;
}) {
  const s = STATUS[milestone.status];
  const Icon = s.icon;
  return (
    <article className={cn('flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center', className)}>
      <div className="flex-1">
        <p className="text-sm font-medium text-fg-muted">{milestone.label}</p>
        <Money paise={milestone.amountPaise} className="mt-1 block font-display text-2xl font-extrabold tracking-tight" />
        <p className={cn('mt-2 inline-flex items-center gap-1.5 text-xs font-semibold', s.cls)}>
          <Icon className="size-3.5" aria-hidden />
          {s.label}
          <span className="font-normal text-fg-muted">
            {milestone.status === 'PAID' && milestone.paidAt
              ? `· ${formatDateTime(milestone.paidAt)}${milestone.receiptNo ? ` · ${milestone.receiptNo}` : ''}`
              : `· by ${formatDate(milestone.dueDate)}`}
          </span>
        </p>
      </div>
      {action}
    </article>
  );
}
