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
import { useLoginUser, useOauthLogin, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog";
import { AuthShell, OauthDivider, VkIcon, YandexIcon } from "@/components/auth/auth-shell";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLoginUser();
  const oauthLogin = useOauthLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      await login.mutateAsync({ data });
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast.success("С возвращением!");
      setLocation("/app/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Ошибка входа. Проверьте почту и пароль.");
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
      title="С возвращением!"
      subtitle={
        <>
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Создать
          </Link>
        </>
      }
      sideTitle="Ваша мини-студия всегда под рукой"
      sideText="Управляйте проектами, создавайте видеоролики из текста и привлекайте больше аудитории — всё в одном окне."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                <div className="flex items-center justify-between">
                  <FormLabel>Пароль</FormLabel>
                  <ForgotPasswordDialog
                    trigger={
                      <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Забыли?
                      </button>
                    }
                  />
                </div>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      autoComplete="current-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
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
                <FormMessage />
              </FormItem>
            )}
          />
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-95 shadow-lg shadow-primary/25 group"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Вход...
                </>
              ) : (
                <>
                  Войти
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </motion.div>
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

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Продолжая, вы соглашаетесь с{" "}
        <a className="underline underline-offset-2 hover:text-foreground transition-colors">условиями использования</a>{" "}
        и{" "}
        <a className="underline underline-offset-2 hover:text-foreground transition-colors">политикой конфиденциальности</a>.
      </p>
    </AuthShell>
  );
}
