"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SETTING_CATEGORY_LABELS, type SettingCategory } from "@setting-category";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Edit3, ImageIcon, MoreHorizontal, Plus, Search, Settings2, Trash2, Type, Upload, Video } from "lucide-react";

import { deleteSettingAction, listAdminSettingsAction, saveSettingAction } from "@/app/admin/settings/actions";
import { ServerPagination } from "@/components/admin/shared/server-pagination";
import { submitUpload } from "@/features/shared/upload-validation";
import { ImagePickerField, type ImagePickerPendingImage } from "@/components/admin/shared/image-picker-field";
import { SettingVideoPreview } from "@/components/admin/settings/setting-video-preview";
import { RichTextEditor } from "@/components/admin/tours/rich-text-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { settingFormSchema, type SettingFormValues } from "@/features/admin-settings/settings-form-schema";
import type { AdminSetting } from "@/features/admin-settings/settings-types";
import type { AdminListQuery, AdminListResult } from "@/features/shared/admin-list";
import { useServerPagination } from "@/hooks/use-server-pagination";

type PendingSettingImage = ImagePickerPendingImage;
type PendingSettingVideo = { file: File; previewUrl: string };

export function SettingsManagement({ initialResult, category }: { initialResult: AdminListResult<AdminSetting>; category: SettingCategory }) {
  const categoryLabel = SETTING_CATEGORY_LABELS[category];
  const router = useRouter();
  const loadPage = useCallback((input: AdminListQuery) => listAdminSettingsAction(category, input), [category]);
  const list = useServerPagination({ initialResult, loadPage });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<AdminSetting | null>(null);
  const [deletingSetting, setDeletingSetting] = useState<AdminSetting | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string>();
  const [isDeleting, startDelete] = useTransition();

  return (
    <>
      <section>
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Settings / {categoryLabel}</p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">Cấu hình {categoryLabel.toLowerCase()}</h1>
            <p className="mt-2 text-sm text-slate-600">{category === "home" ? "Quản lý nội dung và hình ảnh trên trang chủ." : "Quản lý các cấu hình dùng chung cho website."}</p>
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
              <Input value={list.query} onChange={(event) => list.setQuery(event.target.value)} className="glass-input h-10 rounded-2xl pl-9" aria-label={`Tìm cấu hình ${categoryLabel.toLowerCase()}`} placeholder="Tìm theo key, mô tả, giá trị trong nhóm..." />
            </div>
            <p className="rounded-full border border-cyan-900/15 bg-cyan-50 px-3 py-1 text-sm font-medium text-slate-800">{list.total} settings</p>
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
                  {list.items.length ? list.items.map((setting) => (
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
                          <p className="font-medium">{list.query.trim() ? "Không tìm thấy setting phù hợp" : `Chưa có cấu hình ${categoryLabel.toLowerCase()}`}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{list.query.trim() ? "Thử từ khóa khác trong nhóm đang xem." : `Tạo setting mới để thêm vào nhóm ${categoryLabel}.`}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <ServerPagination {...list} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} />
          </CardContent>
        </Card>
      </section>

      <SettingFormDrawer
        key={`${category}:${editingSetting?.key || "new"}`}
        category={category}
        open={drawerOpen}
        setting={editingSetting}
        onSaved={() => { list.reload(); router.refresh(); }}
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
                  const result = await deleteSettingAction(deletingSetting.key, category);
                  setDeleteMessage(result.message);
                  if (result.success) {
                    setDeletingSetting(null);
                    list.reload();
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
  category,
  onSaved,
  onOpenChange,
}: {
  open: boolean;
  setting: AdminSetting | null;
  category: SettingCategory;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const values = useMemo(() => toFormValues(setting, category), [setting, category]);
  const previousTypeRef = useRef(values.type);
  const [pendingImages, setPendingImages] = useState<PendingSettingImage[]>([]);
  const [pendingVideo, setPendingVideo] = useState<PendingSettingVideo>();
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
    if (pendingVideo) URL.revokeObjectURL(pendingVideo.previewUrl);
    setPendingVideo(undefined);
    form.setValue("value", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("translations", { vi: "", en: "" }, { shouldDirty: true, shouldValidate: true });
  }, [form, pendingImages, pendingVideo, watchedType]);

  const resetDraft = () => {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setPendingImages([]);
    if (pendingVideo) URL.revokeObjectURL(pendingVideo.previewUrl);
    setPendingVideo(undefined);
    setMessage(undefined);
    form.reset(values);
  };

  const submit = form.handleSubmit((data) => {
    console.info("[SettingsForm] submit_valid", {
      key: data.key,
      originalKey: data.originalKey,
      type: data.type,
      hasValue: data.type === "text" || data.type === "plain_text" ? Boolean(data.translations?.vi) : Boolean(data.value),
      pendingImages: pendingImages.length,
      pendingVideo: Boolean(pendingVideo),
    });
    setMessage(undefined);
    if (data.type === "image" && !data.value && !pendingImages.length) {
      setMessage("Vui lòng chọn ảnh cho setting loại ảnh.");
      return;
    }
    if (data.type === "video" && !data.value && !pendingVideo) {
      setMessage("Vui lòng chọn video MP4 cho setting loại Video.");
      return;
    }

    startTransition(async () => {
      const body = new FormData();
      body.set("payload", JSON.stringify(data));
      if (pendingImages[0]) {
        body.set("pendingImageClientId", pendingImages[0].clientId);
        body.set(`file:${pendingImages[0].clientId}`, pendingImages[0].file);
      }
      if (pendingVideo) body.set("videoFile", pendingVideo.file);

      const result = await submitUpload(body, saveSettingAction);
      setMessage(result.message);
      if (result.success) {
        pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setPendingImages([]);
        if (pendingVideo) URL.revokeObjectURL(pendingVideo.previewUrl);
        setPendingVideo(undefined);
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
            <SheetTitle className="text-xl sm:text-2xl">{setting ? "Chỉnh sửa setting" : "Tạo setting"} · {SETTING_CATEGORY_LABELS[category]}</SheetTitle>
            <SheetDescription className="mt-1">Key và loại không thể đổi sau khi tạo.</SheetDescription>
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
                <input type="hidden" {...form.register("category")} />
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
                  {setting ? (
                    <>
                      <select
                        className="glass-input h-10 w-full cursor-not-allowed rounded-2xl border border-input bg-muted/40 px-3 text-sm opacity-70 outline-none"
                        aria-label="Loại setting"
                        disabled
                        value={setting.type}
                      >
                        <option value="text">Text (trình soạn thảo)</option>
                        <option value="plain_text">Văn bản thuần (input)</option>
                        <option value="image">Ảnh</option>
                        <option value="video">Video</option>
                      </select>
                      <input type="hidden" {...form.register("type")} />
                      <p className="text-xs text-muted-foreground">Loại setting được cố định sau khi tạo.</p>
                    </>
                  ) : (
                    <select
                      className="glass-input h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-invalid={Boolean(form.formState.errors.type)}
                      {...form.register("type")}
                    >
                      <option value="text">Text (trình soạn thảo)</option>
                      <option value="plain_text">Văn bản thuần (input)</option>
                      <option value="image">Ảnh</option>
                      <option value="video">Video</option>
                    </select>
                  )}
                </FormField>
                {!setting && (
                  <div className="rounded-2xl border border-cyan-900/15 bg-cyan-50/60 p-4">
                    <label className="flex cursor-pointer items-start gap-3" htmlFor="setting-can-delete">
                      <input
                        id="setting-can-delete"
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-cyan-800"
                        {...form.register("canDelete")}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">Cho phép xóa</span>
                       
                      </span>
                    </label>
                  </div>
                )}
                {watchedType === "text" || watchedType === "plain_text" ? (
                  <Tabs defaultValue="vi" className="gap-4">
                    <div>
                      <Label className="mb-2 gap-0">Giá trị<RequiredMark /></Label>
                      <p className="mb-3 text-xs text-muted-foreground">Soạn nội dung riêng cho từng ngôn ngữ. Tiếng Anh sẽ fallback sang tiếng Việt khi để trống.</p>
                      {watchedType === "plain_text" && <p className="mb-3 text-xs text-muted-foreground">Nhập văn bản một dòng, không thêm định dạng HTML. Phù hợp cho email, số điện thoại hoặc URL.</p>}
                      <TabsList className="h-10 rounded-xl p-1">
                        <TabsTrigger value="vi" className="px-4">Tiếng Việt</TabsTrigger>
                        <TabsTrigger value="en" className="px-4">English</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="vi">
                      <FormField label="Nội dung tiếng Việt" required error={form.formState.errors.translations?.vi?.message}>
                        <Controller
                          control={form.control}
                          name="translations.vi"
                          render={({ field }) => watchedType === "plain_text" ? (
                            <Input {...field} value={field.value || ""} aria-label="Giá trị tiếng Việt" aria-required="true" aria-invalid={Boolean(form.formState.errors.translations?.vi)} placeholder="Ví dụ: Sales@kindtraveldmc.com" />
                          ) : <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Nhập giá trị cấu hình bằng tiếng Việt..." invalid={Boolean(form.formState.errors.translations?.vi)} />}
                        />
                      </FormField>
                    </TabsContent>
                    <TabsContent value="en">
                      <FormField label="English content" error={form.formState.errors.translations?.en?.message}>
                        <Controller
                          control={form.control}
                          name="translations.en"
                          render={({ field }) => watchedType === "plain_text" ? (
                            <Input {...field} value={field.value || ""} aria-label="English value" aria-invalid={Boolean(form.formState.errors.translations?.en)} placeholder="Leave blank to use the Vietnamese value" />
                          ) : <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Enter the setting value in English..." invalid={Boolean(form.formState.errors.translations?.en)} />}
                        />
                      </FormField>
                    </TabsContent>
                  </Tabs>
                ) : watchedType === "image" ? (
                  <FormField label="Ảnh" required error={form.formState.errors.value?.message}>
                    <Controller
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <ImagePickerField
                          active={open} disabled={isPending}
                          mode="single"
                          existing={imageExisting}
                          pending={pendingImages}
                          allowAltText={false}
                          helperText="JPEG, PNG, WebP, AVIF · tối đa 50MB · chỉ upload khi lưu setting"
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
                ) : (
                  <FormField label="Video" required error={form.formState.errors.value?.message}>
                    <VideoPickerField
                      existingUrl={watchedValue}
                      pending={pendingVideo}
                      disabled={isPending}
                      onChange={(nextVideo) => {
                        if (pendingVideo) URL.revokeObjectURL(pendingVideo.previewUrl);
                        setPendingVideo(nextVideo);
                        setMessage(undefined);
                      }}
                      onError={setMessage}
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
  if (type === "image") return <Badge variant="secondary"><ImageIcon data-icon="inline-start" />Ảnh</Badge>;
  if (type === "video") return <Badge variant="secondary"><Video data-icon="inline-start" />Video</Badge>;
  if (type === "plain_text") return <Badge variant="outline"><Type data-icon="inline-start" />Văn bản thuần</Badge>;
  return <Badge variant="outline"><Type data-icon="inline-start" />Text</Badge>;
}

function SettingValuePreview({ setting }: { setting: AdminSetting }) {
  if (setting.type === "image") {
    return (
      <img src={setting.value} alt={setting.description || setting.key} className="size-14 rounded-xl border object-cover" />
    );
  }

  if (setting.type === "video") {
    return (
      <SettingVideoPreview key={setting.value} src={setting.value || ""} label={setting.description || setting.key} />
    );
  }

  return <p className="line-clamp-2 max-w-xs text-sm text-slate-700">{setting.type === "plain_text" ? setting.translations.vi : stripHtml(setting.translations.vi)}</p>;
}

function VideoPickerField({
  existingUrl,
  pending,
  disabled,
  onChange,
  onError,
}: {
  existingUrl: string;
  pending?: PendingSettingVideo;
  disabled: boolean;
  onChange: (video?: PendingSettingVideo) => void;
  onError: (message?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = pending?.previewUrl || existingUrl;

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,.mp4"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.type !== "video/mp4") {
            onError("Chỉ hỗ trợ video MP4.");
            return;
          }
          if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
            onError("Dung lượng video phải lớn hơn 0 và không vượt quá 50 MB.");
            return;
          }
          onChange({ file, previewUrl: URL.createObjectURL(file) });
        }}
      />

      <div className="rounded-[24px] border border-dashed border-white/70 bg-white/72 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{pending ? pending.file.name : existingUrl ? "Video hiện tại" : "Chưa chọn video"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pending ? `${formatFileSize(pending.file.size)} · chỉ upload khi lưu setting` : "MP4 · tối đa 50 MB · chỉ upload khi lưu setting"}
            </p>
          </div>
          <div className="flex gap-2">
            {pending && <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange(undefined)}>Bỏ file đã chọn</Button>}
            <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
              <Upload data-icon="inline-start" />{previewUrl ? "Thay video" : "Chọn video"}
            </Button>
          </div>
        </div>
      </div>

      {previewUrl && (
        <video
          src={previewUrl}
          controls
          preload="metadata"
          className="aspect-video w-full rounded-2xl border bg-black object-contain"
        >
          Trình duyệt không hỗ trợ phát video.
        </video>
      )}
    </div>
  );
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="gap-0">{label}{required && <RequiredMark />}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function RequiredMark() {
  return <span className="ml-0.5 text-destructive" aria-label="required">*</span>;
}

function toFormValues(setting: AdminSetting | null, category: SettingCategory): SettingFormValues {
  if (!setting) {
    return {
      key: "",
      category,
      description: "",
      type: "text",
      canDelete: false,
      value: "",
      translations: { vi: "", en: "" },
    };
  }

  return {
    originalKey: setting.key,
    key: setting.key,
    category: setting.category,
    description: setting.description ?? "",
    type: setting.type,
    canDelete: setting.canDelete,
    value: setting.value ?? "",
    translations: { vi: setting.translations.vi, en: setting.translations.en ?? "" },
  };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
