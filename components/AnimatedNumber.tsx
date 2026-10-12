"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/** Número que cuenta hacia arriba (o abajo) hasta el valor nuevo. */
export function AnimatedNumber({ value, format, duration = 0.9 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);
  return <span className="tabular">{format(display)}</span>;
}
