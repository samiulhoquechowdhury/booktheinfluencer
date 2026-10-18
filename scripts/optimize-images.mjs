// Builds responsive WebP variants for self-hosted images (run: pnpm images:optimize).
// public/<dir>/<name>.<ext>  →  public/_img/<dir>/<name>-<width>.webp for each width in WIDTHS
// (never upscaled). lib/image-loader.ts maps next/image requests onto these files, so phones
// download a small WebP instead of the full original. Re-run after adding or replacing a photo;
// generate-mock.mjs runs it automatically.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keep in sync with VARIANT_WIDTHS in apps/web/lib/image-loader.ts. */
export const WIDTHS = [256, 384, 640, 960, 1280, 1600];
const DIRS = ['talent', 'banners', 'categories'];
const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/public');
const OUT = join(PUBLIC, '_img');

export function optimizeImages() {
  rmSync(OUT, { recursive: true, force: true });
  let files = 0;
  let before = 0;
  let after = 0;
  for (const dir of DIRS) {
    const src = join(PUBLIC, dir);
    if (!existsSync(src)) continue;
    mkdirSync(join(OUT, dir), { recursive: true });
    for (const file of readdirSync(src)) {
      // Only the web copies the site serves (originals/masters such as PNG uploads are skipped).
      if (!/\.jpe?g$/i.test(file)) continue;
      const input = join(src, file);
      const { name } = parse(file);
      before += statSync(input).size;
      files += 1;
      for (const w of WIDTHS) {
        const out = join(OUT, dir, `${name}-${w}.webp`);
        // `>` = only shrink; smaller originals keep their own size under every width name.
        const r = spawnSync('magick', [input, '-auto-orient', '-strip', '-resize', `${w}x>`, '-quality', '74', '-define', 'webp:method=6', out]);
        if (r.status !== 0) throw new Error(`magick failed on ${file}: ${r.stderr}`);
        if (w === 640) after += statSync(out).size;
      }
    }
  }
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`Images: ${files} files → ${WIDTHS.length} WebP sizes each (originals ${kb(before)}; 640px set ${kb(after)})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) optimizeImages();
