import type { ReactNode } from 'react';
import { FadeIn } from '@/lib/motion';

export default function AppTemplate({ children }: { children: ReactNode }) {
  return <FadeIn>{children}</FadeIn>;
}
