import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Step {
  id: number;
  name: string;
}

interface WizardMobileStepperProps {
  steps: Step[];
  currentStep: number;
  maxReachedStep?: number;
  onStepClick?: (id: number) => void;
}

/**
 * Компактный горизонтальный степпер для мобильных (md:hidden).
 * Показывает: название текущего шага, прогресс-бар, маленькие кружки 1..N.
 */
export function WizardMobileStepper({
  steps,
  currentStep,
  maxReachedStep,
  onStepClick,
}: WizardMobileStepperProps) {
  const total = steps.length;
  const progressPercent = ((currentStep - 1) / (total - 1)) * 100;
  const current = steps.find((s) => s.id === currentStep);

  return (
    <div className="md:hidden sticky top-0 z-30 bg-background/85 backdrop-blur border-b px-4 py-3">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">
          Шаг <span className="font-semibold text-foreground">{currentStep}</span> из {total}
        </span>
        <span className="font-semibold text-foreground">{current?.name}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-fuchsia-600"
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
        />
      </div>
      <div className="flex items-center justify-between">
        {steps.map((s) => {
          const completed = currentStep > s.id;
          const active = currentStep === s.id;
          const reachable = (maxReachedStep ?? currentStep) >= s.id;
          const clickable = !!onStepClick && reachable && !active;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(s.id)}
              className={`flex flex-col items-center gap-1 ${clickable ? "cursor-pointer" : "cursor-default"}`}
              aria-label={`Шаг ${s.id}: ${s.name}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 transition-all ${
                  completed
                    ? "bg-primary text-primary-foreground border-primary"
                    : active
                      ? "bg-background text-primary border-primary scale-110"
                      : "bg-muted text-muted-foreground border-transparent"
                }`}
              >
                {completed ? <Check className="w-3.5 h-3.5" /> : s.id}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
