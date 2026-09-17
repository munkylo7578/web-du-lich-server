"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  type AdminListPageSize,
  type AdminListQuery,
  type AdminListResult,
} from "@/features/shared/admin-list";

type UseServerPaginationOptions<T> = {
  initialResult: AdminListResult<T>;
  loadPage: (input: AdminListQuery) => Promise<AdminListResult<T>>;
  debounceMs?: number;
};

export function useServerPagination<T>({
  initialResult,
  loadPage,
  debounceMs = 300,
}: UseServerPaginationOptions<T>) {
  const [result, setResult] = useState(initialResult);
  const [query, setQueryState] = useState("");
  const [page, setPageState] = useState(initialResult.page);
  const [pageSize, setPageSizeState] = useState<AdminListPageSize>(initialResult.pageSize);
  const [reloadToken, setReloadToken] = useState(0);
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef(0);
  const initialRenderRef = useRef(true);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setPageState(1);
  }, []);

  const setPage = useCallback((value: number) => {
    setPageState(Math.max(1, value));
  }, []);

  const setPageSize = useCallback((value: AdminListPageSize) => {
    setPageSizeState(value);
    setPageState(1);
  }, []);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    const requestId = ++requestIdRef.current;
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const next = await loadPage({ query, page, pageSize });
        if (requestId !== requestIdRef.current) return;

        setResult(next);
        if (next.page !== page) setPageState(next.page);
      });
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [debounceMs, loadPage, page, pageSize, query, reloadToken]);

  return {
    ...result,
    query,
    page,
    pageSize,
    isPending,
    setQuery,
    setPage,
    setPageSize,
    reload,
  };
}
