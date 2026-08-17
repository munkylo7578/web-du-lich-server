"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Edit3, ImageIcon, MoreHorizontal, Plus, Search, Settings2, Trash2, Type } from "lucide-react";

import { deleteSettingAction, saveSettingAction } from "@/app/admin/settings/actions";
import { ImagePickerField, type ImagePickerPendingImage } from "@/components/admin/shared/image-picker-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { settingFormSchema, type SettingFormValues } from "@/features/admin-settings/settings-form-schema";
import type { AdminSetting } from "@/features/admin-settings/settings-types";

type PendingSettingImage = ImagePickerPendingImage;

export function SettingsManagement({ settings }: { settings: AdminSetting[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<AdminSetting | null>(null);
  const [deletingSetting, setDeletingSetting] = useState<AdminSetting | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string>();
  const [isDeleting, startDelete] = useTransition();
  const filteredSettings = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return settings;

    return settings.filter((setting) =>
      [setting.key, setting.description ?? "", setting.value, setting.type]
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [query, settings]);

  return (
    <>
      <section>
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-800">Cấu hình hệ thống</p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">Settings</h1>
            <p className="mt-2 max-w-2xl font-medium text-slate-700">Quản lý key cấu hình dùng chung cho website. Key không thể đổi sau khi tạo.</p>
          </div>
          <Button
            size="lg"
            className="solid-accent-button h-11 rounded-2xl px-5"
            onClick={() => {
              console.info("[SettingsForm] open_create_drawer");
              setEditingSetting(null);
              setDrawerOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />Tạo setting
          </Button>
        </div>

        <Card className="gap-0 overflow-hidden rounded-[28px] border border-cyan-900/15 bg-white/95 py-0 shadow-[0_18px_55px_-42px_rgba(8,47,73,0.55)]">
          <div className="flex flex-col gap-3 border-b border-cyan-900/15 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" strokeWidth={2.75} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="glass-input h-10 rounded-2xl pl-9" placeholder="Tìm theo key, mô tả, giá trị..." />
            </div>
            <p className="rounded-full border border-cyan-900/15 bg-cyan-50 px-3 py-1 text-sm font-medium text-slate-800">{filteredSettings.length} settings</p>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-900/15 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-700">Key</TableHead>
                    <TableHead className="font-semibold text-slate-700">Loại</TableHead>
                    <TableHead className="font-semibold text-slate-700">Mô tả</TableHead>
                    <TableHead className="font-semibold text-slate-700">Giá trị</TableHead>
                    <TableHead className="font-semibold text-slate-700">Cập nhật</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettings.length ? filteredSettings.map((setting) => (
                    <TableRow key={setting.key}>
                      <TableCell>
                        <div className="flex min-w-52 items-center gap-3">
                          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-800"><Settings2 className="size-5" /></div>
                          <div>
                            <p className="font-mono text-sm font-semibold text-foreground">{setting.key}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <p className="text-xs text-muted-foreground">Key cố định</p>
                              {!setting.canDelete && <Badge variant="secondary">Không thể xóa</Badge>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><SettingTypeBadge type={setting.type} /></TableCell>
                      <TableCell><p className="line-clamp-2 max-w-sm text-sm text-slate-700">{setting.description || "—"}</p></TableCell>
                      <TableCell><SettingValuePreview setting={setting} /></TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{formatDate(setting.updatedAt)}</span></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Chỉnh sửa setting" onClick={() => { setEditingSetting(setting); setDrawerOpen(true); }}><Edit3 /></Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Xóa setting"
                            disabled={!setting.canDelete}
                            title={!setting.canDelete ? "Setting quan trọng chỉ có thể xóa trực tiếp trong database" : undefined}
                            onClick={() => { setDeleteMessage(undefined); setDeletingSetting(setting); }}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-52 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-muted"><MoreHorizontal className="size-5" /></div>
                          <p className="font-medium">Chưa tìm thấy setting</p>
                          <p className="mt-1 text-sm text-muted-foreground">Tạo setting mới hoặc thử từ khóa khác.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <SettingFormDrawer
        key={editingSetting?.key || "new"}
        open={drawerOpen}
        setting={editingSetting}
        onSaved={() => router.refresh()}
        onOpenChange={setDrawerOpen}
      />

      <AlertDialog open={Boolean(deletingSetting)} onOpenChange={(open) => !open && setDeletingSetting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa setting này?</AlertDialogTitle>
            <AlertDialogDescription>Setting sẽ bị xóa khỏi hệ thống. Chỉ những setting có quyền xóa mới thao tác được từ admin.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMessage && <Alert><AlertDescription>{deleteMessage}</AlertDescription></Alert>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || !deletingSetting?.canDelete}
              onClick={(event) => {
                event.preventDefault();
                if (!deletingSetting) return;
                startDelete(async () => {
                  const result = await deleteSettingAction(deletingSetting.key);
                  setDeleteMessage(result.message);
                  if (result.success) {
                    setDeletingSetting(null);
                    router.refresh();
                  }
                });
              }}
            >
              {isDeleting ? "Đang xóa..." : "Xóa setting"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SettingFormDrawer({
  open,
  setting,
  onSaved,
  onOpenChange,
}: {
  open: boolean;
  setting: AdminSetting | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const values = useMemo(() => toFormValues(setting), [setting]);
  const previousTypeRef = useRef(values.type);
  const [pendingImages, setPendingImages] = useState<PendingSettingImage[]>([]);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const form = useForm<SettingFormValues>({ resolver: zodResolver(settingFormSchema), values });
  const watchedType = form.watch("type");
  const watchedValue = form.watch("value") || "";
  const imageExisting = watchedType === "image" && watchedValue
    ? [{ id: form.getValues("key") || "setting-image", url: watchedValue }]
    : [];

  useEffect(() => {
    previousTypeRef.current = values.type;
  }, [values]);

  useEffect(() => {
    if (previousTypeRef.current === watchedType) return;

    previousTypeRef.current = watchedType;
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setPendingImages([]);
    form.setValue("value", "", { shouldDirty: true, shouldValidate: true });
  }, [form, pendingImages, watchedType]);

  const resetDraft = () => {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setPendingImages([]);
    setMessage(undefined);
    form.reset(values);
  };

  const submit = form.handleSubmit((data) => {
    console.info("[SettingsForm] submit_valid", {
      key: data.key,
      originalKey: data.originalKey,
      type: data.type,
      hasValue: Boolean(data.value),
      pendingImages: pendingImages.length,
    });
    setMessage(undefined);
    if (data.type === "image" && !data.value && !pendingImages.length) {
      setMessage("Vui lòng chọn ảnh cho setting loại ảnh.");
      return;
    }

    startTransition(async () => {
      const body = new FormData();
      body.set("payload", JSON.stringify(data));
      if (pendingImages[0]) {
        body.set("pendingImageClientId", pendingImages[0].clientId);
        body.set(`file:${pendingImages[0].clientId}`, pendingImages[0].file);
      }

      const result = await saveSettingAction(body);
      setMessage(result.message);
      if (result.success) {
        pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setPendingImages([]);
        onOpenChange(false);
        onSaved();
      }
    });
  }, (errors) => {
    console.warn("[SettingsForm] submit_invalid", errors);
    setMessage("Vui lòng kiểm tra lại các trường bắt buộc.");
  });

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) resetDraft(); onOpenChange(nextOpen); }}>
      <SheetContent fullscreen className="tour-drawer-surface gap-0 text-slate-950" showCloseButton={!isPending}>
        <SheetHeader className="tour-drawer-chrome sticky top-0 z-20 rounded-none border-x-0 border-t-0 px-5 py-4 sm:px-8">
          <div className="mx-auto w-full max-w-[980px] pr-12">
            <SheetTitle className="text-xl sm:text-2xl">{setting ? "Chỉnh sửa setting" : "Tạo setting"}</SheetTitle>
            <SheetDescription className="mt-1">Key không thể đổi sau khi tạo. Khi đổi loại, giá trị sẽ được reset.</SheetDescription>
          </div>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="mx-auto w-full max-w-[980px] space-y-7">
              {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

              <section className="tour-drawer-panel space-y-5 rounded-[28px] p-5 sm:p-7">
                <div>
                  <h3 className="font-heading text-base font-semibold">Thông tin setting</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Định nghĩa key, mô tả, loại dữ liệu và giá trị cấu hình.</p>
                </div>
                <input type="hidden" {...form.register("originalKey")} />
                <FormField label="Key" required error={form.formState.errors.key?.message}>
                  <Input
                    aria-invalid={Boolean(form.formState.errors.key)}
                    readOnly={Boolean(setting)}
                    className={setting ? "bg-muted/40 font-mono" : "font-mono"}
                    {...form.register("key")}
                    placeholder="site.logo"
                  />
                </FormField>
                <FormField label="Mô tả" error={form.formState.errors.description?.message}>
                  <Textarea aria-invalid={Boolean(form.formState.errors.description)} {...form.register("description")} placeholder="Ví dụ: Logo chính hiển thị trên header website" />
                </FormField>
                <FormField label="Loại" required error={form.formState.errors.type?.message}>
                  <select
                    className="glass-input h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    aria-invalid={Boolean(form.formState.errors.type)}
                    {...form.register("type")}
                  >
                    <option value="text">Text</option>
                    <option value="image">Ảnh</option>
                  </select>
                </FormField>
                {watchedType === "text" ? (
                  <FormField label="Giá trị" required error={form.formState.errors.value?.message}>
                    <Textarea aria-invalid={Boolean(form.formState.errors.value)} {...form.register("value")} placeholder="Nhập giá trị cấu hình" />
                  </FormField>
                ) : (
                  <FormField label="Ảnh" required error={form.formState.errors.value?.message}>
                    <Controller
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <ImagePickerField
                          mode="single"
                          existing={imageExisting}
                          pending={pendingImages}
                          allowAltText={false}
                          helperText="JPEG, PNG, WebP, AVIF · tối đa 8MB · chỉ upload khi lưu setting"
                          emptyText="Chưa chọn ảnh setting."
                          onExistingChange={(images) => field.onChange(images[0]?.url ?? "")}
                          onPendingChange={(images) => {
                            setPendingImages(images);
                            if (images.length) field.onChange("");
                          }}
                        />
                      )}
                    />
                  </FormField>
                )}
              </section>
            </div>
          </div>

          <SheetFooter className="tour-drawer-chrome sticky bottom-0 z-20 rounded-none border-x-0 border-b-0 px-5 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-[980px] flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-6 text-base" disabled={isPending} onClick={() => { resetDraft(); onOpenChange(false); }}>Hủy</Button>
              <Button type="submit" size="lg" className="h-12 rounded-2xl px-6 text-base" disabled={isPending}>{isPending ? "Đang lưu..." : setting ? "Lưu thay đổi" : "Tạo setting"}</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SettingTypeBadge({ type }: { type: AdminSetting["type"] }) {
  return type === "image"
    ? <Badge variant="secondary"><ImageIcon data-icon="inline-start" />Ảnh</Badge>
    : <Badge variant="outline"><Type data-icon="inline-start" />Text</Badge>;
}

function SettingValuePreview({ setting }: { setting: AdminSetting }) {
  if (setting.type === "image") {
    return (
      <div className="flex min-w-56 items-center gap-3">
        <img src={setting.value} alt={setting.description || setting.key} className="size-14 rounded-xl border object-cover" />
        <span className="max-w-xs truncate text-xs text-muted-foreground">{setting.value}</span>
      </div>
    );
  }

  return <p className="line-clamp-2 max-w-xs text-sm text-slate-700">{setting.value}</p>;
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="gap-0">{label}{required && <RequiredMark />}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function RequiredMark() {
  return <span className="ml-0.5 text-destructive" aria-label="required">*</span>;
}

function toFormValues(setting: AdminSetting | null): SettingFormValues {
  if (!setting) {
    return {
      key: "",
      description: "",
      type: "text",
      value: "",
    };
  }

  return {
    originalKey: setting.key,
    key: setting.key,
    description: setting.description ?? "",
    type: setting.type,
    value: setting.value,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}
