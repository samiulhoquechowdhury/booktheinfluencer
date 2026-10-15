import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export function AppFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="shell flex flex-col gap-3 text-xs text-fg-subtle md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} {BRAND.name} · Need help? Call {BRAND.supportPhone}</p>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/legal/terms" className="hover:text-fg">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-fg">Privacy</Link>
          <Link href="/legal/cancellation" className="hover:text-fg">Cancellation</Link>
        </nav>
      </div>
    </footer>
  );
}
