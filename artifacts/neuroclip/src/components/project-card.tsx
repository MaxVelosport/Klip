import { ProjectSummary } from "@workspace/api-client-react";
import { formatDuration, formatDistanceRu } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Copy, Trash2, Edit2, Play, Download, Pencil, Eye, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useUpdateProject, useDuplicateProject, useDeleteProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();
  const duplicateProject = useDuplicateProject();
  const deleteProject = useDeleteProject();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isDone = project.status === "done" && !!project.finalVideoUrl;
  const isFailed = project.status === "failed";
  const isRendering = project.status === "rendering";

  const continueLabel =
    isDone ? "Открыть" :
    isRendering ? "Смотреть прогресс" :
    isFailed ? "Исправить и пересобрать" :
    project.currentStep && project.currentStep > 1 ? "Продолжить" : "Открыть";

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project.finalVideoUrl) return;
    const a = document.createElement("a");
    a.href = project.finalVideoUrl;
    const safeName = project.title.replace(/[^\p{L}\p{N}\-_ ]+/gu, "").trim() || "video";
    a.download = `${safeName}.mp4`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Скачивание началось");
  };

  const handleRename = () => {
    if (!renameValue.trim() || renameValue === project.title) {
      setIsRenameOpen(false);
      return;
    }
    updateProject.mutate({ id: project.id, data: { title: renameValue } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast.success("Проект переименован");
        setIsRenameOpen(false);
      },
      onError: () => toast.error("Ошибка при переименовании")
    });
  };

  const handleDuplicate = () => {
    duplicateProject.mutate({ id: project.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast.success("Проект скопирован");
      },
      onError: () => toast.error("Ошибка при копировании")
    });
  };

  const handleDelete = () => {
    deleteProject.mutate({ id: project.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast.success("Проект удален");
        setIsDeleteOpen(false);
      },
      onError: () => toast.error("Ошибка при удалении")
    });
  };

  return (
    <>
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden group cursor-pointer border-border hover:border-primary/50 hover:shadow-lg transition-all flex flex-col" onClick={() => setLocation(`/app/projects/${project.id}`)}>
          <div className="relative aspect-video bg-muted border-b flex items-center justify-center overflow-hidden">
            {project.thumbnailUrl ? (
              <img src={project.thumbnailUrl} alt={project.title} className="object-cover w-full h-full" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/50 flex items-center justify-center">
                <Play className="w-10 h-10 text-primary/40" />
              </div>
            )}

            {/* Hover-overlay для готового видео — большая кнопка Play */}
            {isDone && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
                className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                aria-label="Предпросмотр видео"
              >
                <span className="w-14 h-14 rounded-full bg-white/95 text-primary flex items-center justify-center shadow-2xl">
                  <Play className="w-7 h-7 ml-1" fill="currentColor" />
                </span>
              </button>
            )}

            {/* Прогресс рендера */}
            {isRendering && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                <span className="text-xs font-medium">Идёт рендер...</span>
              </div>
            )}

            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
              {formatDuration(project.durationSec)}
            </div>
            <div className="absolute top-2 left-2">
              <StatusBadge status={project.status} />
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {isDone && (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}>
                        <Eye className="w-4 h-4 mr-2" /> Посмотреть
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" /> Скачать MP4
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/app/projects/${project.id}`); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Доработать / пересобрать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {!isDone && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/app/projects/${project.id}`); }}>
                      <Play className="w-4 h-4 mr-2" /> {continueLabel}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameValue(project.title); setIsRenameOpen(true); }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Переименовать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
                    <Copy className="w-4 h-4 mr-2" /> Дублировать
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setIsDeleteOpen(true); }}>
                    <Trash2 className="w-4 h-4 mr-2" /> Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate mb-1" title={project.title}>
                {project.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                Обновлено {formatDistanceRu(project.updatedAt)}
                {project.sceneCount > 0 && ` · ${project.sceneCount} сцен`}
              </p>
            </div>

            {/* Быстрые действия — видны всегда, без необходимости открывать меню */}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {isDone ? (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
                  >
                    <Play className="w-4 h-4 mr-1.5" fill="currentColor" /> Смотреть
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-1.5" /> Скачать
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant={isFailed ? "destructive" : "default"}
                  className="flex-1"
                  onClick={(e) => { e.stopPropagation(); setLocation(`/app/projects/${project.id}`); }}
                >
                  {isFailed ? <Pencil className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
                  {continueLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать проект</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={renameValue} 
              onChange={(e) => setRenameValue(e.target.value)} 
              placeholder="Название проекта"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>Отмена</Button>
            <Button onClick={handleRename} disabled={updateProject.isPending}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Предпросмотр готового видео прямо из карточки */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="truncate">{project.title}</DialogTitle>
          </DialogHeader>
          <div className="bg-black aspect-video">
            {project.finalVideoUrl && (
              <video
                src={project.finalVideoUrl}
                poster={project.thumbnailUrl || undefined}
                controls
                autoPlay
                className="w-full h-full"
              />
            )}
          </div>
          <DialogFooter className="px-5 py-4 gap-2 sm:gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => { setIsPreviewOpen(false); setLocation(`/app/projects/${project.id}`); }}>
              <Pencil className="w-4 h-4 mr-1.5" /> Доработать в редакторе
            </Button>
            {project.finalVideoUrl && (
              <Button variant="outline" asChild>
                <a href={project.finalVideoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1.5" /> Открыть в новой вкладке
                </a>
              </Button>
            )}
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1.5" /> Скачать MP4
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Проект "{project.title}" будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
