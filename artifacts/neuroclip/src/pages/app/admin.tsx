import { useGetCurrentUser, useAdminListUsers, useAdminListJobs, useAdminGetAnalytics, useAdminRetryJob, getAdminListJobsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Users, Film, Activity, RefreshCw, Server, CreditCard, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatRub, formatDateRu } from "@/lib/format";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const { data: users } = useAdminListUsers();
  const { data: jobs } = useAdminListJobs({ query: { refetchInterval: 5000, queryKey: getAdminListJobsQueryKey() } });
  const { data: analytics } = useAdminGetAnalytics();
  const retryJob = useAdminRetryJob();

  if (isLoadingUser) return null;

  if (user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 text-center p-8">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <CardTitle className="text-xl mb-2 text-destructive">Доступ запрещен</CardTitle>
          <CardDescription className="text-base">Для просмотра этой страницы требуются права администратора.</CardDescription>
        </Card>
      </div>
    );
  }

  const handleRetryJob = (id: string) => {
    retryJob.mutate({ jobId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListJobsQueryKey() });
        toast.success("Задача перезапущена");
      },
      onError: () => toast.error("Ошибка при перезапуске")
    });
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary" /> Админ-панель
        </h1>
        <p className="text-muted-foreground">Управление системой, мониторинг очередей и аналитика</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="analytics"><Activity className="w-4 h-4 mr-2" /> Аналитика</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" /> Пользователи</TabsTrigger>
          <TabsTrigger value="jobs"><Server className="w-4 h-4 mr-2" /> Очередь рендера</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6 flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Пользователи</p>
                      <h3 className="text-3xl font-bold">{analytics.totalUsers}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Users className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Видео сгенерировано</p>
                      <h3 className="text-3xl font-bold">{analytics.totalProjects}</h3>
                    </div>
                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Film className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Выручка за все время</p>
                      <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{formatRub(analytics.totalRevenueRub)}</h3>
                    </div>
                    <div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><CreditCard className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">MAU (Акт. за мес)</p>
                      <h3 className="text-3xl font-bold">{analytics.mau}</h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Activity className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Выручка по месяцам (₽)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.revenueByMonth}>
                        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip formatter={(value: number) => formatRub(value)} />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Пользователи по тарифам</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.usersByPlan} dataKey="count" nameKey="planName" cx="50%" cy="50%" outerRadius={100} label>
                          {analytics.usersByPlan.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Средний чек (ARPU)</p>
                      <h4 className="text-xl font-bold mt-1">{formatRub(analytics.avgChequeRub)}</h4>
                    </div>
                    <TrendingUp className="w-8 h-8 text-primary/40" />
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Конверсия во фримиум (Free → Paid)</p>
                      <h4 className="text-xl font-bold mt-1">{analytics.freeToPaidConversion.toFixed(1)}%</h4>
                    </div>
                    <Users className="w-8 h-8 text-primary/40" />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email / Имя</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Тариф</TableHead>
                  <TableHead>Токены</TableHead>
                  <TableHead>Проекты</TableHead>
                  <TableHead>Регистрация</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                        {u.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{u.planId}</TableCell>
                    <TableCell>{u.tokenBalance}</TableCell>
                    <TableCell>{u.projectCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateRu(u.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Проект / Владелец</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Прогресс</TableHead>
                  <TableHead>Попытки</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.map(job => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-medium truncate max-w-[200px]" title={job.projectTitle}>{job.projectTitle}</div>
                      <div className="text-xs text-muted-foreground">{job.userEmail}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{job.jobType}</TableCell>
                    <TableCell><StatusBadge status={job.status} /></TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex items-center gap-2">
                        <Progress value={job.progress} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-8 text-right">{job.progress}%</span>
                      </div>
                      {job.errorMessage && <div className="text-xs text-destructive mt-1 truncate max-w-[180px]" title={job.errorMessage}>{job.errorMessage}</div>}
                    </TableCell>
                    <TableCell>{job.retryCount}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          (job.status !== "failed" && job.status !== "rendering" && job.status !== "queued") ||
                          retryJob.isPending
                        }
                        title={
                          job.status === "rendering" || job.status === "queued"
                            ? "Принудительно перезапустить (если задача зависла)"
                            : "Повторить упавшую задачу"
                        }
                        onClick={() => {
                          if (job.status === "rendering" || job.status === "queued") {
                            if (!confirm("Принудительно перезапустить активную задачу? Это сбросит её прогресс.")) return;
                          }
                          handleRetryJob(job.id);
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-2" /> Повтор
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!jobs || jobs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-28 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <span>Очередь пуста — все задачи обработаны.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => queryClient.invalidateQueries({ queryKey: getAdminListJobsQueryKey() })}
                        >
                          <RefreshCw className="w-3 h-3 mr-2" /> Обновить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
