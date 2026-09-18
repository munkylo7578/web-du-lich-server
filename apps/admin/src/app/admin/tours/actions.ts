"use server";

import { revalidatePath } from "next/cache";
import { destinationWardCodes } from "@destination-country";

import { Image } from "@/domains/image/domain";
import {
  Tour,
  TourDestination,
  TourImageRef,
  TourPlan,
  TourPlanImageRef,
  TourService,
  type TourTranslationSnapshot,
} from "@/domains/tour/domain";
import { requireSession } from "@/lib/auth/session";
import { listAdminTours, saveDestinationRecord, searchDestinations, searchWards, tourRepository } from "@/features/admin-tours/repository";
import { destinationEditorSchema, imageFieldErrors, pendingImagesSchema, pendingPlanImagesSchema, tourFormSchema } from "@/features/admin-tours/tour-form-schema";
import type { AdminDestination, AdminTour, AdminWard } from "@/features/admin-tours/tour-types";
import { removeUploadedFiles, saveTourImage } from "@/features/admin-tours/upload";
import type { AdminListQuery, AdminListResult } from "@/features/shared/admin-list";

export type TourActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function listAdminToursAction(input: AdminListQuery): Promise<AdminListResult<AdminTour>> {
  await requireSession();
  return listAdminTours(input);
}

export async function searchWardsAction(query: string): Promise<AdminWard[]> {
  await requireSession();
  return searchWards(query);
}

export async function searchDestinationsAction(query: string): Promise<AdminDestination[]> {
  await requireSession();
  return searchDestinations(query);
}

export async function saveDestinationAction(payload: unknown): Promise<TourActionState & { destination?: AdminDestination }> {
  await requireSession();

  const parsed = destinationEditorSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin điểm đến.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const destinationId = data.destinationId ?? crypto.randomUUID();
  const destination = await saveDestinationRecord({
    destinationId,
    country: data.country,
    wardCodes: destinationWardCodes(data.country, data.wardCodes),
    translations: [
      {
        locale: "vi",
        name: data.translations.vi.name,
        description: data.translations.vi.description,
      },
      ...(data.translations.en.name
        ? [{
            locale: "en" as const,
            name: data.translations.en.name,
            description: data.translations.en.description || undefined,
          }]
        : []),
    ],
  });

  revalidatePath("/admin/destinations");
  revalidatePath("/admin/tours");
  return { success: true, message: "Đã lưu điểm đến.", destination };
}

