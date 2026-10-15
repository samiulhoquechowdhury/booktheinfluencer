import type { ReactNode } from 'react';
import { Curtain } from '@/lib/motion';

/** Re-mounts per navigation → curtain wipe on route entry. */
export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <Curtain />
      {children}
    </>
  );
}
