import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Плавно докручивает число от 0 до value за duration мс с ease-out.
 * Анимация запускается один раз при появлении элемента в области видимости
 * и повторно — при изменении value.
 */
export function AnimatedCounter({
  value,
  duration = 900,
  format = (n) => Math.round(n).toLocaleString("ru-RU"),
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);
  const elRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const el = elRef.current;
    const run = () => {
      const start = performance.now();
      const from = display;
      const to = value;
      let raf = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + (to - from) * eased);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    };

    if (startedRef.current) {
      return run();
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          run();
          io.disconnect();
        }
      });
    });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={elRef} className={className}>
      {format(display)}
    </span>
  );
}
