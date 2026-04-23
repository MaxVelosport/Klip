import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Sparkles, MessageSquare, Bot, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Message = {
  id: string;
  role: string;
  content: string;
  diffSummary?: string | null;
  createdAt: string;
};

const SUGGESTIONS: Array<{ label: string; prompt: string }> = [
  { label: "Сделай короче", prompt: "Сократи сценарий — оставь только самое важное." },
  { label: "Добавь эмоций", prompt: "Сделай повествование ярче и эмоциональнее." },
  { label: "Цепляющий хук", prompt: "Добавь сильный хук в первую сцену." },
  { label: "Призыв в финале", prompt: "Добавь призыв подписаться в финальную сцену." },
  { label: "Проще для всех", prompt: "Упрости формулировки, как для новичков." },
  { label: "Деловой тон", prompt: "Переведи в нейтрально-деловой тон." },
];

export function ScriptChat({
  projectId,
  baseUrl,
  onScenesChanged,
}: {
  projectId: string;
  baseUrl: string;
  onScenesChanged: (changedIds: string[]) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${baseUrl}api/projects/${projectId}/script/messages`;
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data) => {
        if (!cancelled) setMessages(data.messages ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [projectId, baseUrl]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    setSending(true);
    const optimisticUser: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimisticUser]);
    setInput("");
    try {
      const r = await fetch(`${baseUrl}api/projects/${projectId}/script/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Не удалось получить ответ ИИ");
      }
      const { assistant, changedSceneIds } = (await r.json()) as {
        assistant: Message;
        changedSceneIds: string[];
      };
      setMessages((m) => [...m, assistant]);
      if (changedSceneIds?.length) {
        onScenesChanged(changedSceneIds);
        toast.success(`ИИ обновил сцен: ${changedSceneIds.length}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка чата");
      setMessages((m) => m.filter((msg) => msg.id !== optimisticUser.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="font-semibold text-sm">Чат с ИИ-редактором</div>
          <div className="text-xs text-muted-foreground">
            Опишите правки — ИИ сам обновит сцены
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Загружаем переписку…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">
              Здесь будет ваш диалог с ИИ. Попросите что-нибудь изменить — сцены обновятся слева.
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  {m.content}
                  {m.diffSummary && m.role !== "user" && (
                    <div className="mt-1.5 pt-1.5 border-t border-foreground/10 text-[11px] opacity-70">
                      {m.diffSummary}
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center mt-0.5">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-foreground/40 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {messages.length === 0 && !loading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => send(s.prompt)}
              disabled={sending}
              className="text-xs px-2.5 py-1 rounded-full border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-t p-3 bg-background/50">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Например: «сделай вступление цепляющим» или «упрости 3-ю сцену»"
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send(input);
              }
            }}
            disabled={sending}
          />
          <Button
            onClick={() => send(input)}
            disabled={!input.trim() || sending}
            size="icon"
            className="shrink-0 h-10 w-10"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5 text-right">
          Ctrl/⌘ + Enter — отправить
        </div>
      </div>
    </div>
  );
}
