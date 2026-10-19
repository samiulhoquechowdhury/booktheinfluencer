import { z } from 'zod';
import { IsoDateSchema } from './common';
import { CitySlugSchema, EventTypeSchema, LanguageSchema } from './catalogue';

const today = () => new Date().toISOString().slice(0, 10);

export const EnquiryEventStepSchema = z
  .object({
    eventType: EventTypeSchema,
    date: IsoDateSchema.refine((d) => d >= today(), 'Pick a date from today onwards'),
    altDate: IsoDateSchema.optional().or(z.literal('')),
    city: CitySlugSchema,
    venue: z.string().trim().min(2, 'Add a venue or area').max(120),
    audienceSize: z.coerce
      .number({ message: 'Enter a number' })
      .int()
      .min(10, 'At least 10 guests')
      .max(200_000),
    durationMins: z.coerce.number().int().min(15).max(600),
  })
  .refine((v) => !v.altDate || v.altDate !== v.date, {
    path: ['altDate'],
    message: 'Alternate date must differ from the main date',
  });

export const EnquiryTalentStepSchema = z
  .object({
    talentSlugs: z.array(z.string()).max(5, 'Up to 5 talents per brief'),
    /** Budget range in whole rupees (form-friendly); converted to paise on submit. */
    budgetMinRupees: z.number().int().min(0),
    budgetMaxRupees: z.number().int().min(0),
    language: LanguageSchema.optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal('')),
  })
  .refine((v) => v.budgetMaxRupees > v.budgetMinRupees, {
    path: ['budgetMaxRupees'],
    message: 'Max budget must be above min',
  });

export const IndianMobileSchema = z
  .string()
  .trim()
  .transform((s) => {
    // Strip a country code / trunk zero only when it's extra: 9123456789 is a valid 10-digit number.
    const d = s.replace(/[\s-]/g, '');
    if (/^\+91\d{10}$/.test(d)) return d.slice(3);
    if (/^91\d{10}$/.test(d)) return d.slice(2);
    if (/^0\d{10}$/.test(d)) return d.slice(1);
    return d;
  })
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'));

export const GstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'GSTIN looks invalid (15 characters)');

export const EnquiryContactStepSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: IndianMobileSchema,
  email: z.string().trim().email('Enter a valid email'),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  gstin: GstinSchema.optional().or(z.literal('')),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  consent: z.literal(true, { message: 'Please accept to continue' }),
});

export const EnquirySchema = z.object({
  event: EnquiryEventStepSchema,
  talent: EnquiryTalentStepSchema,
  contact: EnquiryContactStepSchema,
});
export type EnquiryInput = z.input<typeof EnquirySchema>;
export type Enquiry = z.infer<typeof EnquirySchema>;

export const EnquiryResultSchema = z.object({
  ref: z.string(),
  bookingRefs: z.array(z.string()),
  expectedResponseHours: z.number().int().positive(),
});
export type EnquiryResult = z.infer<typeof EnquiryResultSchema>;

export const OtpRequestSchema = z.object({ phone: IndianMobileSchema });

export const ContactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email'),
  phone: IndianMobileSchema.optional().or(z.literal('')),
  topic: z.enum(['booking', 'corporate', 'talent', 'other']),
  message: z.string().trim().min(10, 'A little more detail please (10+ characters)').max(2000),
});
export type ContactMessage = z.infer<typeof ContactMessageSchema>;
