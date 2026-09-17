"use client";

import { Button } from "@/components/ui/button";
import {
  ADMIN_LIST_PAGE_SIZES,
  type AdminListPageSize,
} from "@/features/shared/admin-list";

type ServerPaginationProps = {
  page: number;
  pageSize: AdminListPageSize;
  total: number;
  totalPages: number;
  isPending?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: AdminListPageSize) => void;
};

export function ServerPagination({
  page,
  pageSize,
  total,
  totalPages,
  isPending = false,
  onPageChange,
  onPageSizeChange,
}: ServerPaginationProps) {
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Phân trang danh sách"
      className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total ? `${start}–${end} / ${total} bản ghi` : "0 bản ghi"}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Mỗi trang
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground disabled:opacity-50"
            value={pageSize}
            disabled={isPending}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as AdminListPageSize)}
          >
            {ADMIN_LIST_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={isPending || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Trước
        </Button>
        <span className="min-w-16 px-2 text-center text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={isPending || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
        </Button>
      </div>
    </nav>
  );
}
