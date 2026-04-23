import { useState, useEffect } from "react";
import { useListProjects, ListProjectsStatus } from "@workspace/api-client-react";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Search, Plus, Film, Loader2, Lightbulb, PenLine, Image as ImageIcon, Mic, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function ProjectsList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState<ListProjectsStatus>("all");

  const { data: projects, isLoading } = useListProjects(
    { search: debouncedSearch, status: status === "all" ? undefined : status },
    { query: { queryKey: ["projects", debouncedSearch, status], placeholderData: (prev: unknown) => prev as never } }
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b -mx-4 px-4 py-4 md:-mx-8 md:px-8 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Мои проекты</h1>
          <p className="text-muted-foreground mt-1">Управляйте вашими видеороликами</p>
        </div>
        <Link href="/app/projects/new">
          <Button size="lg" className="w-full sm:w-auto shadow-md">
            <Plus className="w-5 h-5 mr-2" /> Новый проект
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={status} onValueChange={(v) => setStatus(v as ListProjectsStatus)} className="w-full sm:w-auto overflow-x-auto">
          <TabsList className="h-10">
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="draft">Черновики</TabsTrigger>
            <TabsTrigger value="rendering">В рендере</TabsTrigger>
            <TabsTrigger value="done">Готовые</TabsTrigger>
            <TabsTrigger value="failed">Ошибки</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск по названию..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading && !projects ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-video rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <>
        {/* Мини-инструкция «Как это работает» — показываем только если у пользователя 1–3 проекта */}
        {projects.length <= 3 && status === "all" && !search && (
          <HowItWorksStrip />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        </>
      ) : (
        <EmptyState 
          icon={<Film className="w-12 h-12" />}
          title={search ? "Ничего не найдено" : "У вас пока нет проектов"}
          description={search ? "Попробуйте изменить поисковый запрос" : "Создайте первый проект, чтобы начать магию ИИ-генерации."}
          action={!search ? (
            <Link href="/app/projects/new">
              <Button><Plus className="w-4 h-4 mr-2"/> Создать проект</Button>
            </Link>
          ) : undefined}
          className="mt-12"
        />
      )}

    </div>
  );
}

const HOW_IT_WORKS = [
  { icon: PenLine, title: "1. Тема", text: "Опишите идею ролика — ИИ напишет сценарий." },
  { icon: ImageIcon, title: "2. Картинки", text: "К каждой сцене подбирается изображение, можно перегенерировать." },
  { icon: Video, title: "3. Анимация", text: "Один клик — и картинки оживают плавным движением." },
  { icon: Mic, title: "4. Голос", text: "Выберите диктора, добавьте музыку и субтитры." },
];

function HowItWorksStrip() {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h2 className="font-semibold text-sm">Как это работает — 4 простых шага</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {HOW_IT_WORKS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs">{s.title}</div>
                <p className="text-xs text-muted-foreground leading-snug">{s.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
