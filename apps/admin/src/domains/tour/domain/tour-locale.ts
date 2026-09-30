export const TOUR_LOCALES = ["en", "vi"] as const;

export type TourLocale = (typeof TOUR_LOCALES)[number];

export const DEFAULT_TOUR_LOCALE: TourLocale = "en";

export type LocalizedText = Partial<Record<TourLocale, string>>;

export function isTourLocale(value: string): value is TourLocale {
  return TOUR_LOCALES.includes(value as TourLocale);
}
