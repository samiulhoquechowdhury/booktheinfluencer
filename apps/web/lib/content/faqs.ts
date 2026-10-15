export const HOME_FAQS = [
  {
    q: 'Can I book instantly?',
    a: 'No — and that’s on purpose. Premium talent shows “Check Availability”, others “Request to Book”. We verify the date with the authorised representative first, so you never pay for a slot that isn’t real.',
  },
  {
    q: 'Why do I see a fee range instead of a price?',
    a: 'Fees depend on date, city, set length, travel and production. Profiles show an indicative band; your quote shows the exact, itemised total including GST.',
  },
  {
    q: 'When is my booking actually confirmed?',
    a: 'Only when four things are true: you’ve accepted the quote, the contract is signed, the advance is paid and the representative has accepted. Your dashboard shows each step.',
  },
  {
    q: 'How do payments work?',
    a: 'Through a secure payment gateway (UPI, cards, net banking), usually as an advance and a balance. You get a receipt for every payment.',
  },
  {
    q: 'Do you handle travel, stay and the rider?',
    a: 'Yes. Travel, accommodation, local transport and production are line items in your quote, and your manager coordinates them before the event.',
  },
  {
    q: 'What if the talent isn’t available?',
    a: 'You’ll see “Not available on this date” — never a vague maybe. Your manager suggests verified alternatives that fit your brief and budget.',
  },
] as const;

export const GENERAL_FAQS = [
  ...HOME_FAQS,
  { q: 'Is there a fee for submitting a brief?', a: 'No. Submitting a brief is free and doesn’t commit you to anything.' },
  { q: 'Can I book for a corporate event with a GST invoice?', a: 'Yes. Add your company name and GSTIN in the brief; quotes and paperwork are GST-ready.' },
  { q: 'Can I cancel?', a: 'Cancellation terms are part of your contract and depend on how close to the event you cancel. See our cancellation policy for the general rules.' },
  { q: 'Do you represent these artists exclusively?', a: 'Not necessarily. Each profile shows whether bookings are talent-managed, agency-managed or platform-coordinated, and whether we have verified that representation.' },
] as const;
