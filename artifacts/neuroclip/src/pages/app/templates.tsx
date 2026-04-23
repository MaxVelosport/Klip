import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Clock, Mic, Palette, Filter, ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AnimatedBlobs } from "@/components/animated-blobs";
import {
  VIDEO_TEMPLATES,
  TEMPLATE_GROUPS,
  type VideoTemplate,
} from "@/lib/video-templates";

export default function TemplatesPage() {
  const [activeGroup, setActiveGroup] = useState<VideoTemplate["group"] | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VIDEO_TEMPLATES.filter((t) => {
      const groupOk = activeGroup === "all" || t.group === activeGroup;
      const queryOk =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.benefit.toLowerCase().includes(q);
      return groupOk && queryOk;
    });
  }, [activeGroup, query]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-3xl overflow-hidden text-white p-8 md:p-10 shadow-xl bg-gradient-to-br from-fuchsia-600 via-primary to-cyan-500 animate-gradient"
      >
        <AnimatedBlobs variant="warm" className="opacity-40" />
        <div className="relative z-10 max-w-2xl">
          <Badge className="bg-white/15 text-white border-white/25 backdrop-blur mb-3">
            <Sparkles className="w-3 h-3 mr-1.5" /> Новое
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow">
            Шаблоны видео
          </h1>
          <p className="text-white/90 text-base md:text-lg max-w-xl">
            Выберите готовый сценарий — от Reels-анонса до 5-минутного туториала.
            В один клик подставим тему, голос, стиль и музыку.
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={activeGroup === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveGroup("all")}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" /> Все
            <Badge variant="secondary" className="ml-2">{VIDEO_TEMPLATES.length}</Badge>
          </Button>
          {TEMPLATE_GROUPS.map((g) => {
            const count = VIDEO_TEMPLATES.filter((t) => t.group === g.id).length;
            return (
              <Button
                key={g.id}
                variant={activeGroup === g.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveGroup(g.id)}
              >
                {g.label}
                <Badge variant="secondary" className="ml-2">{count}</Badge>
              </Button>
            );
          })}
        </div>
        <div className="md:max-w-xs w-full">
          <Input
            type="search"
            placeholder="Поиск по шаблонам…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            whileHover={{ y: -4 }}
          >
            <Card className="group h-full overflow-hidden border-border/60 hover:border-primary/50 hover:shadow-xl transition-all">
              <div className={`relative h-32 bg-gradient-to-br ${t.accent} overflow-hidden`}>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/25 text-white border-white/30 backdrop-blur">
                    {t.groupLabel}
                  </Badge>
                </div>
                <div className="absolute right-4 bottom-2 text-7xl drop-shadow-lg">
                  {t.emoji}
                </div>
              </div>
              <CardContent className="p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-lg leading-tight mb-1">{t.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {t.benefit}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground pt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60">
                    <Clock className="w-3 h-3" /> {t.durationSec} сек
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60">
                    <Mic className="w-3 h-3" /> {t.voiceId}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60">
                    <Palette className="w-3 h-3" /> {t.visualStyle}
                  </span>
                </div>
                <Link href={`/app/projects/new?template=${encodeURIComponent(t.id)}`}>
                  <Button className="w-full mt-2" asChild={false}>
                    Использовать шаблон <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Ничего не нашлось. Попробуйте изменить запрос или фильтр.</p>
        </div>
      )}

      {/* Bottom CTA */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div>
            <h3 className="font-semibold mb-0.5">Не нашли подходящий формат?</h3>
            <p className="text-sm text-muted-foreground">Создайте видео с нуля — без шаблона.</p>
          </div>
          <Link href="/app/projects/new">
            <Button variant="outline">Создать с нуля</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
