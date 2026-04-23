import { useState } from "react";
import { 
  useGetCurrentUser, useGetUsage, useListPlans, useListPresets, useListPayments, 
  useCancelSubscription, useSubscribeToPlan, usePurchaseTokens, useRedeemPromoCode,
  getGetCurrentUserQueryKey, getGetUsageQueryKey, getListPaymentsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CreditCard, Zap, Check, Key, Loader2, Coins } from "lucide-react";
import { formatRub, formatDateRu } from "@/lib/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { userStorageKey } from "@/lib/user-storage";

type TokenTx = {
  id: string;
  delta: number;
  reason: string;
  reasonLabel: string;
  refId: string | null;
  createdAt: string;
};

export default function Billing() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const { data: usage, isLoading: isLoadingUsage } = useGetUsage();
  const { data: plans } = useListPlans();
  const { data: presets } = useListPresets();
  const { data: payments } = useListPayments();
  const baseUrl = import.meta.env.BASE_URL;

  // Помечаем, что пользователь действительно открыл биллинг — для чек-листа на дашборде.
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(userStorageKey(user.id, "visited:billing"), "1");
    }
  }, [user?.id]);

  const { data: tokenTxs } = useQuery<TokenTx[]>({
    queryKey: ["token-transactions"],
    queryFn: async () => {
      const r = await fetch(`${baseUrl}api/billing/token-transactions`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Не удалось загрузить историю жетонов");
      return r.json();
    },
  });

  const cancelSub = useCancelSubscription();
  const subscribe = useSubscribeToPlan();
  const purchaseTokens = usePurchaseTokens();
  const redeemPromo = useRedeemPromoCode();

  const [period, setPeriod] = useState<"month" | "year">("month");
  const [promoCode, setPromoCode] = useState("");
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  if (isLoadingUser || isLoadingUsage) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleCancelSub = () => {
    cancelSub.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUsageQueryKey() });
        toast.success("Подписка отменена");
        setIsCancelOpen(false);
      },
      onError: () => toast.error("Ошибка при отмене подписки")
    });
  };

  const handleSubscribe = (planId: string) => {
    subscribe.mutate({ data: { planId, period } }, {
      onSuccess: (res) => {
        if (res.confirmationUrl) {
          window.location.href = res.confirmationUrl;
        } else {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast.success("Тариф успешно изменен");
        }
      },
      onError: () => toast.error("Ошибка при оформлении подписки")
    });
  };

  const handlePurchaseTokens = (packId: any) => {
    purchaseTokens.mutate({ data: { pack: packId } }, {
      onSuccess: (res) => {
        if (res.confirmationUrl) {
          window.location.href = res.confirmationUrl;
        } else {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast.success("Токены успешно куплены");
        }
      },
      onError: () => toast.error("Ошибка при покупке токенов")
    });
  };

  const handleRedeemPromo = () => {
    if (!promoCode.trim()) return;
    redeemPromo.mutate({ data: { code: promoCode } }, {
      onSuccess: (res) => {
        toast.success(res.message);
        if (res.tokensAdded > 0) {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        }
        setPromoCode("");
      },
      onError: () => toast.error("Неверный промокод")
    });
  };

  return (
    <div className="space-y-12 pb-12 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Биллинг и подписка</h1>
        <p className="text-muted-foreground">Управление тарифом, лимитами и историей платежей</p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-primary text-primary-foreground border-transparent shadow-xl">
          <CardHeader>
            <CardTitle className="text-primary-foreground/80 font-medium text-lg">Текущий тариф</CardTitle>
            <div className="text-4xl font-bold mt-2">{user?.planName}</div>
          </CardHeader>
          <CardContent>
            {user?.currentPeriodEnd && (
              <p className="text-primary-foreground/80 mb-6">
                Оплачен до {formatDateRu(user.currentPeriodEnd)}
                {user.cancelAtPeriodEnd && " (будет отменен)"}
              </p>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Использовано видео: {user?.videosUsedThisPeriod}</span>
                <span>Лимит: {user?.videosQuota}</span>
              </div>
              <Progress 
                value={user && user.videosQuota > 0 ? (user.videosUsedThisPeriod / user.videosQuota) * 100 : 0} 
                className="h-2 bg-primary-foreground/20 [&>div]:bg-white" 
              />
            </div>
          </CardContent>
          <CardFooter className="bg-black/10 pt-4 pb-4">
            {!user?.cancelAtPeriodEnd && user?.planId !== 'free' && (
              <Button variant="ghost" className="text-primary-foreground hover:bg-black/20 hover:text-white" onClick={() => setIsCancelOpen(true)}>
                Отменить подписку
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Баланс токенов
            </CardTitle>
            <CardDescription>Используются для расширенной генерации и доп. минут</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold mb-4">{user?.tokenBalance}</div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Промокод" 
                value={promoCode} 
                onChange={e => setPromoCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRedeemPromo()}
              />
              <Button variant="secondary" onClick={handleRedeemPromo} disabled={redeemPromo.isPending || !promoCode}>
                <Key className="w-4 h-4 mr-2" /> Применить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold">Тарифы</h2>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "month"|"year")}>
            <TabsList>
              <TabsTrigger value="month">Месяц</TabsTrigger>
              <TabsTrigger value="year">Год (скидка 20%)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans?.map(plan => {
            const price = period === 'month' ? plan.priceMonthRub : plan.priceYearRub;
            const isCurrent = user?.planId === plan.id;
            return (
              <Card key={plan.id} className={`relative flex flex-col ${plan.recommended ? 'border-primary shadow-lg ring-1 ring-primary/20' : ''}`}>
                {plan.recommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    Популярный
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{price === 0 ? "Бесплатно" : `${price} ₽`}</span>
                    {price > 0 && <span className="text-muted-foreground">/{period === 'month' ? 'мес' : 'год'}</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{plan.videosPerMonth} видео в месяц</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>До {plan.maxDurationMin} мин. на видео</span>
                    </li>
                    {!plan.watermark && (
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Без водяного знака</span>
                      </li>
                    )}
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isCurrent ? "outline" : (plan.recommended ? "default" : "secondary")}
                    disabled={isCurrent || subscribe.isPending}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {isCurrent ? "Текущий тариф" : "Выбрать тариф"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Token Packs */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Пакеты токенов</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {presets?.tokenPacks.map(pack => (
            <Card key={pack.id}>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-bold flex justify-center items-center gap-2">
                  <Zap className="w-6 h-6 text-amber-500 fill-amber-500/20" /> {pack.tokens}
                </CardTitle>
                <CardDescription>{pack.label}</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-4">
                <div className="text-2xl font-bold">{pack.priceRub} ₽</div>
                {pack.bonusPercent > 0 && (
                  <Badge variant="secondary" className="mt-2 text-amber-600 bg-amber-100 dark:bg-amber-900/30">
                    +{pack.bonusPercent}% бонус
                  </Badge>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" onClick={() => handlePurchaseTokens(pack.id)} disabled={purchaseTokens.isPending}>
                  Купить
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Token transaction History */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="w-6 h-6 text-primary" />
          Движение жетонов
        </h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Операция</TableHead>
                <TableHead className="text-right">Жетоны</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokenTxs && tokenTxs.length > 0 ? (
                tokenTxs.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateRu(tx.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{tx.reasonLabel}</div>
                      {tx.refId && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {tx.refId.split("-")[0]}
                        </div>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-semibold whitespace-nowrap ${tx.delta < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}
                    >
                      {tx.delta > 0 ? "+" : ""}
                      {tx.delta}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                    Списаний и пополнений пока нет
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <h2 className="text-2xl font-bold">История платежей</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments && payments.length > 0 ? payments.map(payment => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateRu(payment.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{payment.description}</div>
                    <div className="text-xs text-muted-foreground font-mono">{payment.id.split('-')[0]}</div>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatRub(payment.amountRub)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.status === 'succeeded' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'}>
                      {payment.status === 'succeeded' ? 'Успешно' : payment.status === 'pending' ? 'В обработке' : 'Ошибка'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    История платежей пуста
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить подписку?</AlertDialogTitle>
            <AlertDialogDescription>
              Ваша подписка продолжит действовать до конца оплаченного периода ({user?.currentPeriodEnd ? formatDateRu(user.currentPeriodEnd) : ''}), после чего ваш аккаунт будет переведен на бесплатный тариф. Вы потеряете доступ к продвинутым функциям.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Не отменять</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSub} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Да, отменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
