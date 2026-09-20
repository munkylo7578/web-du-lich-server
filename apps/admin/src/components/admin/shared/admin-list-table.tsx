"use client";

import type { ComponentProps } from "react";

import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Opt-in list layout: leave the generic table primitive unchanged. */
export function AdminListTable({ className, ...props }: ComponentProps<typeof Table>) {
  return (
    <Table
      className={cn(
        "table-fixed [&_th]:px-4 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:whitespace-normal",
        className,
      )}
      {...props}
    />
  );
}
