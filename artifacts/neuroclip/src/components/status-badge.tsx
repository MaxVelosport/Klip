import { Badge } from "@/components/ui/badge";

type Status = "draft" | "script_ready" | "images_ready" | "audio_ready" | "rendering" | "done" | "failed";

const statusConfig: Record<Status, { label: string; colorClass: string }> = {
  draft: { label: "Черновик", colorClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  script_ready: { label: "Сценарий готов", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  images_ready: { label: "Фото готовы", colorClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  audio_ready: { label: "Озвучка готова", colorClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  rendering: { label: "Рендеринг", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse" },
  done: { label: "Готово", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  failed: { label: "Ошибка", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as Status] || { label: status, colorClass: "bg-gray-100 text-gray-800" };
  return (
    <Badge variant="outline" className={`${config.colorClass} border-transparent font-medium`}>
      {config.label}
    </Badge>
  );
}
