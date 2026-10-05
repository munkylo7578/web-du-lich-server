import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { DestinationCountry } from '@destination-country';
import type { ServiceCategory } from '@service-category';
import {
  destinationTranslations,
  destinations,
  gisProvinces,
  services,
  siteSettingTranslations,
  siteSettings,
  tourDestinations,
  tourTranslations,
  tours,
  type LocalizedText,
} from '@database';

import { API_ENV, type ApiEnvironment } from '../config/env';
import { DATABASE, type Database } from '../database/database.module';
import { localized, pageMeta, type Locale } from '../common/query.dto';

type TranslationRow = {
  locale: Locale;
  name: string;
  description: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
};
type ImageRow = { id: string; url: string; altText: string | null };
type ImageLinkRow = { sortOrder: number; image: ImageRow };
type ProvinceLinkRow = {
  province: {
    code: string;
    name: string;
    nameEn: string | null;
    fullName: string | null;
    fullNameEn: string | null;
  };
};
type ProvinceCoordinate = { latitude: number | null; longitude: number | null };
type DestinationTourLinkRow = {
  tour: {
    id: string;
    departureStartMonth: number | null;
    translations: TranslationRow[];
    planRows: PlanRow[];
    imageLinks: Array<ImageLinkRow & { role: 'cover' | 'gallery' }>;
  };
};
type DestinationRow = {
  id: string;
  imageLinks?: Array<ImageLinkRow & { role: 'cover' | 'gallery' }>;
  country: DestinationCountry;
  translations: Array<TranslationRow & { visa?: string | null; weather?: string | null }>;
  provinceLinks?: ProvinceLinkRow[];
  tourLinks?: DestinationTourLinkRow[];
  createdAt: Date;
  updatedAt: Date;
};
type ServiceRow = {
  id: string;
  category: ServiceCategory;
  translations: TranslationRow[];
  imageLinks?: ImageLinkRow[];
  createdAt: Date;
  updatedAt: Date;
};
type PlanRow = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
  imageLinks: ImageLinkRow[];
};
type TourRow = {
  id: string;
  departureStartMonth: number | null;
  serviceDescription: string | null;
  accommodationDescription: string | null;
  transportationDescription: string | null;
  tourguideDescription: string | null;
  translations: TranslationRow[];
  planRows: PlanRow[];
  imageLinks: Array<ImageLinkRow & { role: 'cover' | 'gallery' }>;
  destinationLinks: Array<{ destination: DestinationRow }>;
  serviceLinks: Array<{ service: ServiceRow }>;
  createdAt: Date;
  updatedAt: Date;
};

type TourListFilters = {
  search?: string;
  departureStartMonth?: number;
};

