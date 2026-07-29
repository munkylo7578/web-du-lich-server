"use client";

import { useCallback, useEffect } from "react";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PendingImageMeta } from "@/features/admin-tours/tour-form-schema";
import type { AdminTourImage } from "@/features/admin-tours/tour-types";

export type PendingImage = PendingImageMeta & { file: File; previewUrl: string };

export function ImageUploadField({
  existing,
  pending,
  onExistingChange,
  onPendingChange,
}: {
  existing: AdminTourImage[];
  pending: PendingImage[];
  onExistingChange: (images: AdminTourImage[]) => void;
  onPendingChange: (images: PendingImage[]) => void;
}) {
  const addFiles = useCallback(
    (files: File[]) => {
      const start = existing.length + pending.length;
      const additions = files.map((file, index) => ({
        clientId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        altText: "",
        role: start + index === 0 ? ("cover" as const) : ("gallery" as const),
        sortOrder: start + index,
      }));
      onPendingChange([...pending, ...additions]);
    },
    [existing.length, onPendingChange, pending],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/avif": [] },
    maxSize: 8 * 1024 * 1024,
    onDrop: addFiles,
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
      if (files.length) addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const setCover = (kind: "existing" | "pending", id: string) => {
    onExistingChange(existing.map((image) => ({ ...image, role: kind === "existing" && image.imageId === id ? "cover" : "gallery" })));
    onPendingChange(pending.map((image) => ({ ...image, role: kind === "pending" && image.clientId === id ? "cover" : "gallery" })));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-7 text-center transition-colors hover:bg-muted/60",
          isDragActive && "border-primary bg-primary/5",
        )}
      >
        <input {...getInputProps()} />
        <div className="mb-3 rounded-xl border bg-background p-2.5 shadow-sm"><Upload className="size-5" /></div>
        <p className="font-medium">Kéo thả, chọn hoặc paste ảnh</p>
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP, AVIF · tối đa 8MB · chỉ upload khi lưu tour</p>
      </div>

      {!existing.length && !pending.length ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground"><ImagePlus className="size-4" /> Chưa có ảnh nào.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {existing.map((image) => (
            <ImageCard
              key={image.imageId}
              src={image.url}
              altText={image.altText || ""}
              isCover={image.role === "cover"}
              onCover={() => setCover("existing", image.imageId)}
              onAlt={(altText) => onExistingChange(existing.map((item) => item.imageId === image.imageId ? { ...item, altText } : item))}
              onRemove={() => onExistingChange(existing.filter((item) => item.imageId !== image.imageId))}
            />
          ))}
          {pending.map((image) => (
            <ImageCard
              key={image.clientId}
              src={image.previewUrl}
              altText={image.altText}
              isCover={image.role === "cover"}
              onCover={() => setCover("pending", image.clientId)}
              onAlt={(altText) => onPendingChange(pending.map((item) => item.clientId === image.clientId ? { ...item, altText } : item))}
              onRemove={() => {
                URL.revokeObjectURL(image.previewUrl);
                onPendingChange(pending.filter((item) => item.clientId !== image.clientId));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({ src, altText, isCover, onCover, onAlt, onRemove }: {
  src: string; altText: string; isCover: boolean; onCover: () => void; onAlt: (value: string) => void; onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={altText || "Ảnh xem trước"} className="aspect-[16/10] w-full object-cover" />
      <div className="space-y-2 p-3">
        <Input value={altText} onChange={(event) => onAlt(event.target.value)} placeholder="Alt text cho ảnh" />
        <div className="flex gap-2">
          <Button type="button" variant={isCover ? "secondary" : "outline"} className="flex-1" onClick={onCover}><Star data-icon="inline-start" />{isCover ? "Ảnh bìa" : "Đặt làm bìa"}</Button>
          <Button type="button" variant="destructive" size="icon" aria-label="Xóa ảnh" onClick={onRemove}><Trash2 /></Button>
        </div>
      </div>
    </div>
  );
}
