"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Edit3, ImageIcon, Languages, MapPin, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";

import { deleteTourAction } from "@/app/admin/tours/actions";
import { TourFormDrawer } from "./tour-form-drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminTour } from "@/features/admin-tours/tour-types";

const helper = createColumnHelper<AdminTour>();

export function TourManagement({ tours }: { tours: AdminTour[] }) {
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<AdminTour | null>(null);
  const [deletingTour, setDeletingTour] = useState<AdminTour | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const columns = useMemo(() => [
    helper.accessor((tour) => tour.translations.find((item) => item.locale === "vi")?.name || "Chưa đặt tên", {
      id: "name",
      header: "Tour",
      cell: ({ row, getValue }) => {
        const cover = row.original.images.find((image) => image.role === "cover") || row.original.images[0];
        return <div className="flex min-w-64 items-center gap-3">{cover ? <img src={cover.url} alt={cover.altText || getValue()} className="size-12 rounded-xl object-cover" /> : <div className="grid size-12 place-items-center rounded-xl bg-muted"><ImageIcon className="size-5 text-muted-foreground" /></div>}<div><p className="font-medium text-foreground">{getValue()}</p><p className="mt-1 text-xs text-muted-foreground">{row.original.plans.length} chặng · {row.original.images.length} ảnh</p></div></div>;
      },
    }),
    helper.display({ id: "destinations", header: "Điểm đến", cell: ({ row }) => row.original.destinations.length ? <div className="flex max-w-sm flex-wrap gap-1.5">{row.original.destinations.slice(0, 3).map((destination) => <Badge key={destination.destinationId} variant="secondary"><MapPin data-icon="inline-start" />{destination.translations.find((item) => item.locale === "vi")?.name || "Chưa đặt tên"}</Badge>)}{row.original.destinations.length > 3 && <Badge variant="outline">+{row.original.destinations.length - 3}</Badge>}</div> : <span className="text-muted-foreground">Chưa cập nhật</span> }),
    helper.display({ id: "languages", header: "Ngôn ngữ", cell: ({ row }) => <div className="flex gap-1.5">{row.original.translations.map((item) => <Badge key={item.locale} variant="secondary"><Languages data-icon="inline-start" />{item.locale.toUpperCase()}</Badge>)}</div> }),
    helper.accessor("updatedAt", { header: "Cập nhật", cell: ({ getValue }) => <span className="text-muted-foreground">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(getValue()))}</span> }),
    helper.display({ id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Chỉnh sửa tour" onClick={() => { setEditingTour(row.original); setDrawerOpen(true); }}><Edit3 /></Button><Button variant="ghost" size="icon" aria-label="Xóa tour" onClick={() => setDeletingTour(row.original)}><Trash2 className="text-destructive" /></Button></div> }),
  ], []);

  const table = useReactTable({
    data: tours,
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
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-800">Nội dung</p><h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">Danh sách tour</h1><p className="mt-2 max-w-2xl font-medium text-slate-700">Quản lý nội dung đa ngôn ngữ, lịch trình và hình ảnh tour ở một nơi.</p></div>
          <Button size="lg" className="solid-accent-button h-11 rounded-2xl px-5" onClick={() => { setEditingTour(null); setDrawerOpen(true); }}><Plus data-icon="inline-start" />Tạo tour mới</Button>
        </div>

        <Card className="gap-0 overflow-hidden rounded-[28px] border border-cyan-900/15 bg-white/95 py-0 shadow-[0_18px_55px_-42px_rgba(8,47,73,0.55)]">
          <div className="flex flex-col gap-3 border-b border-cyan-900/15 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" strokeWidth={2.75} /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="glass-input h-10 rounded-2xl pl-9" placeholder="Tìm theo tên tour..." /></div>
            <p className="rounded-full border border-cyan-900/15 bg-cyan-50 px-3 py-1 text-sm font-medium text-slate-800">{table.getFilteredRowModel().rows.length} tour</p>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id} className="border-cyan-900/15 hover:bg-transparent">{group.headers.map((header) => <TableHead key={header.id} className="font-semibold text-slate-700">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-52 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><div className="mb-3 grid size-12 place-items-center rounded-2xl bg-muted"><MoreHorizontal className="size-5" /></div><p className="font-medium">Chưa tìm thấy tour</p><p className="mt-1 text-sm text-muted-foreground">Tạo tour mới hoặc thử từ khóa khác.</p></div></TableCell></TableRow>}</TableBody>
              </Table>
            </div>
            {table.getPageCount() > 1 && <div className="flex items-center justify-end gap-2 border-t p-4"><Button variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Trước</Button><span className="px-2 text-sm text-muted-foreground">{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span><Button variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Sau</Button></div>}
          </CardContent>
        </Card>
      </section>

      <TourFormDrawer key={editingTour?.id || "new"} open={drawerOpen} tour={editingTour} onOpenChange={setDrawerOpen} />
      <AlertDialog open={Boolean(deletingTour)} onOpenChange={(open) => !open && setDeletingTour(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa tour này?</AlertDialogTitle><AlertDialogDescription>Tour và liên kết hình ảnh sẽ bị xóa khỏi cơ sở dữ liệu. Thao tác này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); if (!deletingTour) return; startDelete(async () => { const result = await deleteTourAction(deletingTour.id); if (result.success) setDeletingTour(null); }); }}>{isDeleting ? "Đang xóa..." : "Xóa tour"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
