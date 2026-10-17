'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { ArrowRight, BadgeCheck, FileSignature, Pause, Play, Send, Sparkles } from 'lucide-react';
import { cn } from '@repo/ui/lib/cn';
import { Magnetic, useReducedMotion } from '@/lib/motion';
import { BriefMock, EnjoyMock, QuoteMock, VerifyMock } from './step-mocks';

const STEPS = [
  { icon: Send, title: 'Share your brief', body: 'One short form: event, date, city and budget.', headline: ['Tell us', 'the plan.'], Mock: BriefMock },
  { icon: BadgeCheck, title: 'We check availability', body: 'Confirmed with the artist’s authorised team.', headline: ['Real answers,', 'not guesses.'], Mock: VerifyMock },
  { icon: FileSignature, title: 'Approve & sign', body: 'Itemised quote with GST. Accept and e-sign online.', headline: ['Every rupee,', 'itemised.'], Mock: QuoteMock },
  { icon: Sparkles, title: 'Enjoy the event', body: 'We run travel, rider and the day itself.', headline: ['Showtime.', 'We handle it.'], Mock: EnjoyMock },
] as const;

/** How long each step "plays" for, in ms. */
const STEP_MS = 5000;
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * How it works, modelled on product-video sections (Upwork, Linear): a large auto-playing stage
 * with a play/pause control, looping like a carousel, and a quiet row of steps beneath it that
 * tracks playback and seeks on click. Plays only while on screen; reduced motion starts paused.
 */
