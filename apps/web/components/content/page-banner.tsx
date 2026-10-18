import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export type PageBannerProps = {
  title: string;
  cta: { href: string; label: string };
  /** Pastel background and the disc colour behind the portrait. */
  tint: string;
  disc: string;
  /** Soft accent circle peeking from the top right. */
  accent: string;
  image?: { src: string; blurDataURL?: string };
  chips: { icon: LucideIcon; label: string }[];
};

/**
 * Hand-built banner in the same shape as the talent-page artwork banners (navbar width, a quarter
 * of the viewport tall): copy and button on the left; portrait in a coloured disc with rings and
 * floating chips on the right.
 */
export function PageBanner({ title, cta, tint, disc, accent, image, chips }: PageBannerProps) {
  return (
    <div className="relative isolate h-[25vh] max-h-72 min-h-44 overflow-hidden rounded-3xl border border-black/5 shadow-card" style={{ backgroundColor: tint }}>
      {/* Decorative shapes */}
      <span aria-hidden className="absolute -top-[45%] right-[14%] -z-10 aspect-square h-[85%] rounded-full opacity-70" style={{ backgroundColor: accent }} />
      <span aria-hidden className="absolute -bottom-[55%] -left-[6%] -z-10 aspect-square h-[90%] rounded-full opacity-40" style={{ backgroundColor: accent }} />
      <span aria-hidden className="absolute bottom-4 left-[42%] -z-10 hidden grid-cols-5 gap-1.5 opacity-50 sm:grid">
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} className="size-1 rounded-full" style={{ backgroundColor: disc }} />
        ))}
      </span>

      {/* Portrait */}
      <div aria-hidden className="absolute inset-y-0 right-0 w-[46%] sm:w-[40%]">
        <span className="absolute top-1/2 right-[8%] aspect-square h-[104%] -translate-y-1/2 rounded-full border-2 border-dashed opacity-40" style={{ borderColor: disc }} />
        <span className="absolute top-1/2 right-[12%] aspect-square h-[86%] -translate-y-1/2 rounded-full" style={{ backgroundColor: disc }} />
        <span className="absolute top-1/2 right-[14%] aspect-square h-[80%] -translate-y-1/2 overflow-hidden rounded-full ring-4 ring-white/60">
          {image && (
            <Image src={image.src} alt="" fill sizes="(min-width: 768px) 260px, 45vw" placeholder={image.blurDataURL ? 'blur' : 'empty'} blurDataURL={image.blurDataURL} priority className="object-cover" />
          )}
        </span>
        {/* Floating chips (hidden on small phones) */}
        {chips.slice(0, 2).map((c, i) => (
          <span
            key={c.label}
            className={`absolute hidden items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#16121f] shadow-[0_8px_20px_-10px_rgb(0_0_0/0.35)] backdrop-blur sm:inline-flex ${i === 0 ? 'top-[14%] left-[-6%]' : 'right-[2%] bottom-[12%]'} motion-safe:animate-[float_6s_ease-in-out_infinite]`}
            style={{ animationDelay: `${i * 1.5}s` }}
          >
            <c.icon className="size-3.5" style={{ color: disc }} />
            {c.label}
          </span>
        ))}
      </div>

      {/* Copy */}
      <div className="relative flex h-full max-w-[56%] flex-col justify-center gap-3 p-5 sm:max-w-[55%] sm:gap-4 sm:p-8 lg:p-10">
        <p className="font-display text-xl leading-[1.05] font-black tracking-[-0.02em] text-[#16121f] sm:text-3xl lg:text-4xl">{title}</p>
        <Link
          href={cta.href}
          className="group inline-flex w-fit items-center gap-2 rounded-full bg-[#16121f] px-4 py-2 text-xs font-semibold text-white transition-[transform,background-color] duration-(--duration-base) hover:-translate-y-0.5 hover:bg-[#2c2340] sm:px-5 sm:py-2.5 sm:text-sm"
        >
          {cta.label}
          <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
