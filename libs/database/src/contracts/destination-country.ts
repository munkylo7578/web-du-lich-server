// Dependency-free: safe to import in client components and domain code.
export const DESTINATION_COUNTRIES = ["LA", "KH", "VN"] as const;

export type DestinationCountry = (typeof DESTINATION_COUNTRIES)[number];

export const DESTINATION_COUNTRY_LABELS: Record<DestinationCountry, string> = {
  LA: "Lào",
  KH: "Campuchia",
  VN: "Việt Nam",
};

export function isDestinationCountry(value: unknown): value is DestinationCountry {
  return DESTINATION_COUNTRIES.some((country) => country === value);
}

export function destinationWardCodes(country: DestinationCountry, wardCodes: readonly string[]): string[] {
  if (!isDestinationCountry(country)) {
    throw new Error("Quốc gia điểm đến phải là Lào, Campuchia hoặc Việt Nam.");
  }

  return country === "VN" ? [...new Set(wardCodes)] : [];
}
