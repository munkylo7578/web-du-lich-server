"use client";

import {
  ImagePickerField,
  type ImagePickerExistingImage,
  type ImagePickerPendingImage,
} from "@/components/admin/shared/image-picker-field";
import type { PendingPlanImageMeta } from "@/features/admin-tours/tour-form-schema";
import type { AdminTourPlan } from "@/features/admin-tours/tour-types";

export type PendingPlanImage = PendingPlanImageMeta & { file: File; previewUrl: string };

type ExistingPlanImage = AdminTourPlan["images"][number];
type PlanImageMeta = { planId: string };

export function PlanImageUploadField({
  active,
  disabled,
  planId,
  planIndex,
  existing,
  pending,
  pendingFieldPath,
  errors = {},
  onExistingChange,
  onPendingChange,
}: {
  active?: boolean;
  disabled?: boolean;
  planId: string;
  planIndex: number;
  existing: ExistingPlanImage[];
  pending: PendingPlanImage[];
  pendingFieldPath: (clientId: string) => string;
  errors?: Record<string, string[]>;
  onExistingChange: (images: ExistingPlanImage[]) => void;
  onPendingChange: (images: PendingPlanImage[]) => void;
}) {
  const pickerExisting: ImagePickerExistingImage<PlanImageMeta>[] = existing.map((image) => ({
    id: image.imageId,
    url: image.url,
    altText: image.altText,
    sortOrder: image.sortOrder,
    meta: { planId },
  }));
  const pickerPending: ImagePickerPendingImage<PlanImageMeta>[] = pending.map((image) => ({
    clientId: image.clientId,
    file: image.file,
    previewUrl: image.previewUrl,
    altText: image.altText,
    sortOrder: image.sortOrder,
    meta: { planId: image.planId },
  }));

  return (
    <ImagePickerField<PlanImageMeta>
      active={active}
      disabled={disabled}
      mode="multiple"
      allowPaste={false}
      altTextLabel="Tên ảnh"
      altTextPlaceholder="Ví dụ: tham quan phố cổ"
      altTextMaxLength={500}
      getAltTextField={(item) => {
        const path = item.source === "existing"
          ? `plans.${planIndex}.images.${existing.findIndex((image) => image.imageId === item.image.id)}.altText`
          : pendingFieldPath(item.image.clientId);
        return { path, error: errors[path]?.[0] };
      }}
      existing={pickerExisting}
      pending={pickerPending}
      createPendingMeta={() => ({ planId })}
      helperText="JPEG, PNG, WebP, AVIF · tối đa 50MB · nhiều ảnh cho chặng này"
      emptyText="Chặng này chưa có ảnh."
      onExistingChange={(images) => onExistingChange(images.map((image, index) => ({
        imageId: image.id,
        url: image.url,
        altText: image.altText || "",
        sortOrder: index,
      })))}
      onPendingChange={(images) => onPendingChange(images.map((image, index) => ({
        clientId: image.clientId,
        planId: image.meta?.planId ?? planId,
        file: image.file,
        previewUrl: image.previewUrl,
        altText: image.altText || "",
        sortOrder: existing.length + index,
      })))}
    />
  );
}
