import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Platform = "vk" | "telegram" | "youtube";

interface SocialCaption {
  platform: Platform;
  caption: string;
  hashtags: string[];
}

interface CaptionsResponse {
  captions: SocialCaption[];
}

const PLATFORM_LABEL: Record<Platform, string> = {
  vk: "ВКонтакте",
  telegram: "Telegram",
  youtube: "YouTube Shorts",
};

const PLATFORM_COLOR: Record<Platform, string> = {
  vk: "from-[#0077FF]/15 to-[#0077FF]/5 text-[#0077FF]",
  telegram: "from-[#229ED9]/15 to-[#229ED9]/5 text-[#229ED9]",
  youtube: "from-red-500/15 to-red-500/5 text-red-500",
};

interface SocialPostGeneratorProps {
  projectId: string;
  videoTitle: string;
  brandName?: string;
  brandTagline?: string;
}

export function SocialPostGenerator({ projectId, videoTitle, brandName, brandTagline }: SocialPostGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SocialCaption[] | null>(null);
  const [edited, setEdited] = useState<Record<Platform, string>>({
    vk: "",
    telegram: "",
    youtube: "",
  });
  const [copied, setCopied] = useState<Platform | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}api/projects/${encodeURIComponent(projectId)}/social-caption`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) {
        let msg = "Не удалось сгенерировать пост";
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const json = (await res.json()) as CaptionsResponse;
      // Защита от изменений API: фильтруем только корректные платформы
      const allowed: Platform[] = ["vk", "telegram", "youtube"];
      const valid = (json.captions ?? []).filter(
        (c): c is SocialCaption =>
          c != null &&
          allowed.includes(c.platform as Platform) &&
          typeof c.caption === "string" &&
          Array.isArray(c.hashtags),
      );
      if (valid.length === 0) {
        throw new Error("Сервер вернул пустой ответ");
      }
      setData(valid);
      const next: Record<Platform, string> = { vk: "", telegram: "", youtube: "" };
      const headerLine = brandName
        ? brandTagline
          ? `${brandName} — ${brandTagline}`
          : brandName
        : "";
      for (const c of valid) {
        const body = `${c.caption}\n\n${c.hashtags.join(" ")}`;
        next[c.platform] = headerLine ? `${headerLine}\n\n${body}` : body;
      }
      setEdited(next);
    } catch (err: any) {
      toast.error(err?.message || "Не удалось сгенерировать пост");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (p: Platform) => {
    try {
      await navigator.clipboard.writeText(edited[p]);
      setCopied(p);
      toast.success(`Скопировано — теперь вставьте в ${PLATFORM_LABEL[p]}`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Не удалось скопировать. Выделите текст вручную.");
    }
  };

  if (!data) {
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-fuchsia-500/5 to-cyan-500/5 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold flex items-center gap-2">
              Пост для соцсетей
              <Badge variant="secondary" className="text-[10px]">ИИ</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Сгенерируем готовый текст с эмодзи и хэштегами для ВК, Telegram и YouTube — копируйте в один клик.
            </p>
          </div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Пишем пост…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Сгенерировать пост
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Пост для соцсетей
          </h3>
          <p className="text-xs text-muted-foreground">
            Готовые тексты для «{videoTitle}». Можно редактировать перед копированием.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Перегенерировать"}
        </Button>
      </div>

      <Tabs defaultValue="vk">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="vk">ВК</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
        </TabsList>
        {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
          <TabsContent key={p} value={p} className="space-y-2 pt-3">
            <div className={`rounded-lg p-2 text-xs bg-gradient-to-r ${PLATFORM_COLOR[p]}`}>
              {PLATFORM_LABEL[p]} · {edited[p].length} символов
            </div>
            <Textarea
              value={edited[p]}
              onChange={(e) => setEdited((cur) => ({ ...cur, [p]: e.target.value }))}
              rows={8}
              className="font-mono text-sm resize-none"
            />
            <Button
              onClick={() => copy(p)}
              variant={copied === p ? "default" : "outline"}
              className="w-full"
            >
              {copied === p ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> Скопировано
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" /> Скопировать пост
                </>
              )}
            </Button>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
