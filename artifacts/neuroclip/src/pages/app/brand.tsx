import { useEffect, useState } from "react";
import { useGetBrandKit, useUpdateBrandKit, getGetBrandKitQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Save, Image as ImageIcon, Type, Droplet } from "lucide-react";
import { motion } from "framer-motion";

const FONTS: { value: string; label: string; sample: string }[] = [
  { value: "inter", label: "Inter", sample: "Чистый, современный sans-serif" },
  { value: "manrope", label: "Manrope", sample: "Геометрический, дружелюбный" },
  { value: "rubik", label: "Rubik", sample: "Округлый, отлично для соцсетей" },
  { value: "playfair", label: "Playfair Display", sample: "Премиум, классический serif" },
  { value: "montserrat", label: "Montserrat", sample: "Универсальный, для заголовков" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function BrandKitPage() {
  const { data, isLoading } = useGetBrandKit();
  const updateBrandKit = useUpdateBrandKit();
  const queryClient = useQueryClient();

  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [accentColor, setAccentColor] = useState("#06b6d4");
  const [fontChoice, setFontChoice] = useState("inter");
  const [watermarkText, setWatermarkText] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
    if (!data) return;
    setBrandName(data.brandName ?? "");
    setLogoUrl(data.logoUrl ?? "");
    setPrimaryColor(data.primaryColor ?? "#7c3aed");
    setAccentColor(data.accentColor ?? "#06b6d4");
    setFontChoice(data.fontChoice ?? "inter");
    setWatermarkText(data.watermarkText ?? "");
    setTagline(data.tagline ?? "");
  }, [data]);

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  const primaryValid = HEX_RE.test(primaryColor);
  const accentValid = HEX_RE.test(accentColor);
  const canSave = primaryValid && accentValid && !updateBrandKit.isPending;

  const handleSave = async () => {
    if (!primaryValid || !accentValid) {
      toast.error("Цвета должны быть в формате #RRGGBB");
      return;
    }
    try {
      await updateBrandKit.mutateAsync({
        data: {
          brandName: brandName.trim(),
          logoUrl: logoUrl.trim() || null,
          primaryColor,
          accentColor,
          fontChoice: fontChoice as "inter" | "manrope" | "rubik" | "playfair" | "montserrat",
          watermarkText: watermarkText.trim(),
          tagline: tagline.trim(),
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetBrandKitQueryKey() });
      toast.success("Бренд-кит сохранён");
    } catch {
      toast.error("Не удалось сохранить");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl" data-testid="brand-kit-page">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
            <Palette className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-bold">Бренд-кит</h1>
        </div>
        <p className="text-muted-foreground">
          Логотип, цвета и водяной знак автоматически применяются ко всем новым видео и подписям к постам.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Идентичность
              </CardTitle>
              <CardDescription>Название и слоган используются в подписях к социальным постам.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="brandName">Название бренда</Label>
                <Input
                  id="brandName"
                  data-testid="input-brand-name"
                  value={brandName}
                  maxLength={60}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Моя студия"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="tagline">Слоган</Label>
                <Input
                  id="tagline"
                  data-testid="input-tagline"
                  value={tagline}
                  maxLength={120}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Создаём контент, который покоряет"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="watermark">Водяной знак (текст)</Label>
                <Input
                  id="watermark"
                  data-testid="input-watermark"
                  value={watermarkText}
                  maxLength={80}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="@my_brand"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">Будет добавляться в правый нижний угол итогового видео.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Логотип
              </CardTitle>
              <CardDescription>Ссылка на PNG/SVG. Прозрачный фон рекомендуется.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logoUrl">URL логотипа</Label>
                <Input
                  id="logoUrl"
                  data-testid="input-logo-url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  disabled={isLoading}
                />
              </div>
              {logoUrl.trim() && (
                <div className="rounded-lg border bg-muted/30 p-6 flex items-center justify-center min-h-[120px]">
                  {!logoBroken ? (
                    <img
                      src={logoUrl}
                      alt="Логотип"
                      className="max-h-20 object-contain"
                      onError={() => setLogoBroken(true)}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">Не удалось загрузить логотип по этому адресу</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplet className="w-4 h-4" /> Цвета
              </CardTitle>
              <CardDescription>Используются для оверлеев, акцентов в превью и оформлении.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <ColorField
                id="primaryColor"
                testId="input-primary-color"
                label="Основной"
                value={primaryColor}
                onChange={setPrimaryColor}
                valid={primaryValid}
              />
              <ColorField
                id="accentColor"
                testId="input-accent-color"
                label="Акцентный"
                value={accentColor}
                onChange={setAccentColor}
                valid={accentValid}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Шрифт
              </CardTitle>
              <CardDescription>Применяется к заголовкам в постах и подписям.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={fontChoice} onValueChange={setFontChoice}>
                <SelectTrigger data-testid="select-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{f.label}</span>
                        <span className="text-xs text-muted-foreground">{f.sample}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="md:col-span-1">
          <div className="md:sticky md:top-6 space-y-4">
            <Card className="overflow-hidden" data-testid="brand-preview">
              <div
                className="h-32 relative"
                style={{
                  background: `linear-gradient(135deg, ${primaryValid ? primaryColor : "#7c3aed"}, ${accentValid ? accentColor : "#06b6d4"})`,
                }}
              >
                {logoUrl.trim() && !logoBroken && (
                  <img
                    src={logoUrl}
                    alt=""
                    className="absolute top-3 left-3 h-8 object-contain bg-white/90 rounded px-2 py-1"
                    onError={() => setLogoBroken(true)}
                  />
                )}
                {watermarkText.trim() && (
                  <div className="absolute bottom-2 right-2 text-white/95 text-xs font-medium drop-shadow">
                    {watermarkText}
                  </div>
                )}
              </div>
              <CardContent className="pt-4 space-y-2">
                <div className="text-lg font-bold truncate" data-testid="preview-brand-name">
                  {brandName.trim() || "Название бренда"}
                </div>
                {tagline.trim() && (
                  <div className="text-sm text-muted-foreground line-clamp-2">{tagline}</div>
                )}
                <div className="flex gap-2 pt-2">
                  <Swatch color={primaryValid ? primaryColor : "#7c3aed"} label="Основной" />
                  <Swatch color={accentValid ? accentColor : "#06b6d4"} label="Акцент" />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full"
              size="lg"
              data-testid="button-save-brand"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateBrandKit.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  id, testId, label, value, onChange, valid,
}: {
  id: string; testId: string; label: string; value: string; onChange: (v: string) => void; valid: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={valid ? value : "#7c3aed"}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded border cursor-pointer bg-transparent"
          aria-label={`${label} — выбор цвета`}
        />
        <Input
          id={id}
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={!valid ? "border-destructive" : ""}
          maxLength={7}
        />
      </div>
      {!valid && <p className="text-xs text-destructive mt-1">Формат: #RRGGBB</p>}
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="h-8 rounded border" style={{ background: color }} />
      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}
