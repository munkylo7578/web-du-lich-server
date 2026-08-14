"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Edit3, Languages, Loader2, MapPin, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";

import {
  deleteAdminDestinationAction,
  saveAdminDestinationAction,
  searchDestinationWardsAction,
} from "@/app/admin/destinations/actions";
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
import { RichTextEditor } from "@/components/admin/tours/rich-text-editor";
import {
  destinationEditorSchema,
  type DestinationEditorFormValues,
} from "@/features/admin-tours/tour-form-schema";
import type { AdminDestination, AdminWard } from "@/features/admin-tours/tour-types";

type Locale = "vi" | "en";

const helper = createColumnHelper<AdminDestination>();

export function DestinationManagement({ destinations }: { destinations: AdminDestination[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
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
        <div className="flex min-w-72 items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
            <MapPin className="size-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{getValue()}</p>
            <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
              {getDestinationDescription(row.original)}
            </p>
          </div>
        </div>
      ),
    }),
    helper.display({
      id: "wards",
      header: "Phường/xã",
      cell: ({ row }) => row.original.wards.length ? (
        <div className="flex max-w-sm flex-wrap gap-1.5">
          {row.original.wards.slice(0, 3).map((ward) => (
            <Badge key={ward.code} variant="secondary">
              <MapPin data-icon="inline-start" />{ward.fullName || ward.name}
            </Badge>
          ))}
          {row.original.wards.length > 3 && <Badge variant="outline">+{row.original.wards.length - 3}</Badge>}
        </div>
      ) : <span className="text-muted-foreground">Chưa liên kết</span>,
    }),
    helper.display({
      id: "languages",
      header: "Ngôn ngữ",
      cell: ({ row }) => (
        <div className="flex gap-1.5">
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
    data: destinations,
    columns,
    state: { globalFilter: query },
    onGlobalFilterChange: setQuery,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <>
      <section>
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Dữ liệu dùng chung</p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">Danh sách điểm đến</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Quản lý điểm đến một lần, sau đó tìm và gắn vào nhiều tour khác nhau.</p>
          </div>
          <Button
            size="lg"
            className="glass-gradient-button h-11 rounded-2xl px-5"
            onClick={() => {
              setEditingDestination(null);
              setDrawerOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />Tạo điểm đến
          </Button>
        </div>

        <Card className="gap-0 overflow-hidden rounded-[28px] border bg-white py-0 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-white/55 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" strokeWidth={2.75} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="glass-input h-10 rounded-2xl pl-9" placeholder="Tìm theo tên, mô tả điểm đến..." />
            </div>
            <p className="rounded-full border bg-white px-3 py-1 text-sm text-slate-600">{table.getFilteredRowModel().rows.length} điểm đến</p>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id} className="border-white/45 hover:bg-transparent">{group.headers.map((header) => <TableHead key={header.id} className="text-slate-600">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-52 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><div className="mb-3 grid size-12 place-items-center rounded-2xl bg-muted"><MoreHorizontal className="size-5" /></div><p className="font-medium">Chưa tìm thấy điểm đến</p><p className="mt-1 text-sm text-muted-foreground">Tạo điểm đến mới hoặc thử từ khóa khác.</p></div></TableCell></TableRow>}</TableBody>
              </Table>
            </div>
            {table.getPageCount() > 1 && <div className="flex items-center justify-end gap-2 border-t p-4"><Button variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Trước</Button><span className="px-2 text-sm text-muted-foreground">{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span><Button variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Sau</Button></div>}
          </CardContent>
        </Card>
      </section>

      <DestinationFormDrawer
        key={editingDestination?.destinationId || "new"}
        open={drawerOpen}
        destination={editingDestination}
        initialWards={destinations.flatMap((destination) => destination.wards)}
        onSaved={() => router.refresh()}
        onOpenChange={setDrawerOpen}
      />
      <AlertDialog open={Boolean(deletingDestination)} onOpenChange={(open) => !open && setDeletingDestination(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa điểm đến này?</AlertDialogTitle>
            <AlertDialogDescription>Điểm đến, bản dịch và liên kết phường/xã sẽ bị xóa. Chỉ có thể xóa điểm đến chưa được gắn với tour.</AlertDialogDescription>
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
  initialWards,
  onSaved,
  onOpenChange,
}: {
  open: boolean;
  destination: AdminDestination | null;
  initialWards: AdminWard[];
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const values = useMemo(() => toEditorValues(destination), [destination]);
  const [locale, setLocale] = useState<Locale>("vi");
  const [message, setMessage] = useState<string>();
  const [wardQuery, setWardQuery] = useState("");
  const [wardResults, setWardResults] = useState<AdminWard[]>([]);
  const [knownWards, setKnownWards] = useState<AdminWard[]>(initialWards);
  const [isPending, startTransition] = useTransition();
  const form = useForm<DestinationEditorFormValues>({ resolver: zodResolver(destinationEditorSchema), values });
  const watchedWardCodes = form.watch("wardCodes") ?? [];
  const wardMap = useMemo(() => {
    const map = new Map<string, AdminWard>();

    for (const ward of knownWards) {
      map.set(ward.code, ward);
    }

    return map;
  }, [knownWards]);

  const searchWards = (query: string) => {
    setWardQuery(query);

    if (query.trim().length < 2) {
      setWardResults([]);
      return;
    }

    startTransition(async () => {
      const results = await searchDestinationWardsAction(query);
      setWardResults(results);
      mergeKnownWards(results);
    });
  };

  const addWard = (ward: AdminWard) => {
    const currentCodes = form.getValues("wardCodes") ?? [];
    if (currentCodes.includes(ward.code)) return;

    mergeKnownWards([ward]);
    form.setValue("wardCodes", [...currentCodes, ward.code], { shouldDirty: true, shouldValidate: true });
    setWardQuery("");
    setWardResults([]);
  };

  const removeWard = (wardCode: string) => {
    form.setValue(
      "wardCodes",
      (form.getValues("wardCodes") ?? []).filter((code) => code !== wardCode),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const submit = form.handleSubmit((data) => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await saveAdminDestinationAction(data);
      setMessage(result.message);
      if (result.success) {
        onOpenChange(false);
        onSaved();
      }
    });
  });

  function mergeKnownWards(wards: AdminWard[]) {
    setKnownWards((current) => {
      const map = new Map(current.map((ward) => [ward.code, ward]));

      for (const ward of wards) {
        map.set(ward.code, ward);
      }

      return [...map.values()];
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent fullscreen className="tour-drawer-surface gap-0 text-slate-950" showCloseButton={!isPending}>
        <SheetHeader className="tour-drawer-chrome sticky top-0 z-20 rounded-none border-x-0 border-t-0 px-5 py-4 sm:px-8">
          <div className="mx-auto w-full max-w-[1180px] pr-12">
            <SheetTitle className="text-xl sm:text-2xl">{destination ? "Chỉnh sửa điểm đến" : "Tạo điểm đến"}</SheetTitle>
            <SheetDescription className="mt-1">Nội dung tiếng Việt là bắt buộc. Điểm đến có thể liên kết nhiều phường/xã.</SheetDescription>
          </div>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="mx-auto w-full max-w-[1180px] space-y-7">
              {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

              <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
                <SectionHeading title="Nội dung đa ngôn ngữ" description="Tên tiếng Việt là bắt buộc, tiếng Anh có thể bổ sung sau." />
                <Tabs value={locale} onValueChange={(value) => isLocale(value) && setLocale(value)}>
                  <TabsList><TabsTrigger value="vi">Tiếng Việt *</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList>
                  {(["vi", "en"] as const).map((currentLocale) => (
                    <TabsContent key={currentLocale} value={currentLocale} className="space-y-4 pt-3">
                      <FormField label={`Tên điểm đến (${currentLocale.toUpperCase()})`} error={form.formState.errors.translations?.[currentLocale]?.name?.message}>
                        <Input aria-invalid={Boolean(form.formState.errors.translations?.[currentLocale]?.name)} {...form.register(`translations.${currentLocale}.name`)} placeholder={currentLocale === "vi" ? "Ví dụ: Hà Giang" : "Example: Ha Giang"} />
                      </FormField>
                      <FormField label={`Mô tả (${currentLocale.toUpperCase()})`} error={form.formState.errors.translations?.[currentLocale]?.description?.message}>
                        <Controller control={form.control} name={`translations.${currentLocale}.description`} render={({ field }) => <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Mô tả điểm nổi bật của điểm đến..." invalid={Boolean(form.formState.errors.translations?.[currentLocale]?.description)} />} />
                      </FormField>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              <section className="tour-drawer-panel relative z-30 space-y-4 overflow-visible rounded-[28px] p-5 sm:p-7">
                <SectionHeading title="Phường/xã liên quan" description="Chọn các phường/xã để hỗ trợ tìm kiếm và phân loại điểm đến." />
                <div className="space-y-2">
                  <Label>Tìm phường/xã</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" strokeWidth={2.75} />
                    <Input value={wardQuery} onChange={(event) => searchWards(event.target.value)} className="glass-input h-10 rounded-2xl pl-9" placeholder="Tìm phường/xã, tỉnh/thành" />
                  </div>
                  {wardQuery.trim().length >= 2 && (
                    <div className="max-h-56 overflow-y-auto rounded-2xl border bg-white p-2 shadow-sm">
                      {isPending ? <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tìm phường/xã...</p> : wardResults.length ? wardResults.map((ward) => (
                        <button key={ward.code} type="button" className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cyan-50" onClick={() => addWard(ward)}>
                          <span className="font-medium">{ward.fullName || ward.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{ward.provinceName}</span>
                        </button>
                      )) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">Không tìm thấy phường/xã phù hợp.</p>}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {watchedWardCodes.length ? watchedWardCodes.map((wardCode) => {
                    const ward = wardMap.get(wardCode) ?? { code: wardCode, name: wardCode };

                    return (
                      <Badge key={wardCode} variant="secondary" className="h-7 gap-1.5 rounded-full">
                        {ward.fullName || ward.name}{ward.provinceName ? `, ${ward.provinceName}` : ""}
                        <button type="button" aria-label={`Bỏ ${ward.name}`} onClick={() => removeWard(wardCode)}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    );
                  }) : <p className="text-xs text-muted-foreground">Chưa chọn phường/xã. Có thể bổ sung sau.</p>}
                </div>
              </section>
            </div>
          </div>

          <SheetFooter className="tour-drawer-chrome sticky bottom-0 z-20 rounded-none border-x-0 border-b-0 px-5 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-[1180px] flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : destination ? "Lưu thay đổi" : "Tạo điểm đến"}</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function createEmptyEditorValues(): DestinationEditorFormValues {
  return {
    wardCodes: [],
    translations: {
      vi: { name: "", description: "" },
      en: { name: "", description: "" },
    },
  };
}

function toEditorValues(destination: AdminDestination | null): DestinationEditorFormValues {
  if (!destination) return createEmptyEditorValues();
  const vi = destination.translations.find((translation) => translation.locale === "vi");
  const en = destination.translations.find((translation) => translation.locale === "en");

  return {
    destinationId: destination.destinationId,
    wardCodes: destination.wards.map((ward) => ward.code),
    translations: {
      vi: { name: vi?.name || "", description: vi?.description || "" },
      en: { name: en?.name || "", description: en?.description || "" },
    },
  };
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h3 className="font-heading text-base font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function getDestinationName(destination: AdminDestination): string {
  return destination.translations.find((translation) => translation.locale === "vi")?.name || "Chưa đặt tên";
}

function getDestinationDescription(destination: AdminDestination): string {
  const description = destination.translations.find((translation) => translation.locale === "vi")?.description;
  const text = stripHtml(description || "");

  return text || "Chưa có mô tả điểm đến.";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}
