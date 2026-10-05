"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DESTINATION_COUNTRIES, DESTINATION_COUNTRY_LABELS, isDestinationCountry } from "@destination-country";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Edit3, Languages, Loader2, MapPin, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";

import {
  deleteAdminDestinationAction,
  listAdminDestinationsAction,
  saveAdminDestinationAction,
  searchDestinationProvincesAction,
} from "@/app/admin/destinations/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminListTable } from "@/components/admin/shared/admin-list-table";
import { ExpandableText } from "@/components/admin/shared/expandable-text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/admin/tours/rich-text-editor";
import { CoverImageUploadField, type PendingImage } from "@/components/admin/shared/cover-image-upload-field";
import { submitUpload } from "@/features/shared/upload-validation";
import {
  destinationEditorSchema,
  pendingImagesSchema,
  imageFieldErrors,
  type DestinationEditorFormValues,
  type DestinationEditorValues,
} from "@/features/admin-tours/tour-form-schema";
import type { AdminDestination, AdminProvince } from "@/features/admin-tours/tour-types";
import type { AdminListQuery, AdminListResult } from "@/features/shared/admin-list";
import { ServerPagination } from "@/components/admin/shared/server-pagination";
import { useServerPagination } from "@/hooks/use-server-pagination";

type Locale = "vi" | "en";

const helper = createColumnHelper<AdminDestination>();

