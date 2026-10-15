'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

export { useReducedMotion };

/** True only for precise pointers with hover (desktop mouse/trackpad). */
export function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return fine;
}

/** Rich motion = fine pointer AND no reduced-motion preference. */
export function useRichMotion() {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  return fine && !reduce;
}

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return match;
}
