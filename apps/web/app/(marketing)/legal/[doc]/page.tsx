import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';

/** Placeholder legal copy — final text pending lawyer review (task.md T-007). */
const DOCS = {
  terms: {
    title: 'Terms of use',
    sections: [
      ['About these terms', `${BRAND.name} is a managed booking service. We coordinate bookings between customers and talent (or their authorised representatives). These placeholder terms will be replaced after legal review.`],
      ['Requests are not bookings', 'Submitting a brief or request does not reserve a date. A booking is confirmed only when the quote is accepted, the contract is signed, the advance is paid and the representative accepts.'],
      ['Fees', 'Fee bands on profiles are indicative. The final price is the total in your accepted quote, including itemised costs and taxes.'],
      ['Representation', 'Profiles state whether bookings are talent-managed, agency-managed or platform-coordinated. Listing a talent does not imply endorsement or exclusive representation.'],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['What we collect', 'Contact details and event information you provide in a brief, and payment confirmations from our gateway. We never store card details.'],
      ['Why we use it', 'To verify availability, prepare quotes and contracts, process payments and coordinate your event — and only with your consent for anything else.'],
      ['Your rights', 'You can ask for a copy of your data or ask us to delete it, in line with the Digital Personal Data Protection Act, 2023.'],
      ['Where it lives', 'Data is stored in India-region infrastructure. Documents are private and shared only via short-lived secure links.'],
    ],
  },
  cancellation: {
    title: 'Cancellation & refunds',
    sections: [
      ['Your contract decides', 'Cancellation terms are set out in each booking contract and depend on how close to the event you cancel.'],
      ['If the talent cancels', 'If a confirmed artist cannot perform, we offer a verified alternative or a refund of amounts paid for that booking, as per the contract.'],
      ['How refunds work', 'Refunds are processed to the original payment method. Timelines depend on your bank and the payment gateway.'],
    ],
  },
} as const;

type Doc = keyof typeof DOCS;
export const dynamicParams = false;
export const generateStaticParams = () => (Object.keys(DOCS) as Doc[]).map((doc) => ({ doc }));

type Props = { params: Promise<{ doc: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = DOCS[(await params).doc as Doc];
  return d ? { title: d.title, alternates: { canonical: `/legal/${(await params).doc}` } } : {};
}

export default async function LegalPage({ params }: Props) {
  const d = DOCS[(await params).doc as Doc];
  if (!d) notFound();
  return (
    <article className="shell max-w-3xl pt-36 pb-24 md:pt-44">
      <p className="eyebrow">Legal · Draft</p>
      <h1 className="mt-4 font-display text-h1 font-black">{d.title}</h1>
      <p className="mt-4 rounded-xl border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] px-4 py-3 text-sm">Placeholder text pending legal review. Not legal advice.</p>
      <div className="mt-12 space-y-10">
        {d.sections.map(([h, b], i) => (
          <section key={h}>
            <h2 className="font-display text-2xl font-extrabold"><span className="tabular mr-3 text-fg-subtle">{i + 1}.</span>{h}</h2>
            <p className="mt-3 leading-relaxed text-fg-muted">{b}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
