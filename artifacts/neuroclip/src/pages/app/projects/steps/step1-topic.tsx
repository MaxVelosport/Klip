import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useSearch } from "wouter";
import {
  useCreateProject,
  useUpdateProject,
  useGenerateScript,
  useListPresets,
  getGetProjectQueryKey,
  Project,
  CreateProjectRequestCategory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Wand2, Check, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StepInstructions } from "@/components/step-instructions";
import { HelpTip } from "@/components/help-tip";
import { CATEGORIES, CATEGORY_MAP, type CategoryId } from "@/lib/categories";
import { SourceFileUpload } from "@/components/projects/source-file-upload";
import { GenerationOverlay } from "@/components/projects/generation-overlay";
import { UrlImport } from "@/components/projects/url-import";
import { TEMPLATE_MAP, type TemplateId, type VideoTemplate } from "@/lib/video-templates";

const formSchema = z.object({
  category: z.string().min(1, "Выберите категорию"),
  title: z.string().min(3, "Минимум 3 символа").max(100, "Максимум 100 символов"),
  topicDescription: z
    .string()
    .min(20, "Опишите подробнее (минимум 20 символов)")
    .max(1000, "Максимум 1000 символов"),
  targetDurationSec: z.coerce.number().min(60),
  visualStyle: z.string().min(1, "Выберите стиль"),
  voiceId: z.string().min(1, "Выберите голос"),
  backgroundMusicId: z.string().optional(),
  addSubtitles: z.boolean().default(true),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Step1Topic({ isNew, project }: { isNew?: boolean; project?: Project }) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: presets, isLoading: isPresetsLoading } = useListPresets();

  // Параметр шаблона из URL (?template=...). Сначала пытаемся через wouter,
  // затем — через window.location.search как надёжный fallback.
  const templateId = (() => {
    try {
      const fromHook = new URLSearchParams(search).get("template");
      if (fromHook) return fromHook as TemplateId;
      if (typeof window !== "undefined") {
        const fromWindow = new URLSearchParams(window.location.search).get("template");
        if (fromWindow) return fromWindow as TemplateId;
      }
    } catch {
      /* noop */
    }
    return null;
  })();
  const appliedTemplate: VideoTemplate | null =
    isNew && templateId && TEMPLATE_MAP[templateId] ? TEMPLATE_MAP[templateId] : null;

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const generateScript = useGenerateScript();

  const isFree = user?.planId === "free";
  const isStandard = user?.planId === "standard";

  const projectCategory = (project?.category as CategoryId | undefined) ?? null;
  const [stage, setStage] = useState<"category" | "details">(projectCategory ? "details" : "category");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(projectCategory);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: projectCategory ?? "",
      title: project?.title || "",
      topicDescription: project?.topicDescription || "",
      targetDurationSec: project?.targetDurationSec || 180,
      visualStyle: project?.visualStyle || "",
      voiceId: project?.voiceId || "",
      backgroundMusicId: project?.backgroundMusicId || "none",
      addSubtitles: project?.addSubtitles ?? true,
      aspectRatio: (project?.aspectRatio as "16:9" | "9:16" | "1:1") || "16:9",
    },
  });

  const topicDesc = form.watch("topicDescription");

  function pickCategory(catId: CategoryId) {
    const cat = CATEGORY_MAP[catId];
    setSelectedCategory(catId);
    form.setValue("category", catId, { shouldValidate: true });
    if (isNew || !project) {
      const styleAvailable = (s: { proOnly?: boolean }) => !s.proOnly || user?.planId === "pro";
      const voiceAvailable = (v: { proOnly?: boolean }) => !v.proOnly || !isFree;
      const preferredStyle =
        presets?.visualStyles.find((s) => s.value === cat.defaults.visualStyle && styleAvailable(s)) ??
        presets?.visualStyles.find(styleAvailable);
      const preferredVoice =
        presets?.voices.find((v) => v.id === cat.defaults.voiceId && voiceAvailable(v)) ??
        presets?.voices.find(voiceAvailable);
      const validMusic = cat.defaults.backgroundMusicId
        ? presets?.music.find((m) => m.id === cat.defaults.backgroundMusicId)?.id ?? "none"
        : "none";
      const maxDur = isFree ? 300 : isStandard ? 600 : 7200;
      form.setValue("targetDurationSec", Math.min(cat.defaults.durationSec, maxDur));
      if (preferredStyle) form.setValue("visualStyle", preferredStyle.value);
      if (preferredVoice) form.setValue("voiceId", preferredVoice.id);
      form.setValue("backgroundMusicId", validMusic);
      form.setValue("addSubtitles", cat.defaults.addSubtitles);
    }
    setStage("details");
  }

  // Применяем шаблон: при первой загрузке presets, если ?template=... — подставляем поля
  const [templateApplied, setTemplateApplied] = useState(false);
  useEffect(() => {
    if (!appliedTemplate || !presets || templateApplied) return;
    const t = appliedTemplate;
    const styleAvailable = (s: { proOnly?: boolean }) => !s.proOnly || user?.planId === "pro";
    const voiceAvailable = (v: { proOnly?: boolean }) => !v.proOnly || !isFree;
    const style =
      presets.visualStyles.find((s) => s.value === t.visualStyle && styleAvailable(s)) ??
      presets.visualStyles.find(styleAvailable);
    const voice =
      presets.voices.find((v) => v.id === t.voiceId && voiceAvailable(v)) ??
      presets.voices.find(voiceAvailable);
    const music = presets.music.find((m) => m.id === t.musicId)?.id ?? "none";
    const maxDur = isFree ? 300 : isStandard ? 600 : 7200;

    setSelectedCategory(t.category);
    form.setValue("category", t.category, { shouldValidate: true });
    form.setValue("title", t.name);
    form.setValue("topicDescription", t.sampleTopic);
    form.setValue("targetDurationSec", Math.min(t.durationSec, maxDur));
    if (style) form.setValue("visualStyle", style.value);
    if (voice) form.setValue("voiceId", voice.id);
    form.setValue("backgroundMusicId", music);
    form.setValue("addSubtitles", t.addSubtitles);
    form.setValue("aspectRatio", t.aspectRatio);
    setStage("details");
    setTemplateApplied(true);
  }, [appliedTemplate, presets, templateApplied, form, isFree, isStandard, user?.planId]);

  // ensure selected presets resolve once presets are loaded
  useEffect(() => {
    if (!presets || !selectedCategory) return;
    if (!form.getValues("visualStyle")) {
      const def = CATEGORY_MAP[selectedCategory].defaults.visualStyle;
      const valid = presets.visualStyles.find((s) => s.value === def);
      if (valid) form.setValue("visualStyle", valid.value);
    }
    if (!form.getValues("voiceId")) {
      const def = CATEGORY_MAP[selectedCategory].defaults.voiceId;
      const valid = presets.voices.find((v) => v.id === def);
      if (valid) form.setValue("voiceId", valid.id);
    }
  }, [presets, selectedCategory, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      const payload = {
        ...data,
        category: data.category as CreateProjectRequestCategory,
        backgroundMusicId: data.backgroundMusicId === "none" ? null : data.backgroundMusicId,
        aspectRatio: data.aspectRatio,
      };

      if (isNew) {
        const newProject = await createProject.mutateAsync({ data: payload });
        await generateScript.mutateAsync({ id: newProject.id });
        toast.success("Проект создан. ИИ пишет сценарий...");
        setLocation(`/app/projects/${newProject.id}`);
      } else if (project) {
        await updateProject.mutateAsync({
          id: project.id,
          data: { ...payload, currentStep: 2 },
        });
        await generateScript.mutateAsync({ id: project.id });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
        toast.success("Сохранено. ИИ обновляет сценарий...");
      }
    } catch (e: any) {
      toast.error(e.message || "Произошла ошибка");
    }
  };

  if (isPresetsLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const durations = [
    { value: 60, label: "1 мин" },
    { value: 180, label: "3 мин" },
    { value: 300, label: "5 мин" },
    { value: 600, label: "10 мин" },
    { value: 1800, label: "30 мин" },
    { value: 7200, label: "120 мин" },
  ];

  const cat = selectedCategory ? CATEGORY_MAP[selectedCategory] : null;

  const isGenerating =
    createProject.isPending || updateProject.isPending || generateScript.isPending;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <StepInstructions
        stepKey="step1"
        title="Шаг 1 из 6 · Тема и описание"
        intro="Расскажите, о чём ролик — ИИ возьмёт идею в работу"
        estimate="1 мин"
        bullets={[
          "Придумайте короткое название (например, «Топ-5 фактов про космос»).",
          "Выберите категорию — это поможет ИИ правильно выбрать стиль изложения.",
          "Кратко опишите, для кого видео и что важно рассказать.",
          "Нажмите «Сгенерировать сценарий» — на следующем шаге появится готовый текст.",
        ]}
        tip="Чем конкретнее тема — тем лучше сценарий. «Космос» — слабо, «Чёрные дыры за 60 секунд для подростков» — отлично."
      />
      <GenerationOverlay visible={isGenerating} />
      {appliedTemplate && stage === "details" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <div className="text-2xl">{appliedTemplate.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-primary font-semibold">
              Шаблон применён
            </div>
            <div className="font-medium text-sm truncate">{appliedTemplate.name}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/app/templates")}
          >
            Сменить
          </Button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {stage === "category" ? (
          <motion.div
            key="category"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Шаг 1 из 6 · Цель видео
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Какое видео вы создаёте?</h2>
              <p className="text-muted-foreground">
                Выберите категорию — мы подберём оптимальный стиль, голос, темп и шаблон сценария именно под вашу задачу.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-4">
              {CATEGORIES.map((c, i) => {
                const Icon = c.Icon;
                const isSelected = selectedCategory === c.id;
                return (
                  <motion.button
                    key={c.id}
                    type="button"
                    onClick={() => pickCategory(c.id)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group relative text-left p-5 rounded-2xl border-2 bg-card transition-all overflow-hidden ${
                      isSelected
                        ? "border-primary shadow-lg shadow-primary/20"
                        : "border-border hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-[0.04] bg-gradient-to-br ${c.gradient} transition-opacity`}
                    />
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-base mb-1 leading-tight">{c.label}</h3>
                    <p className="text-xs text-muted-foreground leading-snug mb-3">{c.tagline}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.features.slice(0, 2).map((f) => (
                        <span
                          key={f}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            {cat && (
              <div className="flex items-start gap-4 p-4 rounded-2xl border bg-gradient-to-br from-card to-card/50 relative overflow-hidden">
                <div className={`absolute inset-0 opacity-[0.04] bg-gradient-to-br ${cat.gradient}`} />
                <div className={`w-12 h-12 rounded-xl ${cat.iconBg} flex items-center justify-center shrink-0 relative`}>
                  <cat.Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 relative">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold">{cat.label}</h2>
                    <Badge variant="secondary" className="text-[10px]">Шаг 1 из 6</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </div>
                {(isNew || !project) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStage("category")}
                    className="relative shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Сменить
                  </Button>
                )}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название проекта</FormLabel>
                          <FormControl>
                            <Input placeholder={cat?.hints.titlePlaceholder ?? "Мой ролик"} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="topicDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>О чём видео?</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={cat?.hints.topicPlaceholder ?? "Опишите идею..."}
                              className="h-40 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                            <span>Чем подробнее опишете — тем точнее будет сценарий.</span>
                            <span>{topicDesc.length}/1000</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <SourceFileUpload
                      onExtracted={(text, name) => {
                        const current = form.getValues("topicDescription").trim();
                        const note = `Источник: ${name}`;
                        const merged = current
                          ? `${current}\n\n${note}\n${text}`
                          : `${note}\n${text}`;
                        const limited = merged.slice(0, 1000);
                        form.setValue("topicDescription", limited, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        if (merged.length > 1000) {
                          toast.info(
                            `Описание ограничено 1000 символами — оставили самое начало материала. Полный текст пойдёт в исходник на этапе сценария.`,
                          );
                        }
                      }}
                    />

                    <UrlImport
                      onExtracted={(text, sourceUrl, title) => {
                        const current = form.getValues("topicDescription").trim();
                        const note = `Источник: ${sourceUrl}`;
                        const merged = current
                          ? `${current}\n\n${note}\n${text}`
                          : `${note}\n${text}`;
                        const limited = merged.slice(0, 1000);
                        form.setValue("topicDescription", limited, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        if (title && !form.getValues("title").trim()) {
                          form.setValue("title", title.slice(0, 100), {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                    />

                    {cat && (
                      <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Что подготовит ИИ для этой категории
                        </div>
                        <ul className="space-y-1.5">
                          {cat.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="aspectRatio"
                      render={({ field }) => {
                        const options: Array<{
                          value: "16:9" | "9:16" | "1:1";
                          label: string;
                          hint: string;
                          frameClass: string;
                          gradient: string;
                        }> = [
                          {
                            value: "16:9",
                            label: "Горизонтальное",
                            hint: "YouTube, длинные ролики",
                            frameClass: "w-12 h-7",
                            gradient: "from-sky-500 to-blue-500",
                          },
                          {
                            value: "9:16",
                            label: "Вертикальное",
                            hint: "Reels, Shorts, VK Клипы",
                            frameClass: "w-7 h-12",
                            gradient: "from-fuchsia-500 to-pink-500",
                          },
                          {
                            value: "1:1",
                            label: "Квадрат",
                            hint: "Лента ВК, Instagram",
                            frameClass: "w-10 h-10",
                            gradient: "from-amber-500 to-orange-500",
                          },
                        ];
                        return (
                          <FormItem>
                            <FormLabel>Соотношение сторон</FormLabel>
                            <div className="grid grid-cols-3 gap-2" data-testid="aspect-ratio-picker">
                              {options.map((o) => {
                                const active = field.value === o.value;
                                return (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => field.onChange(o.value)}
                                    data-testid={`aspect-${o.value.replace(":", "-")}`}
                                    className={`group relative rounded-xl border-2 p-3 transition-all active:scale-[0.97] ${
                                      active
                                        ? "border-primary bg-primary/5 shadow-md shadow-primary/15"
                                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                                    }`}
                                  >
                                    <div className="flex items-center justify-center h-14">
                                      <div
                                        className={`${o.frameClass} rounded-md bg-gradient-to-br ${o.gradient} shadow-sm transition-transform group-hover:scale-105`}
                                      />
                                    </div>
                                    <div className="mt-1 text-center">
                                      <div className="text-sm font-semibold">{o.value}</div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {o.label}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground/80">
                                        {o.hint}
                                      </div>
                                    </div>
                                    {active && (
                                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                        <Check className="w-3 h-3" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <FormDescription>
                              Видео и превью будут сгенерированы в выбранном формате.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="targetDurationSec"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Примерная длительность</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите длительность" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {durations.map((d) => {
                                let disabled = false;
                                if (isFree && d.value > 300) disabled = true;
                                if (isStandard && d.value > 600) disabled = true;
                                return (
                                  <SelectItem key={d.value} value={d.value.toString()} disabled={disabled}>
                                    {d.label} {disabled && "(Недоступно в вашем тарифе)"}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormDescription>Рекомендация для категории — {Math.round((cat?.defaults.durationSec ?? 180) / 60)} мин.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visualStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Визуальный стиль</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите стиль" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {presets?.visualStyles.map((style) => (
                                <SelectItem
                                  key={style.value}
                                  value={style.value}
                                  disabled={style.proOnly && user?.planId !== "pro"}
                                >
                                  <div className="flex items-center gap-2">
                                    {style.label}
                                    {style.proOnly && (
                                      <Badge variant="secondary" className="text-[10px] uppercase">
                                        PRO
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="voiceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Голос диктора</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите голос" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {presets?.voices.map((voice) => (
                                <SelectItem
                                  key={voice.id}
                                  value={voice.id}
                                  disabled={voice.proOnly && isFree}
                                >
                                  <div className="flex items-center gap-2">
                                    {voice.label} ({voice.gender})
                                    {voice.proOnly && (
                                      <Badge variant="secondary" className="text-[10px] uppercase">
                                        PRO
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="backgroundMusicId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Фоновая музыка</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите музыку" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Без музыки</SelectItem>
                              {presets?.music.map((music) => (
                                <SelectItem key={music.id} value={music.id}>
                                  {music.label} ({music.mood})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="addSubtitles"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Добавить субтитры</FormLabel>
                            <FormDescription>Автоматически сгенерировать красивые субтитры</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t mt-auto">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={createProject.isPending || updateProject.isPending || generateScript.isPending}
                    className="bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-95 shadow-lg shadow-primary/25"
                  >
                    {(createProject.isPending || updateProject.isPending || generateScript.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {isNew ? (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" /> Сгенерировать сценарий
                      </>
                    ) : (
                      "Далее"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
