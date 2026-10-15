'use client';

import { motion, useReducedMotion } from 'motion/react';

/** "404" in oversized outline type with a swinging spotlight. */
export function NotFoundArt() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative select-none">
      <motion.div
        className="absolute -top-24 left-1/2 h-[26rem] w-40 origin-top -translate-x-1/2 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--fg)_22%,transparent),transparent)] [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]"
        animate={reduce ? undefined : { rotate: [-14, 14, -14] }}
        transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
      />
      <p className="relative font-display text-[clamp(8rem,30vw,22rem)] leading-[0.8] font-black tracking-[-0.06em]">
        {['4', '0', '4'].map((d, i) => (
          <motion.span
            key={i}
            className={i === 1 ? 'text-gradient inline-block pr-[0.04em]' : 'text-outline inline-block'}
            initial={reduce ? false : { y: '60%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.08 }}
          >
            {d}
          </motion.span>
        ))}
      </p>
    </div>
  );
}
