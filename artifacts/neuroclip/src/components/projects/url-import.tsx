import { useState } from "react";
import { Loader2, Link as LinkIcon, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface UrlImportProps {
  onExtracted: (text: string, sourceUrl: string, title?: string) => void;
}

interface ExtractResponse {
  title?: string;
  text: string;
  sourceUrl: string;
  truncated?: boolean;
}

export function UrlImport({ onExtracted }: UrlImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    try {
      // eslint-disable-next-line no-new
      new URL(normalized);
    } catch {
      toast.error("Похоже, это не ссылка. Проверьте URL.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/extract-url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });

      if (!res.ok) {
        let msg = `Не удалось загрузить страницу (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as ExtractResponse;
      if (!data.text || data.text.length < 30) {
        throw new Error("На странице слишком мало текста — попробуйте другую ссылку.");
      }

      onExtracted(data.text, data.sourceUrl, data.title);
      toast.success(
        data.truncated
          ? "Импортировали (текст обрезан до 1000 символов — самое важное в начале)."
          : "Импортировали текст со страницы.",
      );
      setUrl("");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось импортировать.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed bg-gradient-to-br from-cyan-500/5 to-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
          <Globe className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            Импорт из статьи или сайта
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </h4>
          <p className="text-xs text-muted-foreground">
            Вставьте ссылку на блог, новость, лендинг — мы достанем основной текст и используем его для сценария.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="url"
            inputMode="url"
            placeholder="https://example.com/статья"
            className="pl-9"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (!loading && url.trim()) handleSubmit();
              }
            }}
            disabled={loading}
          />
        </div>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
          className="sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загружаем…
            </>
          ) : (
            "Импортировать"
          )}
        </Button>
      </div>
    </div>
  );
}
