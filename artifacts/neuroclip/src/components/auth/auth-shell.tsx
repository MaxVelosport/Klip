import { ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Film, Sparkles, Wand2, Clapperboard, Zap, Music4, Image as ImageIcon } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle: ReactNode;
  sideTitle: string;
  sideText: string;
}

const floatingIcons = [
  { Icon: Sparkles, x: "12%", y: "18%", delay: 0, size: 20 },
  { Icon: Wand2, x: "78%", y: "12%", delay: 0.4, size: 22 },
  { Icon: Clapperboard, x: "8%", y: "68%", delay: 0.8, size: 26 },
  { Icon: Zap, x: "82%", y: "62%", delay: 0.2, size: 18 },
  { Icon: Music4, x: "20%", y: "85%", delay: 0.6, size: 20 },
  { Icon: ImageIcon, x: "70%", y: "82%", delay: 1.0, size: 22 },
];

export function AuthShell({ children, title, subtitle, sideTitle, sideText }: AuthShellProps) {
  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full bg-fuchsia-500/15 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 w-[420px] h-[420px] rounded-full bg-sky-400/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto w-full max-w-sm"
        >
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-2xl text-primary mb-10 group">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <Film className="w-6 h-6" />
            </motion.div>
            <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
              НейроКлип
            </span>
          </Link>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          >
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-2 text-sm text-muted-foreground"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mt-8"
          >
            {children}
          </motion.div>
        </motion.div>
      </div>

      <div className="hidden lg:flex relative w-0 flex-1 items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-fuchsia-500/10 to-sky-400/10" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        {floatingIcons.map(({ Icon, x, y, delay, size }, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/70"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0.7],
              scale: [0.6, 1, 1.05, 1],
              y: [0, -14, 0],
            }}
            transition={{
              opacity: { duration: 0.8, delay },
              scale: { duration: 0.8, delay },
              y: { duration: 5 + i * 0.4, delay, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <div className="p-3 rounded-2xl bg-card/80 backdrop-blur-md border border-border/40 shadow-xl shadow-primary/10">
              <Icon style={{ width: size, height: size }} />
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="relative z-10 max-w-md text-center space-y-6"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4" />
            Видео из идеи за 30 минут
          </motion.div>

          <h3 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-fuchsia-500 bg-clip-text text-transparent leading-tight">
            {sideTitle}
          </h3>
          <p className="text-muted-foreground text-base leading-relaxed">{sideText}</p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="grid grid-cols-3 gap-3 pt-4"
          >
            {[
              { v: "30 мин", l: "на видео" },
              { v: "10×", l: "быстрее" },
              { v: "0 ₽", l: "на старте" },
            ].map((s, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4, scale: 1.03 }}
                className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-3 text-center shadow-sm"
              >
                <div className="text-lg font-bold text-foreground">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export function OauthDivider({ text = "Или через" }: { text?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-background px-3 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

export function VkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.785 16.241s.288-.032.435-.193c.135-.148.131-.425.131-.425s-.019-1.302.581-1.494c.591-.19 1.35 1.265 2.155 1.825.61.422 1.072.33 1.072.33l2.156-.03s1.128-.07.594-.962c-.044-.073-.312-.658-1.602-1.86-1.351-1.259-1.17-1.055.456-3.234 1-1.323 1.398-2.13 1.273-2.476-.118-.328-.844-.241-.844-.241l-2.426.015s-.18-.025-.314.056c-.13.078-.215.262-.215.262s-.387 1.034-.903 1.913c-1.087 1.855-1.521 1.953-1.7 1.836-.413-.27-.31-1.073-.31-1.643 0-1.78.27-2.521-.521-2.713-.262-.064-.456-.106-1.127-.113-.86-.009-1.589.003-2.001.205-.275.135-.487.435-.358.453.16.022.521.099.713.36.247.336.238 1.092.238 1.092s.142 2.082-.332 2.341c-.325.178-.772-.185-1.741-1.872-.497-.864-.872-1.819-.872-1.819s-.072-.177-.2-.272c-.155-.115-.371-.151-.371-.151l-2.305.015s-.346.01-.473.161c-.114.134-.009.412-.009.412s1.805 4.225 3.85 6.354c1.875 1.951 4.005 1.823 4.005 1.823z" />
    </svg>
  );
}

export function YandexIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#FC3F1D" />
      <path d="M13.32 18.5h2.06V5.6h-2.99c-3 0-4.6 1.55-4.6 3.85 0 1.83.87 2.91 2.42 4.02l-2.69 4.94v.09h2.21l3-5.51-1.04-.7c-1.27-.86-1.88-1.52-1.88-2.95 0-1.25.88-2.1 2.55-2.1h.96V18.5z" fill="#fff" />
    </svg>
  );
}
