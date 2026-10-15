'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@repo/ui/lib/cn';
import { DURATION, EASE } from './tokens';

type Line = string | { text: string; className?: string; node?: ReactNode };

/**
 * Masked slide-up headline reveal by line, word or char.
 * Screen readers get the plain text once (aria-label); animated spans are aria-hidden.
 * Explicit lines (array) give art-directed breaks; `node` lets one line hold custom JSX.
 */
export function SplitText({
  lines,
  by = 'word',
  as: Tag = 'h1',
  className,
  lineClassName,
  delay = 0,
  stagger,
  trigger = 'view',
}: {
  lines: Line[];
  by?: 'line' | 'word' | 'char';
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  trigger?: 'mount' | 'view';
}) {
  const reduce = useReducedMotion();
  const normal = lines.map((l) => (typeof l === 'string' ? { text: l } : l));
  const label = normal.map((l) => l.text).join(' ');
  const step = stagger ?? (by === 'char' ? 0.018 : by === 'word' ? 0.06 : 0.12);

  if (reduce) {
    return (
      <Tag className={className}>
        {normal.map((l, i) => (
          <span key={i} className={cn('block', lineClassName, l.className)}>
            {l.node ?? l.text}
          </span>
        ))}
      </Tag>
    );
  }

  let index = 0;
  const unit = (content: ReactNode, key: string, extra?: string) => {
    const i = index++;
    return (
      <span key={key} className={cn('inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom', extra)}>
        <motion.span
          className="inline-block will-change-transform"
          variants={{
            hidden: { y: '110%', rotate: 4 },
            show: { y: '0%', rotate: 0, transition: { duration: DURATION.slower + 0.2, ease: EASE.out, delay: delay + i * step } },
          }}
        >
          {content}
        </motion.span>
      </span>
    );
  };

  const animateProps =
    trigger === 'mount'
      ? { initial: 'hidden', animate: 'show' }
      : { initial: 'hidden', whileInView: 'show', viewport: { once: true, amount: 0.4 } };

  const MotionTag = motion[Tag];
  return (
    <MotionTag className={className} aria-label={label} {...animateProps}>
      {normal.map((l, li) => (
        <span key={li} aria-hidden className={cn('block', lineClassName, l.className)}>
          {by === 'line' || l.node
            ? unit(l.node ?? l.text, `l${li}`)
            : l.text.split(' ').map((word, wi, arr) => (
                <Fragment key={`${li}-${wi}`}>
                  {by === 'word'
                    ? unit(word, `w${li}-${wi}`)
                    : <span className="inline-block whitespace-nowrap">{[...word].map((ch, ci) => unit(ch, `c${li}-${wi}-${ci}`))}</span>}
                  {wi < arr.length - 1 && ' '}
                </Fragment>
              ))}
        </span>
      ))}
    </MotionTag>
  );
}
