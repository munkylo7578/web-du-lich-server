"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { Edit3, ImageIcon, Languages, Plus, Search, Trash2 } from "lucide-react";

import { deleteServiceAction, saveServiceAction } from "@/app/admin/services/actions";
import { RichTextEditor } from "@/components/admin/tours/rich-text-editor";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { serviceFormSchema, type ServiceFormValues } from "@/features/admin-services/service-form-schema";
import type { AdminService } from "@/features/admin-services/service-types";

const helper = createColumnHelper<AdminService>();

export function ServiceManagement({ services }: { services: AdminService[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminService | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminService | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string>();
  const [isDeleting, startDelete] = useTransition();
  const columns = useMemo(() => [
    helper.accessor((service) => nameOf(service), { id: "name", header: "Dịch vụ", cell: ({ row, getValue }) => <div className="flex min-w-72 items-center gap-3">{row.original.images[0] ? <img src={row.original.images[0].url} alt={row.original.images[0].altText || getValue()} className="size-14 rounded-xl object-cover" /> : <div className="grid size-14 place-items-center rounded-xl bg-cyan-100 text-cyan-800"><ImageIcon /></div>}<div><p className="font-medium">{getValue()}</p><p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">{descriptionOf(row.original)}</p></div></div> }),
    helper.display({ id: "languages", header: "Ngôn ngữ", cell: ({ row }) => <div className="flex gap-1">{row.original.translations.map((item) => <Badge key={item.locale} variant="secondary"><Languages data-icon="inline-start" />{item.locale.toUpperCase()}</Badge>)}</div> }),
    helper.accessor("images", { header: "Ảnh", cell: ({ getValue }) => `${getValue().length} ảnh` }),
    helper.accessor("tourCount", { header: "Tour", cell: ({ getValue }) => `${getValue()} tour` }),
    helper.accessor("updatedAt", { header: "Cập nhật", cell: ({ getValue }) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(getValue())) }),
    helper.display({ id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Chỉnh sửa dịch vụ" onClick={() => { setEditing(row.original); setDrawerOpen(true); }}><Edit3 /></Button><Button variant="ghost" size="icon" aria-label="Xóa dịch vụ" disabled={row.original.tourCount > 0} title={row.original.tourCount ? "Dịch vụ đang được gắn với tour" : undefined} onClick={() => { setDeleteMessage(undefined); setDeleting(row.original); }}><Trash2 className="text-destructive" /></Button></div> }),
  ], []);
  const table = useReactTable({ data: services, columns, state: { globalFilter: query }, onGlobalFilterChange: setQuery, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 10 } } });

  return <>
    <section><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-800">Dữ liệu dùng chung</p><h1 className="font-heading text-4xl font-semibold tracking-tight">Danh sách dịch vụ</h1><p className="mt-2 max-w-2xl font-medium text-slate-700">Quản lý dịch vụ một lần và gắn vào nhiều tour theo thứ tự.</p></div><Button size="lg" className="solid-accent-button h-11 rounded-2xl px-5" onClick={() => { setEditing(null); setDrawerOpen(true); }}><Plus data-icon="inline-start" />Tạo dịch vụ</Button></div>
      <Card className="gap-0 overflow-hidden rounded-[28px] border border-cyan-900/15 bg-white/95 py-0"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Tìm theo tên, mô tả dịch vụ..." /></div><p className="text-sm">{table.getFilteredRowModel().rows.length} dịch vụ</p></div><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-52 text-center">Chưa tìm thấy dịch vụ.</TableCell></TableRow>}</TableBody></Table></div>{table.getPageCount() > 1 && <div className="flex justify-end gap-2 border-t p-4"><Button variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Trước</Button><Button variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Sau</Button></div>}</CardContent></Card>
    </section>
    <ServiceFormDrawer key={editing?.serviceId || "new"} open={drawerOpen} service={editing} onOpenChange={setDrawerOpen} onSaved={() => router.refresh()} />
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa dịch vụ này?</AlertDialogTitle><AlertDialogDescription>Dịch vụ, bản dịch và ảnh sẽ bị xóa. Chỉ có thể xóa khi chưa gắn với tour.</AlertDialogDescription></AlertDialogHeader>{deleteMessage && <Alert><AlertDescription>{deleteMessage}</AlertDescription></Alert>}<AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); if (!deleting) return; startDelete(async () => { const result = await deleteServiceAction(deleting.serviceId); setDeleteMessage(result.message); if (result.success) { setDeleting(null); router.refresh(); } }); }}>{isDeleting ? "Đang xóa..." : "Xóa dịch vụ"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}

