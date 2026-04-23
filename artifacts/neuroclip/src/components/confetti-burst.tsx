import { useEffect, useState } from "react";

interface ConfettiBurstProps {
  /** Если true — запустить сразу. */
  trigger?: boolean;
  /** Сколько конфетти. */
  count?: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "#f59e0b",
  "#ec4899",
  "#10b981",
];

/**
 * Лёгкий салют — конфетти-частицы, падающие сверху по всей ширине вьюпорта.
 * Чисто-CSS, без зависимостей. Сам себя удаляет через 3.5 с.
 */
export function ConfettiBurst({ trigger = true, count = 80 }: ConfettiBurstProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 3600);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;

  const pieces = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const duration = 2.6 + Math.random() * 1.4;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const rotate = Math.random() * 360;
    const w = 6 + Math.random() * 8;
    const h = 8 + Math.random() * 10;
    return (
      <span
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          background: color,
          width: w,
          height: h,
          transform: `rotate(${rotate}deg)`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          borderRadius: i % 3 === 0 ? "50%" : "2px",
        }}
      />
    );
  });

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden" aria-hidden>
      {pieces}
    </div>
  );
}