export function DestinationManagement({ initialResult }: { initialResult: AdminListResult<AdminDestination> }) {
  const router = useRouter();
  const loadPage = useCallback((input: AdminListQuery) => listAdminDestinationsAction(input), []);
  const list = useServerPagination({ initialResult, loadPage });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<AdminDestination | null>(null);
  const [deletingDestination, setDeletingDestination] = useState<AdminDestination | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string>();
  const [isDeleting, startDelete] = useTransition();

  const columns = useMemo(() => [
    helper.accessor((destination) => getDestinationName(destination), {
      id: "name",
      header: "Điểm đến",
      cell: ({ row, getValue }) => (
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-800">
            {row.original.images.find((image) => image.role === "cover") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.original.images.find((image) => image.role === "cover")!.url} alt="" className="size-12 rounded-xl object-cover" />
            ) : <MapPin className="size-5" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <ExpandableText text={getValue()} className="font-medium text-foreground" />
            <ExpandableText text={getDestinationDescription(row.original)} className="text-xs text-muted-foreground" />
          </div>
        </div>
      ),
    }),
    helper.accessor((destination) => DESTINATION_COUNTRY_LABELS[destination.country], {
      id: "country",
      header: "Quốc gia",
      cell: ({ getValue }) => <Badge variant="outline">{getValue()}</Badge>,
    }),
    helper.display({
      id: "provinces",
      header: "Tỉnh/thành",
      cell: ({ row }) => row.original.provinces.length ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {row.original.provinces.slice(0, 3).map((province) => (
            <Badge key={province.code} variant="secondary" className="h-auto max-w-full items-start whitespace-normal py-1">
              <MapPin data-icon="inline-start" className="mt-0.5 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">{province.fullName || province.name}</span>
            </Badge>
          ))}
          {row.original.provinces.length > 3 && <Badge variant="outline">+{row.original.provinces.length - 3}</Badge>}
        </div>
      ) : <span className="text-muted-foreground">{row.original.country === "VN" ? "Chưa liên kết" : "Không áp dụng"}</span>,
    }),
    helper.display({
      id: "languages",
      header: "Ngôn ngữ",
      cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
          {row.original.translations.map((item) => (
            <Badge key={item.locale} variant="secondary"><Languages data-icon="inline-start" />{item.locale.toUpperCase()}</Badge>
          ))}
        </div>
      ),
    }),
    helper.accessor((destination) => destination.tourCount ?? 0, {
      id: "tourCount",
      header: "Tour",
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()} tour</span>,
    }),
    helper.accessor((destination) => destination.updatedAt ?? "", {
      id: "updatedAt",
      header: "Cập nhật",
      cell: ({ getValue }) => getValue()
        ? <span className="text-muted-foreground">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(getValue()))}</span>
        : <span className="text-muted-foreground">—</span>,
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const linkedTourCount = row.original.tourCount ?? 0;

        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Chỉnh sửa điểm đến"
              onClick={() => {
                setEditingDestination(row.original);
                setDrawerOpen(true);
              }}
            >
              <Edit3 />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Xóa điểm đến"
              disabled={linkedTourCount > 0}
              title={linkedTourCount > 0 ? "Điểm đến đang được gắn với tour" : undefined}
              onClick={() => {
                setDeleteMessage(undefined);
                setDeletingDestination(row.original);
              }}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        );
      },
    }),
  ], []);

  const table = useReactTable({
    data: list.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <section>
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">Danh sách điểm đến</h1>
      
          </div>
          <Button
            size="lg"
            className="solid-accent-button h-11 rounded-2xl px-5"
            onClick={() => {
              setEditingDestination(null);
              setDrawerOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />Tạo điểm đến
          </Button>
        </div>

        <Card className="gap-0 overflow-hidden rounded-[28px] border border-cyan-900/15 bg-white/95 py-0 shadow-[0_18px_55px_-42px_rgba(8,47,73,0.55)]">
          <div className="flex flex-col gap-3 border-b border-cyan-900/15 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" strokeWidth={2.75} />
              <Input value={list.query} onChange={(event) => list.setQuery(event.target.value)} className="glass-input h-10 rounded-2xl pl-9" placeholder="Tìm theo tên, mô tả điểm đến..." />
            </div>
            <p className="rounded-full border border-cyan-900/15 bg-cyan-50 px-3 py-1 text-sm font-medium text-slate-800">{list.total} điểm đến</p>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <AdminListTable className="min-w-[1160px]">
                <colgroup><col /><col className="w-32" /><col className="w-60" /><col className="w-28" /><col className="w-20" /><col className="w-36" /><col className="w-28" /></colgroup>
                <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id} className="border-cyan-900/15 hover:bg-transparent">{group.headers.map((header) => <TableHead key={header.id} className="font-semibold text-slate-700">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-52 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><div className="mb-3 grid size-12 place-items-center rounded-2xl bg-muted"><MoreHorizontal className="size-5" /></div><p className="font-medium">Chưa tìm thấy điểm đến</p><p className="mt-1 text-sm text-muted-foreground">Tạo điểm đến mới hoặc thử từ khóa khác.</p></div></TableCell></TableRow>}</TableBody>
              </AdminListTable>
            </div>
            <ServerPagination {...list} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} />
          </CardContent>
        </Card>
      </section>

      {drawerOpen && <DestinationFormDrawer
        key={editingDestination?.destinationId || "new"}
        open={drawerOpen}
        destination={editingDestination}
        initialProvinces={list.items.flatMap((destination) => destination.provinces)}
        onSaved={() => { list.reload(); router.refresh(); }}
        onOpenChange={setDrawerOpen}
      />}
      <AlertDialog open={Boolean(deletingDestination)} onOpenChange={(open) => !open && setDeletingDestination(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa điểm đến này?</AlertDialogTitle>
            <AlertDialogDescription>Điểm đến, bản dịch, hình ảnh và liên kết tỉnh/thành sẽ bị xóa. Chỉ có thể xóa điểm đến chưa được gắn với tour.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMessage && <Alert><AlertDescription>{deleteMessage}</AlertDescription></Alert>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                if (!deletingDestination) return;
                startDelete(async () => {
                  const result = await deleteAdminDestinationAction(deletingDestination.destinationId);
                  setDeleteMessage(result.message);
                    if (result.success) {
                      setDeletingDestination(null);
                      list.reload();
                      router.refresh();
                  }
                });
              }}
            >
              {isDeleting ? "Đang xóa..." : "Xóa điểm đến"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DestinationFormDrawer({
  open,
  destination,
  initialProvinces,
  onSaved,
  onOpenChange,
}: {
  open: boolean;
  destination: AdminDestination | null;
  initialProvinces: AdminProvince[];
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const values = useMemo(() => toEditorValues(destination), [destination]);
  const [locale, setLocale] = useState<Locale>("en");
  const [message, setMessage] = useState<string>();
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, string[]>>({});
  const saveRequestId = useRef<string | undefined>(undefined);
  const pendingImagesRef = useRef(pendingImages);
  useEffect(() => { pendingImagesRef.current = pendingImages; }, [pendingImages]);
  useEffect(() => () => {
    pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);
  const [provinceQuery, setProvinceQuery] = useState("");
  const [provinceResults, setProvinceResults] = useState<AdminProvince[]>([]);
  const [knownProvinces, setKnownProvinces] = useState<AdminProvince[]>(initialProvinces);
  const [isPending, startTransition] = useTransition();
  const form = useForm<DestinationEditorFormValues, unknown, DestinationEditorValues>({ resolver: zodResolver(destinationEditorSchema), values });
  const country = form.watch("country");
  const provinceSearchVersion = useRef(0);
  const watchedProvinceCodes = form.watch("provinceCodes") ?? [];
  const provinceMap = useMemo(() => {
    const map = new Map<string, AdminProvince>();

    for (const province of knownProvinces) {
      map.set(province.code, province);
    }

    return map;
  }, [knownProvinces]);

  const searchProvinces = (query: string) => {
    const version = ++provinceSearchVersion.current;
    setProvinceQuery(query);

    if (form.getValues("country") !== "VN" || query.trim().length < 2) {
      setProvinceResults([]);
      return;
    }

    startTransition(async () => {
      const results = await searchDestinationProvincesAction(query);
      if (version !== provinceSearchVersion.current || form.getValues("country") !== "VN") return;
      setProvinceResults(results);
      mergeKnownProvinces(results);
    });
  };

  const addProvince = (province: AdminProvince) => {
    if (form.getValues("country") !== "VN") return;
    const currentCodes = form.getValues("provinceCodes") ?? [];
    if (currentCodes.includes(province.code)) return;

    mergeKnownProvinces([province]);
    form.setValue("provinceCodes", [...currentCodes, province.code], { shouldDirty: true, shouldValidate: true });
    provinceSearchVersion.current += 1;
    setProvinceQuery("");
    setProvinceResults([]);
  };

  const removeProvince = (provinceCode: string) => {
    form.setValue(
      "provinceCodes",
      (form.getValues("provinceCodes") ?? []).filter((code) => code !== provinceCode),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const submit = form.handleSubmit((data) => {
    const requestId = saveRequestId.current ?? crypto.randomUUID();
    console.info("[DestinationSave] client:validation_passed", {
      requestId, mode: data.destinationId ? "edit" : "create", country: data.country,
      provinceCount: data.provinceCodes.length, existingImageCount: data.existingImages?.length ?? 0,
      pendingImageCount: pendingImages.length,
    });
    setMessage(undefined);
    const parsedPending = pendingImagesSchema.safeParse(pendingImages);
    if (!parsedPending.success) {
      console.warn("[DestinationSave] client:pending_images_invalid", {
        requestId, issues: parsedPending.error.issues.map(({ path, code, message }) => ({ path: path.join("."), code, message })),
      });
      setImageErrors(imageFieldErrors(parsedPending.error.issues, "pendingImages"));
      setMessage("Vui lòng kiểm tra lại tên ảnh.");
      return;
    }
    setImageErrors({});
    startTransition(async () => {
      const body = new FormData();
      body.set("saveRequestId", requestId);
      body.set("payload", JSON.stringify({ ...data, existingImages: data.existingImages ?? [] }));
      body.set("pendingImages", JSON.stringify(parsedPending.data));
      pendingImages.forEach((image) => body.set(`file:${image.clientId}`, image.file));
      console.info("[DestinationSave] client:upload_validation_start", { requestId });
      const result = await submitUpload(body, async (payload) => {
        console.info("[DestinationSave] client:action_dispatch", { requestId });
        try {
          return await saveAdminDestinationAction(payload);
        } catch (error) {
          console.error("[DestinationSave] client:action_rejected", {
            requestId, errorName: error instanceof Error ? error.name : "UnknownError",
          });
          throw error;
        }
      });
      console.info("[DestinationSave] client:result", {
        requestId, success: result.success, fieldPaths: Object.keys(result.fieldErrors ?? {}),
      });
      setMessage(result.message);
      if (result.fieldErrors) setImageErrors(result.fieldErrors);
      if (result.fieldErrors?.country?.[0]) {
        form.setError("country", { type: "server", message: result.fieldErrors.country[0] });
      }
      const provinceError = Object.entries(result.fieldErrors ?? {}).find(([path]) => path === "provinceCodes" || path.startsWith("provinceCodes."))?.[1]?.[0];
      if (provinceError) form.setError("provinceCodes", { type: "server", message: provinceError });
      if (result.success) {
        console.info("[DestinationSave] client:close_and_reload", { requestId });
        onOpenChange(false);
        onSaved();
      }
    });
  }, (errors) => {
    if (errors.translations?.en) setLocale("en");
    else if (errors.translations?.vi) setLocale("vi");
    const parsed = destinationEditorSchema.safeParse(form.getValues());
    console.warn("[DestinationSave] client:validation_failed", {
      requestId: saveRequestId.current, fields: Object.keys(errors),
      issues: parsed.success ? [] : parsed.error.issues.map(({ path, code, message }) => ({ path: path.join("."), code, message })),
    });
  });

  function mergeKnownProvinces(provinces: AdminProvince[]) {
    setKnownProvinces((current) => {
      const map = new Map(current.map((province) => [province.code, province]));

      for (const province of provinces) {
        map.set(province.code, province);
      }

      return [...map.values()];
    });
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!isPending) onOpenChange(nextOpen); }}>
      <SheetContent fullscreen className="tour-drawer-surface gap-0 text-slate-950" showCloseButton={!isPending}>
        <SheetHeader className="tour-drawer-chrome sticky top-0 z-20 rounded-none border-x-0 border-t-0 px-5 py-4 sm:px-8">
          <div className="mx-auto w-full max-w-[1180px] pr-12">
            <SheetTitle className="text-xl sm:text-2xl">{destination ? "Chỉnh sửa điểm đến" : "Tạo điểm đến"}</SheetTitle>
            <SheetDescription className="mt-1">Nội dung tiếng Anh là bắt buộc. Ảnh mới chỉ được upload khi lưu điểm đến.</SheetDescription>
          </div>
        </SheetHeader>

        <form onSubmit={submit} onSubmitCapture={() => {
          saveRequestId.current = crypto.randomUUID();
          console.info("[DestinationSave] client:submit_event", { requestId: saveRequestId.current });
        }} onInvalidCapture={(event) => {
          const target = event.target as HTMLInputElement;
          console.warn("[DestinationSave] client:native_validation_blocked", { field: target.name || target.id });
        }} className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="mx-auto w-full max-w-[1180px] space-y-7">
              {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

              <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
                <SectionHeading title="Quốc gia" description="Quốc gia dùng chung cho tất cả bản dịch và các tour liên kết." />
                <div className="space-y-2 sm:max-w-sm">
                  <Label htmlFor="destination-country">Quốc gia<RequiredMark /></Label>
                  <select
                    id="destination-country"
                    required
                    disabled={isPending}
                    aria-invalid={Boolean(form.formState.errors.country)}
                    aria-describedby={form.formState.errors.country ? "destination-country-error" : undefined}
                    className="glass-input h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                    {...form.register("country", {
                      onChange: (event) => {
                        const nextCountry: unknown = event.target.value;
                        if (!isDestinationCountry(nextCountry)) return;
                        provinceSearchVersion.current += 1;
                        setProvinceQuery("");
                        setProvinceResults([]);
                        if (nextCountry !== "VN") {
                          form.setValue("provinceCodes", [], { shouldDirty: true, shouldValidate: true });
                        }
                      },
                    })}
                  >
                    {DESTINATION_COUNTRIES.map((value) => <option key={value} value={value}>{DESTINATION_COUNTRY_LABELS[value]}</option>)}
                  </select>
                  {form.formState.errors.country && <p id="destination-country-error" role="alert" className="text-xs text-destructive">{form.formState.errors.country.message}</p>}
                </div>
                {country !== "VN" && <p className="text-sm text-muted-foreground">Liên kết tỉnh/thành chỉ áp dụng cho Việt Nam. Khi lưu quốc gia Lào hoặc Cambodia, các liên kết tỉnh/thành trước đó sẽ được xóa.</p>}
              </section>

              <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
                <SectionHeading title="Nội dung đa ngôn ngữ" description="Tên tiếng Anh là bắt buộc, tiếng Việt có thể bổ sung sau." />
                <Tabs value={locale} onValueChange={(value) => isLocale(value) && setLocale(value)}>
                  <TabsList><TabsTrigger value="en">English *</TabsTrigger><TabsTrigger value="vi">Tiếng Việt</TabsTrigger></TabsList>
                  {(["en", "vi"] as const).map((currentLocale) => (
                    <TabsContent key={currentLocale} value={currentLocale} className="space-y-4 pt-3">
                      <FormField label={`Tên điểm đến (${currentLocale.toUpperCase()})`} required={currentLocale === "en"} error={form.formState.errors.translations?.[currentLocale]?.name?.message}>
                        <Input aria-invalid={Boolean(form.formState.errors.translations?.[currentLocale]?.name)} {...form.register(`translations.${currentLocale}.name`)} placeholder={currentLocale === "vi" ? "Ví dụ: Hà Giang" : "Example: Ha Giang"} />
                      </FormField>
                      <FormField label={`Mô tả (${currentLocale.toUpperCase()})`} error={form.formState.errors.translations?.[currentLocale]?.description?.message}>
                        <Controller control={form.control} name={`translations.${currentLocale}.description`} render={({ field }) => <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Mô tả điểm nổi bật của điểm đến..." invalid={Boolean(form.formState.errors.translations?.[currentLocale]?.description)} />} />
                      </FormField>
                      {(["visa", "weather"] as const).map((fieldName) => {
                        const label = `${fieldName === "visa" ? "Visa" : "Weather"} (${currentLocale.toUpperCase()})`;
                        const fieldError = form.formState.errors.translations?.[currentLocale]?.[fieldName];
                        return (
                          <FormField key={fieldName} label={label} error={fieldError?.message}>
                            <Controller control={form.control} name={`translations.${currentLocale}.${fieldName}`} render={({ field }) => (
                              <RichTextEditor value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} label={label} disabled={isPending}
                                placeholder={fieldName === "visa" ? "Thông tin visa (không bắt buộc)..." : "Thông tin thời tiết (không bắt buộc)..."} invalid={Boolean(fieldError)} />
                            )} />
                          </FormField>
                        );
                      })}
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
                <SectionHeading title="Hình ảnh" description="Chọn, kéo thả hoặc paste ảnh. Tên ảnh không bắt buộc và dùng chung cho mọi ngôn ngữ. Chỉ một ảnh được đặt làm ảnh bìa." />
                <fieldset disabled={isPending}>
                  <legend className="sr-only">Hình ảnh điểm đến</legend>
                  <Controller control={form.control} name="existingImages" render={({ field }) => (
                    <CoverImageUploadField active={open} disabled={isPending} ensureCover
                      existing={field.value ?? []} pending={pendingImages}
                      helperText="JPEG, PNG, WebP, AVIF · tối đa 50MB · chỉ upload khi lưu điểm đến"
                      errors={{ ...imageErrors, ...Object.fromEntries((field.value ?? []).flatMap((_, index) => {
                        const error = form.formState.errors.existingImages?.[index]?.altText?.message;
                        return error ? [[`existingImages.${index}.altText`, [error]]] : [];
                      })) }}
                      onExistingChange={(images) => { setImageErrors({}); field.onChange(images); }}
                      onPendingChange={(images) => { setImageErrors({}); setPendingImages(images); }} />
                  )} />
                </fieldset>
              </section>

              {country === "VN" && <section className="tour-drawer-panel relative z-30 space-y-4 overflow-visible rounded-[28px] p-5 sm:p-7">
                <SectionHeading title="Tỉnh/thành liên quan" description="Chọn các tỉnh/thành để hỗ trợ tìm kiếm và phân loại điểm đến." />
                <div className="space-y-2">
                  <Label htmlFor="destination-province-search">Tìm tỉnh/thành</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" strokeWidth={2.75} />
                    <Input id="destination-province-search" value={provinceQuery} onChange={(event) => searchProvinces(event.target.value)} aria-invalid={Boolean(form.formState.errors.provinceCodes)} aria-describedby={form.formState.errors.provinceCodes ? "destination-provinces-error" : undefined} className="glass-input h-10 rounded-2xl pl-9" placeholder="Tìm tên hoặc mã tỉnh/thành" />
                  </div>
                  {provinceQuery.trim().length >= 2 && (
                    <div className="max-h-56 overflow-y-auto rounded-2xl border border-cyan-900/15 bg-white p-2 shadow-[0_18px_45px_-35px_rgba(8,47,73,0.65)]">
                      {isPending ? <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tìm tỉnh/thành...</p> : provinceResults.length ? provinceResults.map((province) => (
                        <button key={province.code} type="button" disabled={watchedProvinceCodes.includes(province.code)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50" onClick={() => addProvince(province)}>
                          <span className="font-medium">{province.fullName || province.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{province.code}{watchedProvinceCodes.includes(province.code) ? " · Đã chọn" : ""}</span>
                        </button>
                      )) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">Không tìm thấy tỉnh/thành phù hợp.</p>}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {watchedProvinceCodes.length ? watchedProvinceCodes.map((provinceCode) => {
                    const province = provinceMap.get(provinceCode) ?? { code: provinceCode, name: provinceCode };

                    return (
                      <Badge key={provinceCode} variant="secondary" className="h-7 gap-1.5 rounded-full">
                        {province.fullName || province.name}
                        <button type="button" aria-label={`Bỏ ${province.name}`} onClick={() => removeProvince(provinceCode)}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    );
                  }) : <p className="text-xs text-muted-foreground">Chưa chọn tỉnh/thành. Có thể bổ sung sau.</p>}
                </div>
                {form.formState.errors.provinceCodes && <p id="destination-provinces-error" role="alert" className="text-xs text-destructive">{form.formState.errors.provinceCodes.message}</p>}
              </section>}
            </div>
          </div>

          <SheetFooter className="tour-drawer-chrome sticky bottom-0 z-20 rounded-none border-x-0 border-b-0 px-5 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-[1180px] flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-6 text-base" disabled={isPending} onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" size="lg" className="h-12 rounded-2xl px-6 text-base" disabled={isPending} onClick={() => console.info("[DestinationSave] client:save_clicked", { isPending })}>{isPending ? "Đang lưu..." : destination ? "Lưu thay đổi" : "Tạo điểm đến"}</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function createEmptyEditorValues(): DestinationEditorFormValues {
  return {
    country: "VN",
    existingImages: [],
    provinceCodes: [],
    translations: {
      vi: { name: "", description: "", visa: "", weather: "" },
      en: { name: "", description: "", visa: "", weather: "" },
    },
  };
}

function toEditorValues(destination: AdminDestination | null): DestinationEditorFormValues {
  if (!destination) return createEmptyEditorValues();
  const vi = destination.translations.find((translation) => translation.locale === "vi");
  const en = destination.translations.find((translation) => translation.locale === "en");

  return {
    destinationId: destination.destinationId,
    existingImages: destination.images.map((image) => ({ ...image, altText: image.altText || "" })),
    country: destination.country,
    provinceCodes: destination.country === "VN" ? destination.provinces.map((province) => province.code) : [],
    translations: {
      vi: { name: vi?.name || "", description: vi?.description || "", visa: vi?.visa || "", weather: vi?.weather || "" },
      en: { name: en?.name || "", description: en?.description || "", visa: en?.visa || "", weather: en?.weather || "" },
    },
  };
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h3 className="font-heading text-base font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="gap-0">{label}{required && <RequiredMark />}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function RequiredMark() {
  return <span className="ml-0.5 text-destructive" aria-label="required">*</span>;
}

function getDestinationName(destination: AdminDestination): string {
  return destination.translations.find((translation) => translation.locale === "en")?.name || "Chưa đặt tên";
}

function getDestinationDescription(destination: AdminDestination): string {
  const description = destination.translations.find((translation) => translation.locale === "en")?.description;
  const text = stripHtml(description || "");

  return text || "Chưa có mô tả điểm đến.";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}
