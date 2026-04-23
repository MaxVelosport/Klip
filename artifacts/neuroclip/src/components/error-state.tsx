import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}

/**
 * Дружелюбный экран ошибки с кнопками «Попробовать снова» и «На главную».
 * Используется вместо плоского красного текста при провале загрузки.
 */
export function ErrorState({
  title = "Не удалось загрузить данные",
  description = "Что-то пошло не так. Проверьте подключение и попробуйте ещё раз.",
  onRetry,
  retryLabel = "Попробовать снова",
  homeHref = "/app/dashboard",
  homeLabel = "На дашборд",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-destructive/20 bg-destructive/5 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-5">{description}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" /> {retryLabel}
          </Button>
        )}
        {homeHref && (
          <Link href={homeHref}>
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" /> {homeLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
