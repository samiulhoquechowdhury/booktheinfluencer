import type { ReactNode } from 'react';
import { FadeIn } from '@/lib/motion';

/** Re-mounts per navigation → gentle fade on route entry. */
export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return <FadeIn>{children}</FadeIn>;
}
