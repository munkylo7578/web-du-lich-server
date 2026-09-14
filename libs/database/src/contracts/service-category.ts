// Dependency-free: safe to import in client components, API DTOs, and domain code.
export const SERVICE_CATEGORIES = [
  'accommodation',
  'transportation',
  'tourguide',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  accommodation: 'Lưu trú',
  transportation: 'Vận chuyển',
  tourguide: 'Hướng dẫn viên',
};

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return SERVICE_CATEGORIES.some((category) => category === value);
}
