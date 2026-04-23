import { useGetDashboardSummary, ActivityItem, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Film, PlayCircle, Clock, CheckCircle2, ListVideo, Zap, Plus, Loader2, Sparkles, Music, Wand2 } from "lucide-react";
import { AnimatedBlobs } from "@/components/animated-blobs";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { ErrorState } from "@/components/error-state";
import { ProjectCard } from "@/components/project-card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Progress } from "@/components/ui/progress";
import { formatDistanceRu } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { WelcomeModal } from "@/components/welcome-modal";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { useAuth } from "@/lib/auth";
import { HelpTip } from "@/components/help-tip";
import { userStorageKey } from "@/lib/user-storage";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary();
  const { user } = useAuth();
  const [hasSeenBilling, setHasSeenBilling] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setHasSeenBilling(
        localStorage.getItem(userStorageKey(user.id, "visited:billing")) === "1"
      );
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Не удалось загрузить дашборд"
        description="Проверьте интернет и попробуйте обновить страницу. Если ошибка повторяется — напишите в поддержку."
        onRetry={() => window.location.reload()}
        homeHref="/app/projects"
        homeLabel="К проектам"
      />
    );
  }

  const { totalProjects, completedProjects, renderingProjects, draftProjects, totalDurationSec, videosThisMonth, tokenBalance, videosRemaining, statusBreakdown, recentProjects, recentActivity } = summary;

  const chartData = statusBreakdown.map(item => ({
    name: item.status,
    count: item.count,
    fill: item.status === 'done' ? 'hsl(var(--chart-2))' : 
          item.status === 'rendering' ? 'hsl(var(--chart-1))' : 
          item.status === 'draft' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--chart-3))'
  }));

  const videosQuota = videosThisMonth + videosRemaining;
  const progressPercent = videosQuota > 0 ? (videosThisMonth / videosQuota) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">

      <WelcomeModal />

      <OnboardingChecklist
        hasProject={totalProjects > 0}
        hasDoneVideo={completedProjects > 0}
        hasFilledProfile={!!user?.name && user.name.trim().length > 0}
        hasSeenBilling={hasSeenBilling}
      />

      {/* Hero CTA — анимированный градиент + парящие иконки + блобы */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-3xl overflow-hidden text-white p-8 md:p-12 shadow-2xl bg-gradient-to-br from-primary via-fuchsia-600 to-chart-2 animate-gradient"
      >
        <AnimatedBlobs variant="warm" className="opacity-50" />
        <div className="relative z-10 max-w-2xl">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-medium backdrop-blur mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ИИ-студия видео · готово за 5 минут
          </motion.span>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight leading-tight drop-shadow">
            Создайте новое видео<br className="hidden md:inline" /> за пару кликов
          </h1>
          <p className="text-white/85 text-base md:text-lg mb-8 max-w-xl">
            ИИ напишет сценарий, подберёт визуальный ряд и добавит профессиональную озвучку. От идеи до готового MP4 — в одном окне.
          </p>
          <Link href="/app/projects/new">
            <Button size="lg" className="bg-white text-primary hover:bg-white border border-white text-lg h-14 px-8 rounded-full shadow-2xl pulse-ring">
              <Plus className="w-5 h-5 mr-2" />
              Создать видео
            </Button>
          </Link>
        </div>

        {/* Парящие декоративные иконки */}
        <div className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 hidden md:block pointer-events-none">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-56 h-56"
          >
            <div className="absolute inset-0 rounded-3xl bg-white/15 backdrop-blur border border-white/25 shadow-xl" />
            <Film className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 text-white/90" />
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-amber-400 text-white shadow-lg flex items-center justify-center"
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0], rotate: [0, -6, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-2 -left-4 w-12 h-12 rounded-2xl bg-emerald-400 text-white shadow-lg flex items-center justify-center"
            >
              <Music className="w-6 h-6" />
            </motion.div>
            <motion.div
              animate={{ x: [0, 6, 0], y: [0, -4, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-4 -left-6 w-10 h-10 rounded-xl bg-pink-500 text-white shadow-lg flex items-center justify-center"
            >
              <Wand2 className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* KPI Tiles — animated counters + hover lift */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Всего проектов", value: totalProjects, icon: ListVideo, color: "text-primary", bg: "bg-primary/10", grad: "from-primary/40 to-primary/0" },
          { label: "Готово", value: completedProjects, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", grad: "from-green-500/40 to-green-500/0" },
          { label: "В работе", value: renderingProjects + draftProjects, icon: Loader2, color: "text-amber-500", bg: "bg-amber-500/10", grad: "from-amber-500/40 to-amber-500/0", spin: renderingProjects > 0 },
          { label: "Жетоны", value: tokenBalance ?? 0, icon: Zap, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10", grad: "from-fuchsia-500/40 to-fuchsia-500/0" },
        ].slice(0, 3).map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
            >
              <Card className="relative overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-xl transition-shadow h-full">
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${kpi.grad} blur-2xl opacity-70`} />
                <CardContent className="p-6 relative">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{kpi.label}</p>
                      <h3 className="text-3xl font-bold tracking-tight">
                        <AnimatedCounter value={kpi.value} />
                      </h3>
                    </div>
                    <div className={`p-3 ${kpi.bg} ${kpi.color} rounded-xl`}>
                      <Icon className={`w-5 h-5 ${kpi.spin ? "animate-spin" : ""}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -4 }}
        >
          <Card className="relative overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-xl transition-shadow h-full">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/40 to-purple-500/0 blur-2xl opacity-70" />
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Минут произведено</p>
                  <h3 className="text-3xl font-bold tracking-tight">
                    <AnimatedCounter value={Math.round(totalDurationSec / 60)} />
                  </h3>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Clock className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Token Balance & Status Breakdown */}
        <div className="space-y-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Квота видео</CardTitle>
              <CardDescription>В текущем периоде</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span>Использовано: {videosThisMonth}</span>
                <span>Лимит: {videosQuota}</span>
              </div>
              <Progress value={progressPercent} className="h-3 mb-6" />
              
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                  <span className="font-medium text-sm">Баланс токенов</span>
                </div>
                <span className="font-bold text-lg">{tokenBalance}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статусы проектов</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">Нет данных</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Недавние проекты</CardTitle>
              <Link href="/app/projects">
                <Button variant="ghost" size="sm">Все проекты</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentProjects.slice(0, 4).map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={<Film className="w-8 h-8" />}
                  title="У вас пока нет проектов"
                  description="Создайте первый проект, чтобы начать магию ИИ-генерации."
                  action={
                    <Link href="/app/projects/new">
                      <Button><Plus className="w-4 h-4 mr-2"/> Создать проект</Button>
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
