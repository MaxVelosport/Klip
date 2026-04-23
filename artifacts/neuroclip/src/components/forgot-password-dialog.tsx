import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LifeBuoy, Mail, MessageCircle, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ForgotPasswordDialogProps {
  trigger: React.ReactNode;
}

const SUPPORT_EMAIL = "support@neuroclip.ru";
const SUPPORT_TG = "https://t.me/neuroclip_support";

/**
 * Восстановление пароля. Пока нет почтового сервиса — показываем понятный
 * процесс через поддержку: пользователь оставляет email, мы копируем шаблон
 * письма и даём прямые ссылки на email/Telegram.
 */
export function ForgotPasswordDialog({ trigger }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const buildSubject = () => "Восстановление пароля в НейроКлип";
  const buildBody = (e: string) =>
    `Здравствуйте! Прошу помочь восстановить доступ к аккаунту НейроКлип.\n\nEmail аккаунта: ${e || "(укажите email)"}\n\nСпасибо!`;

  const mailto = () =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(buildSubject())}&body=${encodeURIComponent(
      buildBody(email),
    )}`;

  const copyTemplate = async () => {
    await navigator.clipboard.writeText(`Кому: ${SUPPORT_EMAIL}\nТема: ${buildSubject()}\n\n${buildBody(email)}`);
    toast.success("Шаблон письма скопирован");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Dialog onOpenChange={() => setSubmitted(false)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <DialogTitle>Восстановление пароля</DialogTitle>
          <DialogDescription>
            Укажите ваш email — мы поможем восстановить доступ через службу поддержки.
            Обычно отвечаем в течение 1 рабочего дня.
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email вашего аккаунта</Label>
              <Input
                id="forgot-email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                Продолжить
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Свяжитесь с поддержкой одним из способов ниже — мы пришлём ссылку для сброса пароля.
              </span>
            </div>
            <a href={mailto()} className="block">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="w-4 h-4 mr-2" /> Написать на {SUPPORT_EMAIL}
              </Button>
            </a>
            <a href={SUPPORT_TG} target="_blank" rel="noreferrer" className="block">
              <Button variant="outline" className="w-full justify-start">
                <MessageCircle className="w-4 h-4 mr-2" /> Написать в Telegram
              </Button>
            </a>
            <Button variant="ghost" className="w-full justify-start" onClick={copyTemplate}>
              <Copy className="w-4 h-4 mr-2" /> Скопировать шаблон письма
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
