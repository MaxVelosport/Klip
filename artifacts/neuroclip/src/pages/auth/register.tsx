import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useRegisterUser, useOauthLogin, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthShell, OauthDivider, VkIcon, YandexIcon } from "@/components/auth/auth-shell";

const registerSchema = z.object({
  name: z.string().min(2, "Имя слишком короткое"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
  consent: z.boolean().refine((val) => val === true, "Необходимо согласие на обработку данных"),
});

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-ZА-Я]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-zА-Яа-я0-9]/.test(pw)) score++;
  const labels = ["Слабый", "Слабый", "Средний", "Хороший", "Отличный"];
  const colors = ["bg-muted", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score]!, color: colors[score]! };
}

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const register = useRegisterUser();
  const oauthLogin = useOauthLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", consent: false },
  });

  const pw = form.watch("password");
  const strength = passwordStrength(pw || "");

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      await register.mutateAsync({ data });
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast.success("Добро пожаловать в НейроКлип!");
      setLocation("/app/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Ошибка регистрации");
    }
  };

  const handleOauth = async (provider: "vk" | "yandex") => {
    try {
      await oauthLogin.mutateAsync({ provider });
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setLocation("/app/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Ошибка авторизации");
    }
  };

  return (
    <AuthShell
      title="Создать аккаунт"
      subtitle={
        <>
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Войти
          </Link>
        </>
      }
      sideTitle="Готово к работе через 30 секунд"
      sideText="Присоединяйтесь к тысячам креаторов, которые создают контент быстрее и дешевле — без сложного монтажа."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Имя</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      autoComplete="name"
                      placeholder="Иван Иванов"
                      className="pl-10 h-11 transition-shadow focus-visible:shadow-md focus-visible:shadow-primary/15"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="pl-10 h-11 transition-shadow focus-visible:shadow-md focus-visible:shadow-primary/15"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Пароль</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Не менее 8 символов"
                      className="pl-10 pr-10 h-11 transition-shadow focus-visible:shadow-md focus-visible:shadow-primary/15"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <AnimatePresence>
                  {pw && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 pt-1 overflow-hidden"
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: i < strength.score ? "100%" : 0 }}
                              transition={{ duration: 0.3 }}
                              className={`h-full ${strength.color}`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Надёжность: <span className="font-medium text-foreground">{strength.label}</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="consent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                </FormControl>
                <div className="space-y-1 leading-tight">
                  <FormLabel className="text-sm cursor-pointer">Согласен на обработку персональных данных</FormLabel>
                  <p className="text-xs text-muted-foreground">В соответствии с ФЗ-152</p>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-95 shadow-lg shadow-primary/25 group"
              disabled={register.isPending}
            >
              {register.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Создаём аккаунт...
                </>
              ) : (
                <>
                  Создать аккаунт
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </motion.div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-emerald-500" /> 50 бесплатных токенов сразу после регистрации
          </div>
        </form>
      </Form>

      <OauthDivider />

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-11 hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => handleOauth("vk")}
          disabled={oauthLogin.isPending}
        >
          <VkIcon className="w-5 h-5 mr-2 text-[#0077FF]" /> ВКонтакте
        </Button>
        <Button
          variant="outline"
          className="h-11 hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => handleOauth("yandex")}
          disabled={oauthLogin.isPending}
        >
          <YandexIcon className="w-5 h-5 mr-2" /> Яндекс ID
        </Button>
      </div>
    </AuthShell>
  );
}
