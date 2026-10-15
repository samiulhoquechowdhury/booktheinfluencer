'use client';

import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import { useRichMotion } from './hooks';

/**
 * Decorative cursor companion (desktop only). It never hides the native cursor, so keyboard and
 * assistive-tech users are unaffected. Grows over links/buttons; shows a label from the nearest
 * [data-cursor="View"] element (e.g. talent cards).
 */
export function CursorFollower() {
  const rich = useRichMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });
  const [mode, setMode] = useState<{ kind: 'idle' | 'link' | 'label'; label?: string }>({ kind: 'idle' });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!rich) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const el = e.target instanceof Element ? e.target : null;
      const labelled = el?.closest<HTMLElement>('[data-cursor]');
      if (labelled) setMode({ kind: 'label', label: labelled.dataset.cursor });
      else if (el?.closest('a, button, [role="button"], label, select, summary')) setMode({ kind: 'link' });
      else setMode({ kind: 'idle' });
    };
    const leave = () => setVisible(false);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [rich, x, y]);

  if (!rich) return null;
  const size = mode.kind === 'label' ? 84 : mode.kind === 'link' ? 44 : 14;

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none fixed top-0 left-0 z-[90] ${mode.kind === 'label' ? '' : 'mix-blend-difference'}`}
      style={{ x: sx, y: sy }}
    >
      <motion.div
        className={`grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${mode.kind === 'label' ? 'bg-brand-gradient text-primary-fg shadow-float' : 'bg-white'}`}
        animate={{ width: size, height: size, opacity: visible ? (mode.kind === 'link' ? 0.9 : 1) : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <AnimatePresence>
          {mode.kind === 'label' && (
            <motion.span
              key={mode.label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="text-xs font-bold tracking-wide uppercase"
            >
              {mode.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
