import type { Metadata } from 'next';
import { Accordion } from '@repo/ui/accordion';
import { PageIntro } from '@/components/content/page-intro';
import { GENERAL_FAQS } from '@/lib/content/faqs';
import { JsonLd } from '@/lib/seo/json-ld';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Fees, availability, payments, contracts and cancellations — answers about booking talent with us.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: GENERAL_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <PageIntro eyebrow="FAQ" title={<>Ask us <span className="font-serif font-normal normal-case italic">anything.</span></>} lead="If it isn’t here, your booking manager is a WhatsApp away." />
      <div className="shell pb-24">
        <Accordion items={GENERAL_FAQS} numbered />
      </div>
    </>
  );
}
