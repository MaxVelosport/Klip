import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HelpTipProps {
  title: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Маленькая «?»-иконка с дружелюбной подсказкой.
 * Используем рядом с любым полем/кнопкой, где школьнику может быть непонятно.
 */
export function HelpTip({ title, children, className = "", size = "sm" }: HelpTipProps) {
  const dim = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Подсказка: ${title}`}
          className={`inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors rounded-full ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className={dim} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 text-sm leading-relaxed"
        side="top"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold mb-1.5 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-primary" />
          {title}
        </div>
        <div className="text-muted-foreground space-y-2">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
