import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUp, FileText, FileImage, FileType, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  onExtracted: (text: string, fileName: string) => void;
  baseUrl?: string;
}

const ACCEPT = ".txt,.md,.csv,.json,.html,.pdf,.docx,image/*";
const MAX_BYTES = 10 * 1024 * 1024;

function pickIcon(name: string) {
  if (/\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(name)) return FileImage;
  if (/\.pdf$/i.test(name)) return FileType;
  if (/\.docx$/i.test(name)) return FileText;
  return FileText;
}

export function SourceFileUpload({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastFile, setLastFile] = useState<{ name: string; chars: number; truncated: boolean } | null>(null);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Файл слишком большой. Максимум 10 МБ.");
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${import.meta.env.BASE_URL}api/extract-text`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Не удалось прочитать файл");
      }
      const data = await res.json();
      const text = String(data.text || "").trim();
      if (!text) {
        toast.error("В файле не нашлось текста для распознавания");
        return;
      }
      onExtracted(text, file.name);
      setLastFile({ name: file.name, chars: text.length, truncated: !!data.truncated });
      toast.success(`Готово: вставлено ${text.length} символов из «${file.name}»`);
    } catch (e: any) {
      toast.error(e.message || "Ошибка при чтении файла");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const Icon = lastFile ? pickIcon(lastFile.name) : FileUp;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      className={`relative rounded-xl border-2 border-dashed transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : lastFile
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-border hover:border-primary/40 bg-muted/20"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <div className="p-4 flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            lastFile
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-primary/10 text-primary"
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : lastFile ? (
            <Check className="w-5 h-5" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {lastFile ? (
              <motion.div
                key="have"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="min-w-0"
              >
                <div className="text-sm font-medium truncate">{lastFile.name}</div>
                <div className="text-xs text-muted-foreground">
                  Распознано {lastFile.chars.toLocaleString("ru-RU")} символов
                  {lastFile.truncated && " · текст обрезан до 8 000"}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <div className="text-sm font-medium">Загрузить материал</div>
                <div className="text-xs text-muted-foreground">
                  Перетащите файл или выберите: .txt, .md, .pdf, .docx, изображение (с распознаванием текста)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {lastFile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLastFile(null)}
              title="Убрать"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="button"
            variant={lastFile ? "outline" : "default"}
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Читаем…
              </>
            ) : lastFile ? (
              "Заменить"
            ) : (
              <>
                <FileUp className="w-3.5 h-3.5 mr-2" /> Выбрать файл
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
