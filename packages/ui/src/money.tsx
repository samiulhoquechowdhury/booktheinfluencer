import { formatINR } from '@repo/utils';
import { cn } from './lib/cn';

/** The only way UI renders money: formatINR(paise) in tabular numerals. */
export function Money({ paise, className }: { paise: bigint; className?: string }) {
  return <span className={cn('tabular', className)}>{formatINR(paise)}</span>;
}
