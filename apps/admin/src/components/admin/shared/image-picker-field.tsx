"use client";

import { useCallback, useEffect } from "react";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ImagePickerMode = "single" | "multiple";

export type ImagePickerExistingImage<TMeta = Record<string, unknown>> = {
  id: string;
  url: string;
  altText?: string;
  sortOrder?: number;
  meta?: TMeta;
};

export type ImagePickerPendingImage<TMeta = Record<string, unknown>> = {
  clientId: string;
  file: File;
  previewUrl: string;
  altText?: string;
  sortOrder?: number;
  meta?: TMeta;
};

type ImagePickerItem<TMeta> =
  | { source: "existing"; image: ImagePickerExistingImage<TMeta> }
  | { source: "pending"; image: ImagePickerPendingImage<TMeta> };

export type ImagePickerFieldProps<TMeta = Record<string, unknown>> = {
  mode: ImagePickerMode;
  existing: ImagePickerExistingImage<TMeta>[];
  pending: ImagePickerPendingImage<TMeta>[];
  onExistingChange: (images: ImagePickerExistingImage<TMeta>[]) => void;
  onPendingChange: (images: ImagePickerPendingImage<TMeta>[]) => void;
  createPendingMeta?: (context: { index: number; totalBefore: number }) => TMeta;
  getIsPrimary?: (item: ImagePickerItem<TMeta>) => boolean;
  onPrimaryChange?: (item: ImagePickerItem<TMeta>) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  allowPaste?: boolean;
  allowAltText?: boolean;
  emptyText?: string;
  helperText?: string;
  primaryActiveLabel?: string;
  primaryInactiveLabel?: string;
};

export function ImagePickerField<TMeta = Record<string, unknown>>({
  mode,
  existing,
  pending,
  onExistingChange,
  onPendingChange,
  createPendingMeta,
  getIsPrimary,
  onPrimaryChange,
  maxFiles,
  maxSizeMb = 8,
  allowPaste = true,
  allowAltText = true,
  emptyText = "Chưa có ảnh nào.",
  helperText,
  primaryActiveLabel = "Ảnh chính",
  primaryInactiveLabel = "Đặt làm ảnh chính",
}: ImagePickerFieldProps<TMeta>) {
  const fileLimit = mode === "single" ? 1 : maxFiles;
  const addFiles = useCallback(
    (files: File[]) => {
      const totalBefore = existing.length + pending.length;
      const remainingSlots = fileLimit ? Math.max(fileLimit - totalBefore, 0) : files.length;
      const acceptedFiles = mode === "single" ? files.slice(0, 1) : files.slice(0, remainingSlots);

      if (!acceptedFiles.length) return;

      const additions = acceptedFiles.map((file, index) => ({
        clientId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        altText: "",
        sortOrder: mode === "single" ? 0 : totalBefore + index,
        meta: createPendingMeta?.({ index, totalBefore }),
      }));

      if (mode === "single") {
        pending.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        onExistingChange([]);
        onPendingChange(additions);
        return;
      }

      onPendingChange([...pending, ...additions]);
    },
    [createPendingMeta, existing.length, fileLimit, mode, onExistingChange, onPendingChange, pending],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/avif": [] },
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: mode === "multiple",
    maxFiles: fileLimit,
    onDrop: addFiles,
  });

  useEffect(() => {
    if (!allowPaste) return;

    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
      if (files.length) addFiles(files);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, allowPaste]);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-white/70 bg-white/72 px-6 py-7 text-center shadow-sm transition-colors hover:bg-white/86",
          isDragActive && "border-cyan-400 bg-cyan-100/45",
        )}
      >
        <input {...getInputProps()} />
        <div className="mb-3 rounded-xl border border-white/70 bg-white/70 p-2.5 text-cyan-700 shadow-sm"><Upload className="size-5" /></div>
        <p className="font-medium">Kéo thả, chọn hoặc paste ảnh</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {helperText ?? `JPEG, PNG, WebP, AVIF · tối đa ${maxSizeMb}MB · ${mode === "single" ? "1 ảnh" : "nhiều ảnh"}`}
        </p>
      </div>

      {!existing.length && !pending.length ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground"><ImagePlus className="size-4" /> {emptyText}</div>
      ) : (
        <div className={cn("grid gap-3", mode === "multiple" && "sm:grid-cols-2 lg:grid-cols-3")}>
          {existing.map((image) => {
            const item: ImagePickerItem<TMeta> = { source: "existing", image };

            return (
              <ImageCard
                key={image.id}
                src={image.url}
                altText={image.altText || ""}
                isPrimary={getIsPrimary?.(item) ?? false}
                showPrimaryAction={Boolean(onPrimaryChange)}
                allowAltText={allowAltText}
                primaryActiveLabel={primaryActiveLabel}
                primaryInactiveLabel={primaryInactiveLabel}
                onPrimary={() => onPrimaryChange?.(item)}
                onAlt={(altText) => onExistingChange(existing.map((candidate) => candidate.id === image.id ? { ...candidate, altText } : candidate))}
                onRemove={() => onExistingChange(existing.filter((candidate) => candidate.id !== image.id))}
              />
            );
          })}
          {pending.map((image) => {
            const item: ImagePickerItem<TMeta> = { source: "pending", image };

            return (
              <ImageCard
                key={image.clientId}
                src={image.previewUrl}
                altText={image.altText || ""}
                isPrimary={getIsPrimary?.(item) ?? false}
                showPrimaryAction={Boolean(onPrimaryChange)}
                allowAltText={allowAltText}
                primaryActiveLabel={primaryActiveLabel}
                primaryInactiveLabel={primaryInactiveLabel}
                onPrimary={() => onPrimaryChange?.(item)}
                onAlt={(altText) => onPendingChange(pending.map((candidate) => candidate.clientId === image.clientId ? { ...candidate, altText } : candidate))}
                onRemove={() => {
                  URL.revokeObjectURL(image.previewUrl);
                  onPendingChange(pending.filter((candidate) => candidate.clientId !== image.clientId));
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ImageCard({
  src,
  altText,
  isPrimary,
  showPrimaryAction,
  allowAltText,
  primaryActiveLabel,
  primaryInactiveLabel,
  onPrimary,
  onAlt,
  onRemove,
}: {
  src: string;
  altText: string;
  isPrimary: boolean;
  showPrimaryAction: boolean;
  allowAltText: boolean;
  primaryActiveLabel: string;
  primaryInactiveLabel: string;
  onPrimary: () => void;
  onAlt: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/65 bg-white/80 shadow-sm">
      <img src={src} alt={altText || "Ảnh xem trước"} className="aspect-[16/10] w-full object-cover" />
      <div className="space-y-2 p-3">
        {allowAltText && <Input value={altText} onChange={(event) => onAlt(event.target.value)} placeholder="Alt text cho ảnh" />}
        <div className="flex gap-2">
          {showPrimaryAction && (
            <Button type="button" variant={isPrimary ? "secondary" : "outline"} className="flex-1" onClick={onPrimary}>
              <Star data-icon="inline-start" />{isPrimary ? primaryActiveLabel : primaryInactiveLabel}
            </Button>
          )}
          <Button type="button" variant="destructive" size="icon" aria-label="Xóa ảnh" onClick={onRemove}><Trash2 /></Button>
        </div>
      </div>
    </div>
  );
}
