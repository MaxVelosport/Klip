import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDateRu(isoString: string): string {
  return format(new Date(isoString), "d MMMM yyyy, HH:mm", { locale: ru });
}

export function formatDistanceRu(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: ru });
}

export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
