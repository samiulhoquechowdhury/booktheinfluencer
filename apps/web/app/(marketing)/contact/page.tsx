import type { Metadata } from 'next';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { ContactForm } from '@/components/content/contact-form';
import { PageIntro } from '@/components/content/page-intro';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = { title: 'Contact', description: 'Talk to a booking manager.', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="Contact" title={<>Say <span className="font-serif font-normal normal-case italic">hello.</span></>} lead="Booking questions, corporate accounts, or you’re an artist who wants to work with us — we reply within one working day." />
      <div className="shell grid gap-16 pb-24 lg:grid-cols-12">
        <div className="lg:col-span-7"><ContactForm /></div>
        <aside className="space-y-6 lg:col-span-4 lg:col-start-9">
          {[
            { icon: Phone, label: 'Call', value: BRAND.supportPhone, href: `tel:${BRAND.supportPhone.replace(/\s/g, '')}` },
            { icon: MessageCircle, label: 'WhatsApp', value: BRAND.supportPhone, href: `https://wa.me/${BRAND.whatsapp}` },
            { icon: Mail, label: 'Email', value: BRAND.email, href: `mailto:${BRAND.email}` },
          ].map((c) => (
            <a key={c.label} href={c.href} className="group flex items-center gap-4 rounded-2xl border border-border p-5 transition-colors hover:border-border-strong">
              <span className="grid size-12 place-items-center rounded-full bg-surface-2 transition-colors group-hover:bg-brand-gradient group-hover:text-primary-fg"><c.icon className="size-5" aria-hidden /></span>
              <span>
                <span className="block text-xs text-fg-muted">{c.label}</span>
                <span className="block font-semibold">{c.value}</span>
              </span>
            </a>
          ))}
          <p className="text-sm text-fg-muted">Mon–Sat, 10:00 AM – 7:00 PM IST. Event-day support for confirmed bookings around the clock.</p>
        </aside>
      </div>
    </>
  );
}