export function HowItWorks({ showFullProcessLink = true }: { showFullProcessLink?: boolean }) {
  const reduce = useReducedMotion();
  const player = useRef<HTMLDivElement>(null);
  const onScreen = useInView(player, { amount: 0.4 });
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0); // 0–1 within the current step
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (reduce) setPlaying(false);
  }, [reduce]);

  const running = playing && onScreen;

  // Progress lives in a ref so the frame loop can advance steps without nested state updates.
  const prog = useRef(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      prog.current += (now - last) / STEP_MS;
      last = now;
      if (prog.current >= 1) {
        // Loop like a carousel: after the last step, start again from the first.
        prog.current = 0;
        setProgress(0);
        setStep((step + 1) % STEPS.length);
        return; // effect re-runs for the new step
      }
      setProgress(prog.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, step]);

  const seek = (i: number) => {
    prog.current = 0;
    setStep(i);
    setProgress(0);
    setPlaying(true);
  };
  const toggle = () => setPlaying((p) => !p);

  const current = STEPS[step]!;
  const { Mock } = current;

  return (
    <section aria-labelledby="hiw-title" className="relative py-24 md:py-32">
      <div className="shell">
        <header className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">How it works</p>
          <h2 id="hiw-title" className="font-display text-display font-extrabold">
            Four steps. <span className="font-serif font-normal italic">Zero</span> guesswork.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-fg-muted">Watch a booking go from brief to show night.</p>
        </header>

        <div ref={player} className="mx-auto mt-12 max-w-5xl md:mt-16">
          {/* Stage */}
          <div className="relative isolate h-[36rem] overflow-hidden rounded-[2rem] bg-brand-gradient sm:aspect-[16/9] sm:h-auto">
            {/* Concentric rounded frames + light bloom, like a title card. */}
            <div aria-hidden className="absolute inset-0 -z-10">
              {[0, 1, 2, 3].map((r) => (
                <span key={r} className="absolute rounded-[3rem] border border-white/15" style={{ inset: `${8 + r * 7}%` }} />
              ))}
              <span className="absolute -top-1/4 left-1/2 size-[70%] -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />
              <span className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_80%)]" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pt-16 pb-8 sm:flex-row sm:justify-between sm:gap-10 sm:p-12 lg:p-16"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* Kinetic headline */}
                <p className="text-center font-display text-[clamp(2rem,1rem+4vw,4.25rem)] leading-[0.95] font-black tracking-[-0.04em] text-white sm:text-left">
                  {current.headline.map((line, i) => (
                    <span key={line} className="block overflow-hidden pb-[0.06em]">
                      <motion.span
                        className={cn('block', i === 1 && 'text-white/60')}
                        initial={reduce ? false : { y: '105%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.12 }}
                      >
                        {line}
                      </motion.span>
                    </span>
                  ))}
                </p>
                <motion.div
                  className="flex w-full max-w-sm justify-center [&>*]:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55)]"
                  initial={reduce ? false : { opacity: 0, y: 40, rotate: 2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
                >
                  <Mock active />
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Corner controls */}
            <div className="absolute top-4 right-4 sm:top-auto sm:right-5 sm:bottom-5">
              <button type="button" onClick={toggle} aria-label={running ? 'Pause' : 'Play'} className="grid size-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition-colors hover:bg-black/40">
                {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 translate-x-px" aria-hidden />}
              </button>
            </div>
          </div>

          {/* Steps, synced to playback */}
          <ol className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:mt-10 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border">
            {STEPS.map((s, i) => {
              const fill = i < step ? 1 : i === step ? progress : 0;
              const on = i === step;
              return (
                <li key={s.title} className="md:px-6 md:first:pl-0 md:last:pr-0">
                  <button type="button" onClick={() => seek(i)} aria-current={on ? 'step' : undefined} className="group block w-full text-left outline-none">
                    <span className="block h-0.5 overflow-hidden rounded-full bg-border">
                      <span className="block h-full origin-left bg-brand-gradient" style={{ transform: `scaleX(${fill})` }} />
                    </span>
                    <span className={cn('mt-5 block transition-opacity duration-(--duration-slow)', on ? 'opacity-100' : 'opacity-50 group-hover:opacity-80')}>
                      <s.icon className={cn('size-5', on ? 'text-primary-text' : 'text-fg')} aria-hidden />
                      <span className="mt-3 block text-lg font-semibold group-focus-visible:underline">{s.title}</span>
                      <span className="mt-1 block text-sm text-fg-muted">{s.body}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Banner */}
        <div className="relative mt-16 overflow-hidden rounded-3xl bg-brand-gradient p-8 text-primary-fg md:mt-20 md:p-12">
          <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-white/15 blur-3xl" />
          {/* Isometric cube pattern, fading in from the right. */}
          <div aria-hidden className="absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]" style={{ backgroundImage: CUBE_TILE, backgroundSize: '60px 104px' }} />
          {/* Floating 3D cubes */}
          {/* Phones: one cube tucked into the corner. Desktop: three in the gap between copy and buttons. */}
          <Cube size={44} className="-top-2 -right-2 opacity-70 md:top-[18%] md:right-[39%] md:opacity-100" duration={22} />
          <Cube size={30} className="right-[47%] bottom-[14%] hidden md:block" duration={16} reverse />
          <Cube size={20} className="top-[12%] right-[50%] hidden lg:block" duration={12} />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-h1 font-extrabold">Ready when you are.</p>
              <p className="mt-2 max-w-lg text-white/80">Send one brief. Your manager takes it from there, from availability to the final bow.</p>
            </div>
            <div className={cn('grid gap-3 sm:flex', showFullProcessLink && 'grid-cols-2')}>
              <Magnetic className="flex">
                <Link href="/enquire" className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold whitespace-nowrap text-black transition-transform active:scale-[0.97] sm:h-14 sm:px-7 sm:text-base">
                  Start a brief
                  <ArrowRight className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-1" aria-hidden />
                </Link>
              </Magnetic>
              {showFullProcessLink && (
                <Link href="/how-it-works" className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/10 sm:h-14 sm:px-7 sm:text-base">
                  <span className="sm:hidden">Full process</span>
                  <span className="hidden sm:inline">See the full process</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Seamless isometric cube tile (60×104): three shaded faces per cube, in translucent white. */
const CUBE = (x: number, y: number) =>
  `<g transform='translate(${x} ${y})' stroke='white' stroke-opacity='.22' stroke-width='.8'>` +
  `<path d='M30 0 60 17.32 30 34.64 0 17.32Z' fill='white' fill-opacity='.14'/>` +
  `<path d='M0 17.32 30 34.64 30 69.28 0 51.96Z' fill='white' fill-opacity='.05'/>` +
  `<path d='M30 34.64 60 17.32 60 51.96 30 69.28Z' fill='white' fill-opacity='.09'/></g>`;
const CUBE_TILE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='104'>${[[0, 0], [30, 52], [-30, 52], [30, -52], [-30, -52]].map(([x, y]) => CUBE(x!, y!)).join('')}</svg>`,
)}")`;

/** A slowly tumbling glass cube (CSS 3D). Static when reduced motion is on (global rule). */
function Cube({ size, className, duration, reverse }: { size: number; className?: string; duration: number; reverse?: boolean }) {
  const faces = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
  return (
    <div aria-hidden className={cn('pointer-events-none absolute [perspective:600px]', className)} style={{ width: size, height: size }}>
      <div
        className="relative size-full [transform-style:preserve-3d] motion-safe:animate-[cube-spin_var(--d)_linear_infinite]"
        style={{ '--d': `${duration}s`, animationDirection: reverse ? 'reverse' : undefined, transform: 'rotateX(-24deg) rotateY(36deg)' } as CSSProperties}
      >
        {faces.map((f) => (
          <span
            key={f}
            className="absolute inset-0 rounded-[10%] border border-white/50 bg-white/[0.12] shadow-[inset_0_0_18px_rgb(255_255_255/0.3)] [backface-visibility:visible]"
            style={{ transform: `${f} translateZ(${size / 2}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
