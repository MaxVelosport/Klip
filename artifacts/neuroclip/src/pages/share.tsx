import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Loader2, AlertCircle, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareScene {
  orderIndex: number;
  title: string;
  narration: string;
  durationSec: number;
}

interface SharePayload {
  title: string;
  durationSec: number | null;
  aspectRatio: "16:9" | "9:16" | "1:1";
  finalVideoUrl: string;
  thumbnailUrl: string | null;
  scenes: ShareScene[];
}

function formatDuration(sec: number | null | undefined): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} мин ${s} с` : `${s} с`;
}

export default function SharePage() {
  const [, params] = useRoute<{ token: string }>("/share/:token");
  const token = params?.token ?? "";
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const baseUrl = import.meta.env.BASE_URL;
    fetch(`${baseUrl}api/share/${encodeURIComponent(token)}`, {
      credentials: "omit",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Ссылка не найдена или истекла");
        }
        return res.json() as Promise<SharePayload>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Ошибка");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const aspectClass =
    data?.aspectRatio === "9:16"
      ? "aspect-[9/16] max-w-md mx-auto"
      : data?.aspectRatio === "1:1"
        ? "aspect-square max-w-2xl mx-auto"
        : "aspect-video";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg">НейроКлип</span>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              Создать своё видео
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Загружаем видео…</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">{error}</h1>
            <p className="text-sm text-muted-foreground max-w-md">
              Возможно, владелец отозвал доступ. Попросите свежую ссылку или создайте своё видео.
            </p>
            <Link href="/register">
              <Button>
                <Sparkles className="w-4 h-4 mr-2" /> Создать своё видео
              </Button>
            </Link>
          </div>
        )}

        {data && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="share-title">
                {data.title}
              </h1>
              {data.durationSec ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Film className="w-3.5 h-3.5" />
                  {formatDuration(data.durationSec)} · {data.scenes.length} сцен · {data.aspectRatio}
                </p>
              ) : null}
            </div>

            <div className={`bg-black rounded-2xl overflow-hidden shadow-2xl ${aspectClass}`}>
              <video
                src={data.finalVideoUrl}
                poster={data.thumbnailUrl ?? undefined}
                controls
                playsInline
                className="w-full h-full"
                data-testid="share-video"
              />
            </div>

            {data.scenes.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Сцены</h2>
                <ol className="space-y-3">
                  {data.scenes.map((s) => (
                    <li
                      key={s.orderIndex}
                      className="rounded-xl border bg-card p-4 flex gap-4"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        {s.orderIndex + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold mb-1 truncate">{s.title}</div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {s.narration}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 self-start">
                        ~{Math.round(s.durationSec)}с
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-cyan-500/10 p-6 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Создано в НейроКлип</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Платформа для создания видео с искусственным интеллектом — от сценария до готового MP4 за минуты.
              </p>
              <Link href="/register">
                <Button size="lg">Попробовать бесплатно</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
