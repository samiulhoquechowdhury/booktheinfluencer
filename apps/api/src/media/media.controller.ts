import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators';
import { NotFoundError } from '../common/errors';
import { MediaStorage } from './media.storage';

/** Public talent photos uploaded through onboarding (file names are random, so URLs aren't guessable). */
@Controller('media')
@Public()
export class MediaController {
  constructor(@Inject(MediaStorage) private readonly storage: MediaStorage) {}

  @Get(':file')
  file(@Param('file') name: string, @Res() res: Response) {
    const file = this.storage.fileFor(name);
    if (!file) throw new NotFoundError('Photo', name);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(file, (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Photo not found.' } });
    });
  }
}
