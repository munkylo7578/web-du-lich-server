"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getImageFileError, MAX_IMAGE_SIZE_MB } from "@/features/shared/upload-validation";
import { IMAGE_OPTIMIZATION_HELP, optimizeImage } from "@/features/shared/image-optimization";
import { blockImageProcessingSubmit } from "@/features/shared/image-processing-submit-blocker";

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
  active?: boolean;
  disabled?: boolean;
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
  altTextLabel?: string;
  altTextPlaceholder?: string;
  altTextMaxLength?: number;
  getAltTextField?: (item: ImagePickerItem<TMeta>) => { error?: string; path?: string };
  emptyText?: string;
  helperText?: string;
  primaryActiveLabel?: string;
  primaryInactiveLabel?: string;
};

export function ImagePickerField<TMeta = Record<string, unknown>>({
  active = true,
  disabled = false,
  mode,
  existing,
  pending,
  onExistingChange,
  onPendingChange,
  createPendingMeta,
  getIsPrimary,
  onPrimaryChange,
  maxFiles,
  maxSizeMb = MAX_IMAGE_SIZE_MB,
  allowPaste = true,
  allowAltText = true,
  altTextLabel,
  altTextPlaceholder = "Alt text cho ảnh",
  altTextMaxLength,
  getAltTextField,
  emptyText = "Chưa có ảnh nào.",
  helperText,
  primaryActiveLabel = "Ảnh chính",
  primaryInactiveLabel = "Đặt làm ảnh chính",
}: ImagePickerFieldProps<TMeta>) {
  const [uploadError, setUploadError] = useState<string>();
  const [processingLabel, setProcessingLabel] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  const releaseSubmitBlocker = useRef<(() => void) | null>(null);
  const operation = useRef<AbortController | null>(null);
  const latest = useRef({ existing, pending, onExistingChange, onPendingChange, createPendingMeta, active, disabled });
  useLayoutEffect(() => {
    latest.current = { existing, pending, onExistingChange, onPendingChange, createPendingMeta, active, disabled };
  });
  const cancelProcessing = useCallback(() => {
    operation.current?.abort();
    operation.current = null;
    releaseSubmitBlocker.current?.();
    releaseSubmitBlocker.current = null;
    setProcessingLabel(undefined);
  }, []);
  useEffect(() => {
    if (!active) cancelProcessing();
    return cancelProcessing;
  }, [active, cancelProcessing]);
  const fileLimit = mode === "single" ? 1 : maxFiles;
  const addFiles = useCallback(
    async (files: File[]) => {
      if (!latest.current.active || latest.current.disabled || operation.current) return;
      const error = files.map((file) => getImageFileError(file, maxSizeMb)).find(Boolean);
      setUploadError(error);
      if (error) return;
      const totalBefore = latest.current.existing.length + latest.current.pending.length;
      const remainingSlots = fileLimit ? Math.max(fileLimit - totalBefore, 0) : files.length;
      const acceptedFiles = mode === "single" ? files.slice(0, 1) : files.slice(0, remainingSlots);

      if (!acceptedFiles.length) return;

      const controller = new AbortController();
      operation.current = controller;
      releaseSubmitBlocker.current = blockImageProcessingSubmit(root.current?.closest("form") ?? null, () => {
        setUploadError("Ảnh đang được tối ưu. Vui lòng chờ hoàn tất hoặc hủy tối ưu trước khi lưu.");
      });
      const additions: ImagePickerPendingImage<TMeta>[] = [];
      let committed = false;
      try {
        const optimized: File[] = [];
        for (const [index, file] of acceptedFiles.entries()) {
          setProcessingLabel(`Đang tối ưu ảnh ${index + 1}/${acceptedFiles.length}: ${file.name}`);
          optimized.push(await optimizeImage(file, controller.signal, maxSizeMb));
        }
        controller.signal.throwIfAborted();
        const current = latest.current;
        if (!current.active || current.disabled) return;
        const currentTotal = current.existing.length + current.pending.length;
        for (const [index, file] of optimized.entries()) {
          additions.push({
            clientId: crypto.randomUUID(), file,
            previewUrl: URL.createObjectURL(file), altText: "",
            sortOrder: mode === "single" ? 0 : currentTotal + index,
            meta: current.createPendingMeta?.({ index, totalBefore: currentTotal }),
          });
        }
        if (mode === "single") {
          current.onExistingChange([]);
          current.onPendingChange(additions);
          current.pending.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        } else {
          current.onPendingChange([...current.pending, ...additions]);
        }
        committed = true;
        setUploadError(undefined);
      } catch (error) {
        if (!controller.signal.aborted) setUploadError(error instanceof Error ? error.message : "Không thể tối ưu ảnh. Vui lòng chọn lại ảnh.");
      } finally {
        if (!committed) additions.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        if (operation.current === controller) cancelProcessing();
      }
    },
    [cancelProcessing, fileLimit, maxSizeMb, mode],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/avif": [] },
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: mode === "multiple",
    maxFiles: fileLimit,
    disabled: disabled || !active || Boolean(processingLabel),
    onDrop: addFiles,
    onDropRejected: (rejections) => {
      const oversized = rejections.some(({ errors }) => errors.some(({ code }) => code === "file-too-large"));
      const tooMany = rejections.some(({ errors }) => errors.some(({ code }) => code === "too-many-files"));
      setUploadError(oversized
        ? `Mỗi ảnh không được vượt quá ${maxSizeMb} MB.`
        : tooMany ? "Bạn đã chọn quá nhiều ảnh." : "Chỉ hỗ trợ ảnh JPEG, PNG, WebP, AVIF.");
    },
  });

  useEffect(() => {
    if (!allowPaste) return;

    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
      if (files.length) void addFiles(files);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, allowPaste]);

  return (
    <div ref={root} className="space-y-4">
      {processingLabel && <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{processingLabel}</span>
        <Button type="button" variant="outline" size="sm" onClick={cancelProcessing}>Hủy tối ưu</Button>
      </div>}
      <fieldset disabled={disabled || !active || Boolean(processingLabel)} aria-busy={Boolean(processingLabel)} className="min-w-0 space-y-4">
      <legend className="sr-only">Chọn và tối ưu ảnh</legend>
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

      {uploadError && <p role="alert" className="text-sm text-destructive">{uploadError}</p>}

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
                altTextLabel={altTextLabel}
                altTextPlaceholder={altTextPlaceholder}
                altTextMaxLength={altTextMaxLength}
                altTextField={getAltTextField?.(item)}
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
                altTextLabel={altTextLabel}
                altTextPlaceholder={altTextPlaceholder}
                altTextMaxLength={altTextMaxLength}
                altTextField={getAltTextField?.(item)}
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
      </fieldset>
    </div>
  );
}

