"use client";

import {
  ImagePickerField,
  type ImagePickerExistingImage,
  type ImagePickerPendingImage,
} from "@/components/admin/shared/image-picker-field";
import type { PendingImageMeta } from "@/features/admin-tours/tour-form-schema";
import type { AdminTourImage } from "@/features/admin-tours/tour-types";

type TourImageMeta = Pick<PendingImageMeta, "role">;

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
  const pickerExisting: ImagePickerExistingImage<TourImageMeta>[] = existing.map((image) => ({
    id: image.imageId,
    url: image.url,
    altText: image.altText,
    sortOrder: image.sortOrder,
    meta: { role: image.role },
  }));
  const pickerPending: ImagePickerPendingImage<TourImageMeta>[] = pending.map((image) => ({
    clientId: image.clientId,
    file: image.file,
    previewUrl: image.previewUrl,
    altText: image.altText,
    sortOrder: image.sortOrder,
    meta: { role: image.role },
  }));

  return (
    <ImagePickerField<TourImageMeta>
      mode="multiple"
      existing={pickerExisting}
      pending={pickerPending}
      createPendingMeta={({ index, totalBefore }) => ({ role: totalBefore + index === 0 ? "cover" : "gallery" })}
      getIsPrimary={(item) => item.image.meta?.role === "cover"}
      onPrimaryChange={(item) => {
        onExistingChange(existing.map((image) => ({
          ...image,
          role: item.source === "existing" && image.imageId === item.image.id ? "cover" : "gallery",
        })));
        onPendingChange(pending.map((image) => ({
          ...image,
          role: item.source === "pending" && image.clientId === item.image.clientId ? "cover" : "gallery",
        })));
      }}
      primaryActiveLabel="Ảnh bìa"
      primaryInactiveLabel="Đặt làm bìa"
      helperText="JPEG, PNG, WebP, AVIF · tối đa 8MB · chỉ upload khi lưu tour"
      emptyText="Chưa có ảnh nào."
      onExistingChange={(images) => onExistingChange(images.map((image, index) => ({
        imageId: image.id,
        url: image.url,
        altText: image.altText || "",
        role: image.meta?.role ?? "gallery",
        sortOrder: index,
      })))}
      onPendingChange={(images) => onPendingChange(images.map((image, index) => ({
        clientId: image.clientId,
        file: image.file,
        previewUrl: image.previewUrl,
        altText: image.altText || "",
        role: image.meta?.role ?? "gallery",
        sortOrder: index,
      })))}
    />
  );
}
