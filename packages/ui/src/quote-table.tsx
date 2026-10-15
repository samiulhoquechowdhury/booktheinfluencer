import type { CustomerQuote } from '@repo/schemas';
import { formatDate, LINE_ITEM_LABELS } from '@repo/utils';
import type { ReactNode } from 'react';
import { Money } from './money';
import { cn } from './lib/cn';

/** Customer quote: selling amounts only (QUO-2). Total can be replaced by an animated slot. */
export function QuoteTable({
  quote,
  totalSlot,
  className,
}: {
  quote: CustomerQuote;
  totalSlot?: ReactNode;
  className?: string;
}) {
  const gstPct = (quote.gstBps / 100).toString();
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border', className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Quote version {quote.version} line items</caption>
        <thead className="bg-surface text-left text-xs text-fg-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium sm:px-5">Item</th>
            <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {quote.lineItems.map((li) => (
            <tr key={li.id}>
              <td className="px-4 py-3 sm:px-5">
                <span className="block font-medium text-fg">{LINE_ITEM_LABELS[li.type]}</span>
                <span className="block text-xs text-fg-muted">{li.description}</span>
              </td>
              <td className="px-4 py-3 text-right align-top sm:px-5">
                <Money paise={li.amountPaise} className="font-medium" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border bg-surface/60">
          <tr>
            <th scope="row" className="px-4 pt-3 text-left font-normal text-fg-muted sm:px-5">Subtotal</th>
            <td className="px-4 pt-3 text-right sm:px-5"><Money paise={quote.subtotalPaise} /></td>
          </tr>
          <tr>
            <th scope="row" className="px-4 pt-1.5 pb-3 text-left font-normal text-fg-muted sm:px-5">GST ({gstPct}%)</th>
            <td className="px-4 pt-1.5 pb-3 text-right sm:px-5"><Money paise={quote.taxPaise} /></td>
          </tr>
          <tr className="border-t border-border">
            <th scope="row" className="px-4 py-4 text-left text-base font-semibold sm:px-5">Total payable</th>
            <td className="px-4 py-4 text-right font-display text-2xl font-extrabold tracking-tight sm:px-5">
              {totalSlot ?? <Money paise={quote.totalPaise} />}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="border-t border-border px-4 py-4 sm:px-5">
        <p className="eyebrow mb-3">Payment schedule</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {quote.milestones.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium">{m.label} · {m.percentBps / 100}%</span>
                <span className="block text-xs text-fg-muted">Due {formatDate(m.dueDate)}</span>
              </span>
              <Money paise={m.amountPaise} className="text-sm font-semibold" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
