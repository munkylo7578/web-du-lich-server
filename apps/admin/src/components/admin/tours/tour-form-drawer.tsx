"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { saveTourAction } from "@/app/admin/tours/actions";
import { ImageUploadField, type PendingImage } from "./image-upload-field";
import { LocationSelect } from "./location-select";
import { RichTextEditor } from "./rich-text-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tourFormSchema, type TourFormValues } from "@/features/admin-tours/tour-form-schema";
import type { AdminTour } from "@/features/admin-tours/tour-types";

const emptyValues: TourFormValues = {
  translations: { vi: { name: "", description: "" }, en: { name: "", description: "" } },
  locationId: null,
  plans: [],
  existingImages: [],
};

function toFormValues(tour: AdminTour | null): TourFormValues {
  if (!tour) return emptyValues;
  const vi = tour.translations.find((item) => item.locale === "vi");
  const en = tour.translations.find((item) => item.locale === "en");
  return {
    id: tour.id,
    translations: {
      vi: { name: vi?.name || "", description: vi?.description || "" },
      en: { name: en?.name || "", description: en?.description || "" },
    },
    locationId: tour.locationId,
    plans: tour.plans.map((plan) => ({
      sortOrder: plan.sortOrder,
      name: { vi: plan.name.vi || "", en: plan.name.en || "" },
      description: { vi: plan.description.vi || "", en: plan.description.en || "" },
    })),
    existingImages: tour.images.map((image) => ({ ...image, altText: image.altText || "" })),
  };
}

export function TourFormDrawer({ open, tour, onOpenChange }: { open: boolean; tour: AdminTour | null; onOpenChange: (open: boolean) => void }) {
  const values = useMemo(() => toFormValues(tour), [tour]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const form = useForm<TourFormValues>({ resolver: zodResolver(tourFormSchema), values });
  const plans = useFieldArray({ control: form.control, name: "plans" });

  const submit = form.handleSubmit((data) => {
    setMessage(undefined);
    startTransition(async () => {
      const payload = {
        ...data,
        plans: data.plans.map((plan, index) => ({ ...plan, sortOrder: index })),
        existingImages: data.existingImages.map((image, index) => ({ ...image, sortOrder: index })),
      };
      const normalizedPending = pendingImages.map((image, index) => ({ ...image, sortOrder: data.existingImages.length + index }));
      const body = new FormData();
      body.set("payload", JSON.stringify(payload));
      body.set("pendingImages", JSON.stringify(normalizedPending.map(({ file: _file, previewUrl: _preview, ...meta }) => meta)));
      normalizedPending.forEach((image) => body.set(`file:${image.clientId}`, image.file));
      const result = await saveTourAction(body);
      setMessage(result.message);
      if (result.success) {
        pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setPendingImages([]);
        onOpenChange(false);
      }
    });
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent fullscreen className="tour-drawer-surface gap-0 text-slate-950" showCloseButton={!isPending}>
        <SheetHeader className="tour-drawer-chrome sticky top-0 z-20 rounded-none border-x-0 border-t-0 px-5 py-4 sm:px-8">
          <div className="mx-auto w-full max-w-[1480px] pr-12">
            <SheetTitle className="text-xl sm:text-2xl">{tour ? "Chỉnh sửa tour" : "Tạo tour mới"}</SheetTitle>
            <SheetDescription className="mt-1">Nội dung tiếng Việt là bắt buộc. Ảnh mới chỉ được upload sau khi lưu.</SheetDescription>
          </div>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="mx-auto w-full max-w-[1480px] space-y-7">
            {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

            <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
              <SectionHeading title="Nội dung đa ngôn ngữ" description="Tên và mô tả hiển thị trên website client." />
              <Tabs defaultValue="vi">
                <TabsList><TabsTrigger value="vi">Tiếng Việt *</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList>
                {(["vi", "en"] as const).map((locale) => (
                  <TabsContent key={locale} value={locale} className="space-y-4 pt-3">
                    <FormField label={`Tên tour (${locale.toUpperCase()})`} error={form.formState.errors.translations?.[locale]?.name?.message}>
                      <Input {...form.register(`translations.${locale}.name`)} placeholder={locale === "vi" ? "Ví dụ: Khám phá Đà Nẵng 3N2Đ" : "Example: Discover Da Nang 3D2N"} />
                    </FormField>
                    <FormField label={`Mô tả (${locale.toUpperCase()})`} error={form.formState.errors.translations?.[locale]?.description?.message}>
                      <Controller control={form.control} name={`translations.${locale}.description`} render={({ field }) => <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Mô tả điểm nổi bật của tour..." />} />
                    </FormField>
                  </TabsContent>
                ))}
              </Tabs>
            </section>

            <Separator />
            <section className="tour-drawer-panel relative z-30 space-y-4 overflow-visible rounded-[28px] p-5 sm:p-7">
              <SectionHeading title="Vị trí" description="Chọn địa chỉ hiển thị cho tour. Có thể để trống và bổ sung sau." />
              <Controller
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <LocationSelect
                    value={field.value}
                    selectedLocation={tour?.location ?? null}
                    onChange={field.onChange}
                  />
                )}
              />
            </section>

            <Separator />
            <section className="tour-drawer-panel relative z-0 space-y-4 rounded-[28px] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <SectionHeading title="Lịch trình" description="Tên và mô tả từng ngày theo ngôn ngữ." />
                <Button type="button" variant="outline" onClick={() => plans.append({ sortOrder: plans.fields.length, name: { vi: "", en: "" }, description: { vi: "", en: "" } })}><Plus data-icon="inline-start" />Thêm chặng</Button>
              </div>
              {!plans.fields.length && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Chưa có lịch trình. Bấm “Thêm chặng” để bắt đầu.</div>}
              {plans.fields.map((plan, index) => (
                <div key={plan.id} className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 font-medium"><GripVertical className="size-4 text-muted-foreground" />Chặng {index + 1}</div><Button type="button" variant="destructive" size="icon-sm" aria-label={`Xóa chặng ${index + 1}`} onClick={() => plans.remove(index)}><Trash2 /></Button></div>
                  <Tabs defaultValue="vi">
                    <TabsList><TabsTrigger value="vi">VI *</TabsTrigger><TabsTrigger value="en">EN</TabsTrigger></TabsList>
                    {(["vi", "en"] as const).map((locale) => <TabsContent key={locale} value={locale} className="space-y-3 pt-3"><Input {...form.register(`plans.${index}.name.${locale}`)} placeholder={locale === "vi" ? "Tên chặng" : "Plan name"} /><Controller control={form.control} name={`plans.${index}.description.${locale}`} render={({ field }) => <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Nội dung lịch trình..." />} /></TabsContent>)}
                  </Tabs>
                </div>
              ))}
            </section>

            <Separator />
            <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
              <SectionHeading title="Hình ảnh" description="Chọn, kéo thả hoặc paste ảnh. Chỉ một ảnh được đặt làm ảnh bìa." />
              <Controller control={form.control} name="existingImages" render={({ field }) => <ImageUploadField existing={field.value as AdminTour["images"]} pending={pendingImages} onExistingChange={field.onChange} onPendingChange={setPendingImages} />} />
            </section>
            </div>
          </div>

          <SheetFooter className="tour-drawer-chrome sticky bottom-0 z-20 rounded-none border-x-0 border-b-0 px-5 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-[1480px] flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : tour ? "Lưu thay đổi" : "Tạo tour"}</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h3 className="font-heading text-base font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
