export type TourCurrency = "USD" | "VND";

export type TourPrices = {
  beforeDiscountPriceUsd?: number;
  beforeDiscountPriceVnd?: number;
  listedPriceUsd?: number;
  listedPriceVnd?: number;
};

// Match the database precision and stay within safe integer minor units.
export const TOUR_PRICE_LIMITS = {
  USD: { max: 999999999999.99, step: 0.01 },
  VND: { max: 99999999999999, step: 1 },
} as const;

export function isValidTourPrice(value: number, currency: TourCurrency): boolean {
  if (!Number.isFinite(value) || value < 0 || value > TOUR_PRICE_LIMITS[currency].max) return false;
  // Avoid floating-point modulo checks, which reject valid prices such as 0.29.
  return currency === "VND" ? Number.isInteger(value) : /^\d+(\.\d{1,2})?$/.test(String(value));
}

export function validateTourPrices(prices: TourPrices): TourPrices {
  const result: TourPrices = {};
  for (const key of ["beforeDiscountPriceUsd", "beforeDiscountPriceVnd", "listedPriceUsd", "listedPriceVnd"] as const) {
    const value = prices[key];
    const currency = key.endsWith("Usd") ? "USD" : "VND";
    if (value !== undefined && !isValidTourPrice(value, currency)) {
      throw new Error(`Invalid tour price: ${key}.`);
    }
    result[key] = value;
  }
  return result;
}