export async function saveTourAction(formData: FormData): Promise<TourActionState> {
  await requireSession();

  const requestId = crypto.randomUUID();
  console.info("[TourUpload] saveTourAction:start", {
    requestId,
    formDataKeys: Array.from(formData.keys()),
  });

  let payload: unknown;
  let pendingPayload: unknown;
  let pendingPlanPayload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
    pendingPayload = JSON.parse(String(formData.get("pendingImages") || "[]"));
    pendingPlanPayload = JSON.parse(String(formData.get("pendingPlanImages") || "[]"));
  } catch {
    console.error("[TourUpload] saveTourAction:parse_failed", { requestId });
    return { success: false, message: "Dữ liệu biểu mẫu không hợp lệ." };
  }

  const parsedPending = pendingImagesSchema.safeParse(pendingPayload);
  if (!parsedPending.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin ảnh mới.",
      fieldErrors: imageFieldErrors(parsedPending.error.issues, "pendingImages"),
    };
  }
  const pendingMeta = parsedPending.data;
  const parsedPendingPlans = pendingPlanImagesSchema.safeParse(pendingPlanPayload);
  if (!parsedPendingPlans.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin ảnh chặng mới.",
      fieldErrors: imageFieldErrors(parsedPendingPlans.error.issues, "pendingPlanImages"),
    };
  }
  const pendingPlanMeta = parsedPendingPlans.data;

  if (new Set([...pendingMeta, ...pendingPlanMeta].map((meta) => meta.clientId)).size
    !== pendingMeta.length + pendingPlanMeta.length) {
    return { success: false, message: "Mã tệp ảnh mới bị trùng lặp." };
  }

  console.info("[TourUpload] saveTourAction:parsed", {
    requestId,
    pendingMetaCount: pendingMeta.length,
    pendingClientIds: pendingMeta.map((meta) => meta.clientId),
  });

  const parsed = tourFormSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("[TourUpload] saveTourAction:validation_failed", {
      requestId,
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
    return {
      success: false,
      message: "Vui lòng kiểm tra lại các trường thông tin.",
      fieldErrors: imageFieldErrors(parsed.error.issues),
    };
  }

  const uploadedPaths: string[] = [];
  let committed = false;
  try {
    const data = parsed.data;
    const translations: TourTranslationSnapshot[] = [
      {
        locale: "vi",
        name: data.translations.vi.name,
        description: data.translations.vi.description || undefined,
        inclusions: data.translations.vi.inclusions || undefined,
        exclusions: data.translations.vi.exclusions || undefined,
      },
      ...(data.translations.en.name
        ? [{
            locale: "en" as const,
            name: data.translations.en.name,
            description: data.translations.en.description || undefined,
            inclusions: data.translations.en.inclusions || undefined,
            exclusions: data.translations.en.exclusions || undefined,
          }]
        : []),
    ];
    const destinations = data.destinations.map((destination, index) =>
      TourDestination.create({ destinationId: destination.destinationId, sortOrder: index }),
    );
    const services = data.services.map((service, index) =>
      TourService.create({ serviceId: service.serviceId, sortOrder: index }),
    );
    const tour = data.id ? await tourRepository.findById(data.id) : null;
    if (data.id && !tour) return { success: false, message: "Không tìm thấy tour." };

    const storedSnapshot = tour?.toSnapshot();
    const linkedIds = new Set(storedSnapshot?.images.map((image) => image.imageId) ?? []);
    if (data.existingImages.some((image) => !linkedIds.has(image.imageId))) {
      return { success: false, message: "Ảnh không thuộc tour đang chỉnh sửa." };
    }
    const storedPlans = new Map((storedSnapshot?.plans ?? []).map((plan) => [plan.planId, plan]));
    for (const plan of data.plans) {
      const storedPlan = storedPlans.get(plan.planId);
      const storedImageIds = new Set(storedPlan?.images.map((image) => image.imageId) ?? []);
      if (plan.images.some((image) => !storedImageIds.has(image.imageId))) {
        return { success: false, message: "Ảnh không thuộc chặng đang chỉnh sửa." };
      }
    }
    const submittedPlanIds = new Set(data.plans.map((plan) => plan.planId));
    if (pendingPlanMeta.some((image) => !submittedPlanIds.has(image.planId))) {
      return { success: false, message: "Ảnh mới không thuộc chặng nào trong tour." };
    }
    // Reject missing files before writing any uploads, rather than silently dropping images.
    if ([...pendingMeta, ...pendingPlanMeta].some((meta) => !(formData.get(`file:${meta.clientId}`) instanceof File))) {
      return { success: false, message: "Không tìm thấy tệp ảnh mới. Vui lòng chọn lại ảnh." };
    }

    const departureStartMonth = data.departureStartMonth ?? undefined;
    const existingRefs = data.existingImages.map((image, index) =>
      TourImageRef.fromSnapshot({
        imageId: image.imageId,
        role: image.role,
        sortOrder: index,
      }),
    );
    const newImages = [];
    const newRefs = [];

    for (let index = 0; index < pendingMeta.length; index += 1) {
      const meta = pendingMeta[index];
      const file = formData.get(`file:${meta.clientId}`);

      console.info("[TourUpload] saveTourAction:pending_file", {
        requestId,
        index,
        clientId: meta.clientId,
        hasFile: file instanceof File,
        fileName: file instanceof File ? file.name : undefined,
        fileType: file instanceof File ? file.type : undefined,
        fileSize: file instanceof File ? file.size : undefined,
      });

      if (!(file instanceof File)) {
        console.error("[TourUpload] saveTourAction:missing_file", {
          requestId,
          index,
          clientId: meta.clientId,
          availableFormDataKeys: Array.from(formData.keys()),
        });
        throw new Error("Không tìm thấy tệp ảnh mới.");
      }

      const stored = await saveTourImage(file);
      uploadedPaths.push(stored.physicalPath);
      const image = Image.create({
        url: stored.url,
        altText: meta.altText || undefined,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeInBytes: stored.sizeInBytes,
      });
      const ref = TourImageRef.create({
        imageId: image.getId(),
        role: meta.role,
        sortOrder: existingRefs.length + index,
      });
      newImages.push({ image, physicalPath: stored.physicalPath });
      newRefs.push(ref);
    }

    const newPlanRefs = new Map<string, TourPlanImageRef[]>();
    for (const meta of pendingPlanMeta) {
      const file = formData.get(`file:${meta.clientId}`);
      if (!(file instanceof File)) throw new Error("Không tìm thấy tệp ảnh chặng mới.");

      const stored = await saveTourImage(file);
      uploadedPaths.push(stored.physicalPath);
      const image = Image.create({
        url: stored.url,
        altText: meta.altText || undefined,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeInBytes: stored.sizeInBytes,
      });
      const ref = TourPlanImageRef.create({ imageId: image.getId().toString(), sortOrder: meta.sortOrder });
      newImages.push({ image, physicalPath: stored.physicalPath });
      newPlanRefs.set(meta.planId, [...(newPlanRefs.get(meta.planId) ?? []), ref]);
    }

    const plans = data.plans.map((plan, index) => TourPlan.create({
      planId: plan.planId,
      name: plan.name,
      description: plan.description,
      sortOrder: index,
      images: [
        ...plan.images.map((image, imageIndex) => ({ imageId: image.imageId, sortOrder: imageIndex })),
        ...(newPlanRefs.get(plan.planId) ?? []).map((image) => image.toSnapshot()),
      ],
    }));

    const aggregate = tour || Tour.create({ translations, destinations, services, plans, departureStartMonth });
    if (tour) {
      aggregate.updateDepartureStartMonth(departureStartMonth);
      aggregate.replaceTranslations(translations);
      aggregate.replaceDestinations(destinations);
      aggregate.replaceServices(services);
      aggregate.replacePlans(plans);
    }

    aggregate.replaceImages([...existingRefs, ...newRefs]);
    const imageUpdates = new Map<string, string | undefined>();
    for (const image of data.existingImages) imageUpdates.set(image.imageId, image.altText);
    for (const plan of data.plans) {
      for (const image of plan.images) imageUpdates.set(image.imageId, image.altText);
    }
    await tourRepository.save(aggregate, newImages, undefined,
      [...imageUpdates].map(([imageId, altText]) => ({ imageId, altText })),
    );
    committed = true;
    console.info("[TourUpload] saveTourAction:success", {
      requestId,
      tourId: aggregate.getId().toString(),
      pendingMetaCount: pendingMeta.length,
      savedNewImages: newImages.length,
      uploadedPaths,
    });
    revalidatePath("/admin/tours");
    return { success: true, message: data.id ? "Đã cập nhật tour." : "Đã tạo tour." };
  } catch (error) {
    console.error("[TourUpload] saveTourAction:failed", {
      requestId,
      uploadedPaths,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    if (committed) {
      return { success: true, message: "Đã lưu tour. Vui lòng tải lại trang để xem dữ liệu mới nhất." };
    }
    await removeUploadedFiles(uploadedPaths);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể lưu tour.",
    };
  }
}

export async function deleteTourAction(id: string): Promise<TourActionState> {
  await requireSession();
  try {
    await tourRepository.delete(id);
    revalidatePath("/admin/tours");
    return { success: true, message: "Đã xóa tour." };
  } catch {
    return { success: false, message: "Không thể xóa tour." };
  }
}
