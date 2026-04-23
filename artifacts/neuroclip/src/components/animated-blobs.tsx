interface AnimatedBlobsProps {
  className?: string;
  variant?: "primary" | "soft" | "warm";
}

/**
 * Декоративный фон с тремя плавающими цветными «блобами».
 * Не перехватывает клики, безопасен для размещения в hero-блоках.
 */
export function AnimatedBlobs({ className = "", variant = "primary" }: AnimatedBlobsProps) {
  const palette =
    variant === "warm"
      ? ["bg-orange-500/40", "bg-pink-500/40", "bg-amber-400/40"]
      : variant === "soft"
        ? ["bg-primary/25", "bg-chart-2/25", "bg-chart-3/25"]
        : ["bg-primary/45", "bg-chart-2/45", "bg-fuchsia-500/40"];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      <div className={`blob blob-slow ${palette[0]}`} style={{ width: 380, height: 380, top: "-10%", left: "-8%" }} />
      <div className={`blob ${palette[1]}`} style={{ width: 320, height: 320, top: "30%", right: "-10%", animationDelay: "-4s" }} />
      <div className={`blob blob-fast ${palette[2]}`} style={{ width: 260, height: 260, bottom: "-15%", left: "30%", animationDelay: "-9s" }} />
    </div>
  );
}
