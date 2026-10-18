import { Accordion } from '@repo/ui/accordion';
import { SectionHeading } from '@repo/ui/section-heading';
import { HOME_FAQS } from '@/lib/content/faqs';

export function FaqSection() {
  return (
    <section aria-labelledby="faq-title" className="py-24 md:py-36">
      <div className="shell grid gap-12 lg:grid-cols-12">
        <SectionHeading
          eyebrow="FAQ"
          title={<span id="faq-title">Good <span className="font-serif font-normal italic">questions.</span></span>}
          className="lg:col-span-4"
        />
        <Accordion items={HOME_FAQS} numbered className="lg:col-span-8" />
      </div>
    </section>
  );
}
