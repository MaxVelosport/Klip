import { useAuth } from "@/lib/auth";

/**
 * Возвращает ключ localStorage, привязанный к текущему пользователю,
 * чтобы при смене аккаунта (или работе на общем компьютере)
 * новый пользователь не наследовал «скрыто/прочитано» от предыдущего.
 *
 * Если пользователь ещё не загружен — используем общий «guest»-неймспейс.
 */
export function useUserStorageKey(suffix: string): string {
  const { user } = useAuth();
  const uid = user?.id ?? "guest";
  return `nc:u:${uid}:${suffix}`;
}

/**
 * Версия без хука — для мест, где нужно прочитать/записать вне React-дерева.
 * Передавайте сюда уже известный userId (или "guest").
 */
export function userStorageKey(userId: string | undefined | null, suffix: string): string {
  return `nc:u:${userId ?? "guest"}:${suffix}`;
}
