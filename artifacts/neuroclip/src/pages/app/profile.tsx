import { useState, useEffect } from "react";
import { useGetCurrentUser, useUpdateCurrentUser, useLogoutUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Save, LogOut, User as UserIcon, Shield, CreditCard } from "lucide-react";

export default function Profile() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser();
  const updateProfile = useUpdateCurrentUser();
  const logout = useLogoutUser();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  const handleSave = () => {
    updateProfile.mutate({ data: { name, phone, avatarUrl } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        toast.success("Профиль успешно обновлен");
      },
      onError: () => toast.error("Ошибка при обновлении профиля")
    });
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation("/");
      }
    });
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Профиль</h1>
        <p className="text-muted-foreground">Управление личными данными аккаунта</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Личные данные</CardTitle>
            <CardDescription>Измените информацию о себе</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-2 border-border shadow-sm">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="avatar">URL Аватара</Label>
                <Input 
                  id="avatar" 
                  value={avatarUrl} 
                  onChange={e => setAvatarUrl(e.target.value)} 
                  placeholder="https://..." 
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  Email
                  <span className="text-xs font-normal text-muted-foreground">(используется как логин)</span>
                </Label>
                <Input id="email" value={user.email} readOnly disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">
                  Чтобы сменить email — напишите в{" "}
                  <a className="text-primary hover:underline" href="mailto:support@neuroclip.ru">поддержку</a>.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" />
              </div>
            </div>

          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-between">
            <Button variant="ghost" className="text-destructive" onClick={() => setIsLogoutOpen(true)}>
              <LogOut className="w-4 h-4 mr-2" /> Выйти
            </Button>
            <Button onClick={handleSave} disabled={updateProfile.isPending}>
              <Save className="w-4 h-4 mr-2" /> Сохранить изменения
            </Button>
          </CardFooter>
        </Card>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Ваш тариф
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{user.planName}</div>
              <p className="text-sm text-muted-foreground mb-4">Баланс: {user.tokenBalance} токенов</p>
              <Link href="/app/billing">
                <Button variant="outline" className="w-full">Управление подпиской</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" /> Безопасность
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Роль:</span>
                  <span className="font-medium text-foreground">{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Регистрация:</span>
                  <span className="font-medium text-foreground">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выход из аккаунта</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите выйти? Для продолжения работы потребуется авторизоваться снова.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
