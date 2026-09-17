export const ADMIN_LIST_PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_ADMIN_LIST_PAGE_SIZE = 10;

export type AdminListPageSize = (typeof ADMIN_LIST_PAGE_SIZES)[number];

export type AdminListQuery = {
  query?: string;
  page?: number;
  pageSize?: number;
};

export type NormalizedAdminListQuery = {
  query: string;
  page: number;
  pageSize: AdminListPageSize;
  offset: number;
};

export type AdminListResult<T> = {
  items: T[];
  page: number;
  pageSize: AdminListPageSize;
  total: number;
  totalPages: number;
};

export function normalizeAdminListQuery(input: AdminListQuery = {}): NormalizedAdminListQuery {
  const page = Number.isInteger(input.page) && Number(input.page) > 0 ? Number(input.page) : 1;
  const pageSize = ADMIN_LIST_PAGE_SIZES.includes(input.pageSize as AdminListPageSize)
    ? input.pageSize as AdminListPageSize
    : DEFAULT_ADMIN_LIST_PAGE_SIZE;

  return {
    query: input.query?.trim() ?? "",
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function createAdminListResult<T>(
  items: T[],
  total: number,
  input: Pick<NormalizedAdminListQuery, "page" | "pageSize">,
): AdminListResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    items,
    page: Math.min(input.page, totalPages),
    pageSize: input.pageSize,
    total,
    totalPages,
  };
}

export function resolveAdminListPage(
  total: number,
  input: NormalizedAdminListQuery,
): NormalizedAdminListQuery {
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(input.page, totalPages);

  return { ...input, page, offset: (page - 1) * input.pageSize };
}
