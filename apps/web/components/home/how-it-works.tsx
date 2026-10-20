'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { BadgeCheck, FileSignature, Pause, Play, Send, Sparkles } from 'lucide-react';
import { cn } from '@repo/ui/lib/cn';
import { useReducedMotion } from '@/lib/motion';
import { CtaBanner } from '@/components/content/cta-banner';
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
export function HowItWorks({ showFullProcessLink = true, showHeading = true }: { showFullProcessLink?: boolean; showHeading?: boolean }) {
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
        {showHeading && (
          <header className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">How it works</p>
            <h2 id="hiw-title" className="font-display text-display font-extrabold">
              Four steps. <span className="font-serif font-normal italic">Zero</span> guesswork.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-fg/80">Watch a booking go from brief to show night.</p>
          </header>
        )}

        <div ref={player} className={cn('mx-auto max-w-5xl', showHeading && 'mt-12 md:mt-16')}>
          {/* Stage */}
          <div className="relative isolate h-[36rem] overflow-hidden rounded-[2rem] bg-brand-gradient sm:h-[34rem] md:aspect-[16/10] md:h-auto lg:aspect-video">
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
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pt-16 pb-8 md:flex-row md:justify-between md:gap-8 md:p-10 lg:gap-10 lg:p-16"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* Kinetic headline */}
                <p className="text-center font-display text-[clamp(2rem,1rem+4vw,4.25rem)] leading-[0.95] font-black tracking-[-0.04em] text-white md:text-left">
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
            <div className="absolute top-4 right-4 md:top-auto md:right-5 md:bottom-5">
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
                    <span className="mt-5 block">
                      <s.icon className={cn('size-5 transition-opacity duration-(--duration-slow)', on ? 'text-primary-text' : 'text-fg opacity-50 group-hover:opacity-80')} aria-hidden />
                      <span className={cn('mt-3 block text-lg font-semibold transition-colors duration-(--duration-slow) group-focus-visible:underline', on ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>{s.title}</span>
                      <span className="mt-1 block text-sm text-fg-muted">{s.body}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <CtaBanner
          className="mt-16 md:mt-20"
          title="Ready when you are."
          body="Send one brief. Your manager takes it from there, from availability to the final bow."
          primary={{ href: '/enquire', label: 'Start a brief' }}
          secondary={showFullProcessLink ? { href: '/how-it-works', label: 'See the full process', shortLabel: 'Full process' } : undefined}
        />
      </div>
    </section>
  );
}