function ImageCard({
  src,
  altText,
  isPrimary,
  showPrimaryAction,
  allowAltText,
  altTextLabel,
  altTextPlaceholder,
  altTextMaxLength,
  altTextField,
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
  altTextLabel?: string;
  altTextPlaceholder: string;
  altTextMaxLength?: number;
  altTextField?: { error?: string; path?: string };
  primaryActiveLabel: string;
  primaryInactiveLabel: string;
  onPrimary: () => void;
  onAlt: (value: string) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  return (
    <div className="overflow-hidden rounded-2xl border border-white/65 bg-white/80 shadow-sm">
      <img src={src} alt={altText || "Ảnh xem trước"} className="aspect-[16/10] w-full object-cover" />
      <div className="space-y-2 p-3">
        {allowAltText && (
          <div className="space-y-2" data-field-path={altTextField?.path}>
            {altTextLabel && <Label htmlFor={inputId}>{altTextLabel}</Label>}
            <Input id={inputId} value={altText} onChange={(event) => onAlt(event.target.value)}
              placeholder={altTextPlaceholder} maxLength={altTextMaxLength}
              aria-label={altTextLabel ? undefined : altTextPlaceholder}
              aria-invalid={Boolean(altTextField?.error)}
              aria-describedby={altTextField?.error ? `${inputId}-error` : undefined} />
            {altTextField?.error && <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive">{altTextField.error}</p>}
          </div>
        )}
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
