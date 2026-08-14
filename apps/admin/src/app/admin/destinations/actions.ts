"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import {
  deleteDestinationRecord,
  saveDestinationRecord,
  searchWards,
} from "@/features/admin-tours/repository";
import {
  destinationEditorSchema,
} from "@/features/admin-tours/tour-form-schema";
import type { AdminDestination, AdminWard } from "@/features/admin-tours/tour-types";

export type DestinationActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const destinationIdSchema = z.string().uuid();

export async function searchDestinationWardsAction(query: string): Promise<AdminWard[]> {
  await requireSession();
  return searchWards(query);
}

export async function saveAdminDestinationAction(
  payload: unknown,
): Promise<DestinationActionState & { destination?: AdminDestination }> {
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
  const destination = await saveDestinationRecord({
    destinationId: data.destinationId ?? crypto.randomUUID(),
    wardCodes: [...new Set(data.wardCodes)],
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

export async function deleteAdminDestinationAction(id: string): Promise<DestinationActionState> {
  await requireSession();

  const parsedId = destinationIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false, message: "Mã điểm đến không hợp lệ." };
  }

  try {
    await deleteDestinationRecord(parsedId.data);
    revalidatePath("/admin/destinations");
    revalidatePath("/admin/tours");
    return { success: true, message: "Đã xóa điểm đến." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa điểm đến.",
    };
  }
}
