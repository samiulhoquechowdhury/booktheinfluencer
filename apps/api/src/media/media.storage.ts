import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../common/errors';
import { ENV, type Env } from '../config/env';

const FILE = /^[0-9a-f-]{36}\.jpg$/;
const MAX_BYTES = 2_500_000;

/** Local disk storage for talent photos. Keys look like `/media/<uuid>.jpg` (what TalentMedia.key stores). */
@Injectable()
export class MediaStorage {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private get dir() {
    return path.resolve(this.env.MEDIA_DIR);
  }

  /** Absolute path for a served file name, or null if the name isn't one we issue. */
  fileFor(name: string) {
    return FILE.test(name) ? path.join(this.dir, name) : null;
  }

  /** Stores a JPEG data URL; checks the bytes really are a JPEG. */
  async saveJpeg(dataUrl: string) {
    const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    if (bytes.length > MAX_BYTES) throw new DomainError('PHOTO_TOO_LARGE', 'That photo is too large. Use one under 2.5 MB.', 413);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new DomainError('NOT_A_PHOTO', 'Upload a JPEG, PNG or WebP photo.', 400);
    const name = `${randomUUID()}.jpg`;
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, name), bytes);
    return `/media/${name}`;
  }

  /** Removes a stored file by key; ignores keys that aren't ours (seeded photos live in the web app). */
  async remove(key: string) {
    const file = key.startsWith('/media/') ? this.fileFor(key.slice('/media/'.length)) : null;
    if (file) await rm(file, { force: true });
  }
}
