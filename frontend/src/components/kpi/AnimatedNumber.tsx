import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';
import { useReducedMotionPref } from '@/lib/hooks/useReducedMotion';

interface Props {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}

/**
 * Spring-animated number. Falls back to instant render when the user prefers
 * reduced motion. Uses `formattedRef` to avoid re-rendering React on every
 * frame — only the textContent is updated.
 */
export function AnimatedNumber({ value, format, durationMs = 1100, className }: Props) {
  const reduce = useReducedMotionPref();
  const motion = useMotionValue(reduce ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    const controls = animate(motion, value, {
      duration: durationMs / 1000,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    force((n) => n + 1);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
