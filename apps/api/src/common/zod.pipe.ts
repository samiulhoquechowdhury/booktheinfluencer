import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates and parses a request part with a shared Zod schema (packages/schemas), e.g.
 * `@Body(new ZodPipe(EnquirySchema)) body: Enquiry`. Failures become VALIDATION_FAILED via the
 * global filter.
 */
export class ZodPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    return this.schema.parse(value);
  }
}
