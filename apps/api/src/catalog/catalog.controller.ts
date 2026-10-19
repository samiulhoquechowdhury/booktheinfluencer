import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { TalentQuerySchema, type TalentQueryParsed } from '@repo/schemas';
import { z } from 'zod';
import { Public } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { CatalogService } from './catalog.service';

/** Query strings arrive as text; coerce numbers/booleans before the shared schema. */
const TalentQueryFromUrl = z.preprocess((raw) => {
  const q = { ...(raw as Record<string, unknown>) };
  for (const k of Object.keys(q)) if (q[k] === '') delete q[k];
  if (q.page) q.page = Number(q.page);
  if (q.pageSize) q.pageSize = Number(q.pageSize);
  q.verified = q.verified === 'true' ? true : undefined;
  return q;
}, TalentQuerySchema);

/** Public catalogue (trd §3 `catalog`). */
@Public()
@Controller()
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get('talents')
  list(@Query(new ZodPipe(TalentQueryFromUrl)) q: TalentQueryParsed) {
    return this.catalog.list(q);
  }

  // Declared before :slug so "featured" isn't read as a slug.
  @Get('talents/featured')
  async featured() {
    return { data: await this.catalog.featured() };
  }

  @Get('talents/:slug')
  async bySlug(@Param('slug') slug: string) {
    return { data: await this.catalog.bySlug(slug) };
  }

  @Get('talents/:slug/similar')
  async similar(@Param('slug') slug: string) {
    return { data: await this.catalog.similar(slug) };
  }

  @Get('categories')
  async categories() {
    return { data: await this.catalog.categories() };
  }
}