function ServiceFormDrawer({ open, service, onSaved, onOpenChange }: { open: boolean; service: AdminService | null; onSaved: () => void; onOpenChange: (open: boolean) => void }) {
  const [locale, setLocale] = useState<"vi" | "en">("vi");
  const [pending, setPending] = useState<ImagePickerPendingImage[]>([]);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const values = useMemo<ServiceFormValues>(() => {
    const vi = service?.translations.find((item) => item.locale === "vi"); const en = service?.translations.find((item) => item.locale === "en");
    return { serviceId: service?.serviceId, translations: { vi: { name: vi?.name || "", description: vi?.description || "" }, en: { name: en?.name || "", description: en?.description || "" } }, existingImages: service?.images ?? [] };
  }, [service]);
  const form = useForm<ServiceFormValues>({ resolver: zodResolver(serviceFormSchema), values });
  const close = () => { pending.forEach((item) => URL.revokeObjectURL(item.previewUrl)); setPending([]); setMessage(undefined); onOpenChange(false); };
  const submit = form.handleSubmit((data) => startTransition(async () => {
    const normalizedPending = pending.map((item, index) => ({ ...item, sortOrder: data.existingImages.length + index }));
    const body = new FormData(); body.set("payload", JSON.stringify({ ...data, existingImages: data.existingImages.map((item, index) => ({ ...item, sortOrder: index })) })); body.set("pendingImages", JSON.stringify(normalizedPending.map(({ file: _file, previewUrl: _preview, ...meta }) => meta))); normalizedPending.forEach((item) => body.set(`file:${item.clientId}`, item.file));
    const result = await saveServiceAction(body); setMessage(result.message); if (result.success) { close(); onSaved(); }
  }));

  return <Sheet open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}><SheetContent fullscreen className="tour-drawer-surface gap-0 text-slate-950" showCloseButton={!isPending}><SheetHeader className="tour-drawer-chrome sticky top-0 z-20"><div className="mx-auto w-full max-w-[1180px] pr-12"><SheetTitle>{service ? "Chỉnh sửa dịch vụ" : "Tạo dịch vụ"}</SheetTitle><SheetDescription>Tiếng Việt bắt buộc. Có thể thêm nhiều ảnh; ảnh đầu tiên là ảnh đại diện.</SheetDescription></div></SheetHeader><form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><div className="flex-1 overflow-y-auto px-5 py-6"><div className="mx-auto max-w-[1180px] space-y-7">{message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}<section className="tour-drawer-panel space-y-4 rounded-[28px] p-5"><Tabs value={locale} onValueChange={(value) => setLocale(value as "vi" | "en")}><TabsList><TabsTrigger value="vi">Tiếng Việt *</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList>{(["vi", "en"] as const).map((current) => <TabsContent key={current} value={current} className="space-y-4 pt-3"><div className="space-y-2"><Label>Tên dịch vụ ({current.toUpperCase()}){current === "vi" && " *"}</Label><Input {...form.register(`translations.${current}.name`)} />{form.formState.errors.translations?.[current]?.name?.message && <p className="text-xs text-destructive">{form.formState.errors.translations[current]?.name?.message}</p>}</div><div className="space-y-2"><Label>Mô tả ({current.toUpperCase()})</Label><Controller control={form.control} name={`translations.${current}.description`} render={({ field }) => <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Mô tả dịch vụ..." invalid={Boolean(form.formState.errors.translations?.[current]?.description)} />} /></div></TabsContent>)}</Tabs></section><section className="tour-drawer-panel space-y-4 rounded-[28px] p-5"><div><h3 className="font-heading font-semibold">Hình ảnh</h3><p className="text-sm text-muted-foreground">Ảnh là tùy chọn; kéo thả, chọn hoặc paste nhiều ảnh.</p></div><Controller control={form.control} name="existingImages" render={({ field }) => <ImagePickerField mode="multiple" existing={field.value.map((item) => ({ id: item.imageId, ...item }))} pending={pending} onExistingChange={(images) => field.onChange(images.map((item, index) => ({ imageId: item.id, url: item.url, altText: item.altText || "", sortOrder: index })))} onPendingChange={setPending} />} /></section></div></div><SheetFooter className="tour-drawer-chrome sticky bottom-0"><div className="mx-auto flex w-full max-w-[1180px] justify-end gap-2"><Button type="button" variant="outline" disabled={isPending} onClick={close}>Hủy</Button><Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : service ? "Lưu thay đổi" : "Tạo dịch vụ"}</Button></div></SheetFooter></form></SheetContent></Sheet>;
}

function nameOf(service: AdminService) { return service.translations.find((item) => item.locale === "vi")?.name || "Chưa đặt tên"; }
function descriptionOf(service: AdminService) { const value = service.translations.find((item) => item.locale === "vi")?.description || ""; return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "Chưa có mô tả dịch vụ."; }