@Injectable()
export class ContentService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnvironment,
  ) {}

  async tours(
    locale: Locale,
    page: number,
    requestedLimit: number,
    filters: TourListFilters = {},
  ) {
    const limit = Math.min(requestedLimit, this.env.maxPageSize);
    const where = this.tourListWhere(locale, filters);
    const countQuery = this.db.select({ value: count() }).from(tours);
    const [{ value: total }] = where
      ? await countQuery.where(where)
      : await countQuery;
    const rows = await this.db.query.tours.findMany({
      columns: { plans: false },
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.id)],
      with: {
        planRows: {
          orderBy: (plan, { asc }) => [asc(plan.sortOrder)],
          with: {
            imageLinks: {
              orderBy: (link, { asc }) => [asc(link.sortOrder)],
              with: { image: true },
            },
          },
        },
        translations: true,
        imageLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { image: true },
        },
        destinationLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { destination: { with: { translations: true, imageLinks: {
            orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true },
          } } } },
        },
        serviceLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: {
            service: {
              with: {
                translations: true,
                imageLinks: { with: { image: true } },
              },
            },
          },
        },
      },
    });
    return {
      data: rows.map((row) => this.mapTour(row, locale)).filter(Boolean),
      meta: pageMeta(page, limit, total),
    };
  }

  async tour(id: string, locale: Locale) {
    const row = await this.db.query.tours.findFirst({
      columns: { plans: false },
      where: (table, { eq: equals }) => equals(table.id, id),
      with: {
        planRows: {
          orderBy: (plan, { asc }) => [asc(plan.sortOrder)],
          with: {
            imageLinks: {
              orderBy: (link, { asc }) => [asc(link.sortOrder)],
              with: { image: true },
            },
          },
        },
        translations: true,
        imageLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { image: true },
        },
        destinationLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { destination: { with: { translations: true, imageLinks: {
            orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true },
          } } } },
        },
        serviceLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: {
            service: {
              with: {
                translations: true,
                imageLinks: { with: { image: true } },
              },
            },
          },
        },
      },
    });
    const result = row && this.mapTourDetail(row, locale);
    if (!result) throw new NotFoundException('Tour or translation not found');
    return { data: result };
  }

  async destinations(
    locale: Locale,
    page: number,
    requestedLimit?: number,
  ) {
    const fetchAll = requestedLimit === undefined;
    const limit = fetchAll
      ? undefined
      : Math.min(requestedLimit, this.env.maxPageSize);
    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(destinations);
    const rows = await this.db.query.destinations.findMany({
      ...(limit === undefined
        ? {}
        : { limit, offset: (page - 1) * limit }),
      orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.id)],
      with: {
        translations: true,
        provinceLinks: { orderBy: (link, { asc }) => [asc(link.provinceCode)], with: { province: true } },
        imageLinks: { orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true } },
        tourLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder), asc(link.tourId)],
          with: {
            tour: {
              columns: { id: true, departureStartMonth: true },
              with: {
                translations: true,
                planRows: {
                  orderBy: (plan, { asc }) => [asc(plan.sortOrder)],
                  with: {
                    imageLinks: {
                      orderBy: (link, { asc }) => [asc(link.sortOrder)],
                      with: { image: true },
                    },
                  },
                },
                imageLinks: {
                  orderBy: (link, { asc }) => [asc(link.sortOrder)],
                  with: { image: true },
                },
              },
            },
          },
        },
      },
    });
    const provinceCoordinates = await this.destinationProvinceCoordinates(rows);
    return {
      data: rows
        .map((row) => this.mapDestination(row, locale, provinceCoordinates))
        .filter(Boolean),
      meta: fetchAll
        ? { page: 1, limit: total, total, totalPages: 1 }
        : pageMeta(page, limit, total),
    };
  }

  async destination(id: string, locale: Locale) {
    const row = await this.db.query.destinations.findFirst({
      where: (table, { eq: equals }) => equals(table.id, id),
      with: {
        translations: true,
        provinceLinks: { orderBy: (link, { asc }) => [asc(link.provinceCode)], with: { province: true } },
        imageLinks: { orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true } },
        tourLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder), asc(link.tourId)],
          with: {
            tour: {
              columns: { id: true, departureStartMonth: true },
              with: {
                translations: true,
                planRows: {
                  orderBy: (plan, { asc }) => [asc(plan.sortOrder)],
                  with: {
                    imageLinks: {
                      orderBy: (link, { asc }) => [asc(link.sortOrder)],
                      with: { image: true },
                    },
                  },
                },
                imageLinks: {
                  orderBy: (link, { asc }) => [asc(link.sortOrder)],
                  with: { image: true },
                },
              },
            },
          },
        },
      },
    });
    const provinceCoordinates = row
      ? await this.destinationProvinceCoordinates([row])
      : new Map<string, ProvinceCoordinate>();
    const result = row && this.mapDestination(row, locale, provinceCoordinates);
    if (!result)
      throw new NotFoundException('Destination or translation not found');
    return { data: result };
  }

  async services(locale: Locale, page: number, requestedLimit: number) {
    const limit = Math.min(requestedLimit, this.env.maxPageSize);
    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(services);
    const rows = await this.db.query.services.findMany({
      limit,
      offset: (page - 1) * limit,
      orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.id)],
      with: {
        translations: true,
        imageLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { image: true },
        },
      },
    });
    return {
      data: rows.map((row) => this.mapService(row, locale)).filter(Boolean),
      meta: pageMeta(page, limit, total),
    };
  }

  async service(id: string, locale: Locale) {
    const row = await this.db.query.services.findFirst({
      where: (table, { eq: equals }) => equals(table.id, id),
      with: {
        translations: true,
        imageLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { image: true },
        },
      },
    });
    const result = row && this.mapService(row, locale);
    if (!result)
      throw new NotFoundException('Service or translation not found');
    return { data: result };
  }

  async settings(locale: Locale) {
    const rows = await this.db.query.siteSettings.findMany({
      orderBy: (table, { asc }) => [asc(table.key)],
      with: { translations: true },
    });
    return {
      data: rows.map((row) => this.mapSetting(row, locale)),
      meta: { locale: { requested: locale } },
    };
  }

  async setting(key: string, locale: Locale) {
    const row = await this.db.query.siteSettings.findFirst({
      where: (table, { eq: equals }) => equals(table.key, key),
      with: { translations: true },
    });
    if (!row) throw new NotFoundException('Setting not found');
    const data = this.mapSetting(row, locale);
    return { data, meta: { locale: data.locale } };
  }

  private mapSetting(
    row: typeof siteSettings.$inferSelect & {
      translations: Array<typeof siteSettingTranslations.$inferSelect>;
    },
    locale: Locale,
  ) {
    if (row.type === 'image' || row.type === 'video') {
      return {
        key: row.key,
        category: row.category,
        value: row.value,
        type: row.type,
        updatedAt: row.updatedAt,
        locale: { requested: locale, effective: locale, fallback: false },
      };
    }

    const requested = row.translations.find(
      (translation) => translation.locale === locale,
    );
    const english = row.translations.find(
      (translation) => translation.locale === 'en',
    );
    const translation = requested ?? english;
    return {
      key: row.key,
      category: row.category,
      value: translation?.value ?? '',
      type: row.type,
      updatedAt: row.updatedAt,
      locale: {
        requested: locale,
        effective: translation?.locale ?? 'en',
        fallback: Boolean(translation && translation.locale !== locale),
      },
    };
  }

  private tourListWhere(
    locale: Locale,
    filters: TourListFilters,
  ): SQL | undefined {
    const conditions: SQL[] = [];
    const term = filters.search?.trim();

    if (term) {
      const escapedTerm = term.replace(/[\\%_]/g, '\\$&');
      const pattern = `%${escapedTerm}%`;
      const locales: Locale[] = locale === 'en' ? ['en'] : [locale, 'en'];
      const tourNameMatches = sql<boolean>`exists (
        select 1
        from ${tourTranslations}
        where ${tourTranslations.tourId} = ${tours.id}
          and ${inArray(tourTranslations.locale, locales)}
          and ${tourTranslations.name} ilike ${pattern} escape '\\'
      )`;
      const destinationNameMatches = sql<boolean>`exists (
        select 1
        from ${tourDestinations}
        inner join ${destinationTranslations}
          on ${destinationTranslations.destinationId} = ${tourDestinations.destinationId}
        where ${tourDestinations.tourId} = ${tours.id}
          and ${inArray(destinationTranslations.locale, locales)}
          and ${destinationTranslations.name} ilike ${pattern} escape '\\'
      )`;

      conditions.push(or(tourNameMatches, destinationNameMatches)!);
    }

    if (filters.departureStartMonth !== undefined) {
      conditions.push(
        eq(tours.departureStartMonth, filters.departureStartMonth),
      );
    }

    return conditions.length ? and(...conditions) : undefined;
  }

  private mapTour(row: TourRow, locale: Locale) {
    const translation = localized(row.translations, locale);
    if (!translation) return null;
    return {
      id: row.id,
      departureStartMonth: row.departureStartMonth ?? null,
      name: translation.value.name,
      description: translation.value.description,
      inclusions: translation.value.inclusions ?? null,
      exclusions: translation.value.exclusions ?? null,
      locale: translation.locale,
      plans: this.localizePlans(row.planRows, locale),
      images: row.imageLinks.map((link) => ({
        role: link.role,
        sortOrder: link.sortOrder,
        ...this.mapImage(link.image),
      })),
      destinations: row.destinationLinks
        .map((link) => this.mapDestination(link.destination, locale))
        .filter(Boolean),
      services: row.serviceLinks
        .map((link) => this.mapService(link.service, locale))
        .filter(Boolean),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapTourDetail(row: TourRow, locale: Locale) {
    const tour = this.mapTour(row, locale);
    if (!tour) return null;

    return {
      ...tour,
      serviceDescription: row.serviceDescription ?? null,
      accommodationDescription: row.accommodationDescription ?? null,
      transportationDescription: row.transportationDescription ?? null,
      tourguideDescription: row.tourguideDescription ?? null,
    };
  }

  private mapDestination(
    row: DestinationRow,
    locale: Locale,
    provinceCoordinates = new Map<string, ProvinceCoordinate>(),
  ) {
    const translation = localized(row.translations, locale);
    if (!translation) return null;
    return {
      country: row.country,
      images: (row.imageLinks ?? []).map((link) => ({
        ...this.mapImage(link.image), role: link.role, sortOrder: link.sortOrder,
      })),
      id: row.id,
      name: translation.value.name,
      description: translation.value.description,
      locale: translation.locale,
      visa: translation.value.visa ?? null,
      weather: translation.value.weather ?? null,
      provinces: (row.provinceLinks ?? []).map(({ province }) => ({
        code: province.code,
        name: locale === 'en' ? (province.nameEn ?? province.name) : province.name,
        fullName:
          locale === 'en' ? (province.fullNameEn ?? province.fullName) : province.fullName,
        latitude: provinceCoordinates.get(province.code)?.latitude ?? null,
        longitude: provinceCoordinates.get(province.code)?.longitude ?? null,
      })),
      tours: (row.tourLinks ?? [])
        .map(({ tour }) => {
          const tourTranslation = localized(tour.translations, locale);
          if (!tourTranslation) return null;

          return {
            id: tour.id,
            departureStartMonth: tour.departureStartMonth ?? null,
            name: tourTranslation.value.name,
            locale: tourTranslation.locale,
            plans: this.localizePlans(tour.planRows, locale),
            images: tour.imageLinks.map((link) => ({
              role: link.role,
              sortOrder: link.sortOrder,
              ...this.mapImage(link.image),
            })),
          };
        })
        .filter(Boolean),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapService(row: ServiceRow, locale: Locale) {
    const translation = localized(row.translations, locale);
    if (!translation) return null;
    return {
      id: row.id,
      category: row.category,
      name: translation.value.name,
      description: translation.value.description,
      locale: translation.locale,
      images: (row.imageLinks ?? []).map((link) => ({
        sortOrder: link.sortOrder,
        ...this.mapImage(link.image),
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapImage(image: { id: string; url: string; altText: string | null }) {
    return { id: image.id, url: image.url, altText: image.altText };
  }

  private async destinationProvinceCoordinates(
    rows: DestinationRow[],
  ): Promise<Map<string, ProvinceCoordinate>> {
    const provinceCodes = [
      ...new Set(
        rows.flatMap((row) =>
          (row.provinceLinks ?? []).map(({ province }) => province.code),
        ),
      ),
    ];
    if (!provinceCodes.length) return new Map();

    const coordinates = await this.db
      .select({
        provinceCode: gisProvinces.provinceCode,
        longitude: sql<
          number | null
        >`ST_X(ST_PointOnSurface(${gisProvinces.geom}))`,
        latitude: sql<number | null>`ST_Y(ST_PointOnSurface(${gisProvinces.geom}))`,
      })
      .from(gisProvinces)
      .where(inArray(gisProvinces.provinceCode, provinceCodes));

    return new Map(
      coordinates.map((coordinate) => [
        coordinate.provinceCode,
        {
          latitude:
            coordinate.latitude === null ? null : Number(coordinate.latitude),
          longitude:
            coordinate.longitude === null ? null : Number(coordinate.longitude),
        },
      ]),
    );
  }

  private localizePlans(plans: PlanRow[], locale: Locale) {
    return plans
      .map((plan) => {
        // Use one complete translation so the metadata describes both fields.
        const effective: Locale = plan.name[locale]?.trim() && plan.description[locale]?.trim() ? locale : 'en';
        return {
        planId: plan.id,
        images: [...plan.imageLinks]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((link) => ({
            sortOrder: link.sortOrder,
            ...this.mapImage(link.image),
          })),
        name: plan.name[effective] ?? '',
        description: plan.description[effective] ?? '',
        sortOrder: plan.sortOrder,
        locale: {
          requested: locale,
          effective,
          fallback: effective !== locale,
        },
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
