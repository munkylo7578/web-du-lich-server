import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { count } from 'drizzle-orm';
import type { DestinationCountry } from '@destination-country';
import {
  destinations,
  services,
  siteSettingTranslations,
  siteSettings,
  tours,
  type TourPlanSnapshot,
} from '@database';

import { API_ENV, type ApiEnvironment } from '../config/env';
import { DATABASE, type Database } from '../database/database.module';
import { localized, pageMeta, type Locale } from '../common/query.dto';

type TranslationRow = { locale: Locale; name: string; description: string | null };
type ImageRow = { id: string; url: string; altText: string | null };
type ImageLinkRow = { sortOrder: number; image: ImageRow };
type WardLinkRow = { ward: { code: string; name: string; nameEn: string | null; fullName: string | null; fullNameEn: string | null; province: { code: string; name: string; nameEn: string | null } | null } };
type DestinationRow = { id: string; country: DestinationCountry; translations: TranslationRow[]; wardLinks?: WardLinkRow[]; createdAt: Date; updatedAt: Date };
type ServiceRow = { id: string; translations: TranslationRow[]; imageLinks?: ImageLinkRow[]; createdAt: Date; updatedAt: Date };
type TourRow = {
  id: string;
  departureStartMonth: number | null;
  translations: TranslationRow[];
  plans: TourPlanSnapshot[];
  imageLinks: Array<ImageLinkRow & { role: 'cover' | 'gallery' }>;
  destinationLinks: Array<{ destination: DestinationRow }>;
  serviceLinks: Array<{ service: ServiceRow }>;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ContentService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnvironment,
  ) {}

  async tours(locale: Locale, page: number, requestedLimit: number) {
    const limit = Math.min(requestedLimit, this.env.maxPageSize);
    const [{ value: total }] = await this.db.select({ value: count() }).from(tours);
    const rows = await this.db.query.tours.findMany({
      limit,
      offset: (page - 1) * limit,
      orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.id)],
      with: {
        translations: true,
        imageLinks: { orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true } },
        destinationLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { destination: { with: { translations: true } } },
        },
        serviceLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { service: { with: { translations: true, imageLinks: { with: { image: true } } } } },
        },
      },
    });
    return { data: rows.map((row) => this.mapTour(row, locale)).filter(Boolean), meta: pageMeta(page, limit, total) };
  }

  async tour(id: string, locale: Locale) {
    const row = await this.db.query.tours.findFirst({
      where: (table, { eq: equals }) => equals(table.id, id),
      with: {
        translations: true,
        imageLinks: { orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true } },
        destinationLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { destination: { with: { translations: true } } },
        },
        serviceLinks: {
          orderBy: (link, { asc }) => [asc(link.sortOrder)],
          with: { service: { with: { translations: true, imageLinks: { with: { image: true } } } } },
        },
      },
    });
    const result = row && this.mapTour(row, locale);
    if (!result) throw new NotFoundException('Tour or translation not found');
    return { data: result };
  }

  async destinations(locale: Locale, page: number, requestedLimit: number) {
    const limit = Math.min(requestedLimit, this.env.maxPageSize);
    const [{ value: total }] = await this.db.select({ value: count() }).from(destinations);
    const rows = await this.db.query.destinations.findMany({
      limit,
      offset: (page - 1) * limit,
      orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.id)],
      with: { translations: true, wardLinks: { with: { ward: { with: { province: true } } } } },
    });
    return { data: rows.map((row) => this.mapDestination(row, locale)).filter(Boolean), meta: pageMeta(page, limit, total) };
  }

  async destination(id: string, locale: Locale) {
    const row = await this.db.query.destinations.findFirst({
      where: (table, { eq: equals }) => equals(table.id, id),
      with: { translations: true, wardLinks: { with: { ward: { with: { province: true } } } } },
    });
    const result = row && this.mapDestination(row, locale);
    if (!result) throw new NotFoundException('Destination or translation not found');
    return { data: result };
  }

  async services(locale: Locale, page: number, requestedLimit: number) {
    const limit = Math.min(requestedLimit, this.env.maxPageSize);
    const [{ value: total }] = await this.db.select({ value: count() }).from(services);
    const rows = await this.db.query.services.findMany({
      limit,
      offset: (page - 1) * limit,
      orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.id)],
      with: { translations: true, imageLinks: { orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true } } },
    });
    return { data: rows.map((row) => this.mapService(row, locale)).filter(Boolean), meta: pageMeta(page, limit, total) };
  }

  async service(id: string, locale: Locale) {
    const row = await this.db.query.services.findFirst({
      where: (table, { eq: equals }) => equals(table.id, id),
      with: { translations: true, imageLinks: { orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true } } },
    });
    const result = row && this.mapService(row, locale);
    if (!result) throw new NotFoundException('Service or translation not found');
    return { data: result };
  }

  async settings(locale: Locale) {
    if (this.env.publicSettingKeys.length === 0) return { data: [], meta: { locale: { requested: locale, effective: locale, fallback: false } } };
    const rows = await this.db.query.siteSettings.findMany({
      where: (table, { inArray: includedIn }) => includedIn(table.key, this.env.publicSettingKeys),
      orderBy: (table, { asc }) => [asc(table.key)],
      with: { translations: true },
    });
    return {
      data: rows.map((row) => this.mapSetting(row, locale)),
      meta: { locale: { requested: locale } },
    };
  }

  async setting(key: string, locale: Locale) {
    if (!this.env.publicSettingKeys.includes(key)) throw new NotFoundException('Setting not found');
    const row = await this.db.query.siteSettings.findFirst({
      where: (table, { eq: equals }) => equals(table.key, key),
      with: { translations: true },
    });
    if (!row) throw new NotFoundException('Setting not found');
    const data = this.mapSetting(row, locale);
    return { data, meta: { locale: data.locale } };
  }

  private mapSetting(
    row: typeof siteSettings.$inferSelect & { translations: Array<typeof siteSettingTranslations.$inferSelect> },
    locale: Locale,
  ) {
    if (row.type === 'image') {
      return {
        key: row.key,
        value: row.value,
        type: row.type,
        updatedAt: row.updatedAt,
        locale: { requested: locale, effective: locale, fallback: false },
      };
    }

    const requested = row.translations.find((translation) => translation.locale === locale);
    const vietnamese = row.translations.find((translation) => translation.locale === 'vi');
    const translation = requested ?? vietnamese;
    return {
      key: row.key,
      value: translation?.value ?? '',
      type: row.type,
      updatedAt: row.updatedAt,
      locale: {
        requested: locale,
        effective: translation?.locale ?? 'vi',
        fallback: Boolean(translation && translation.locale !== locale),
      },
    };
  }

  private mapTour(row: TourRow, locale: Locale) {
    const translation = localized(row.translations, locale);
    if (!translation) return null;
    return {
      id: row.id,
      departureStartMonth: row.departureStartMonth ?? null,
      name: translation.value.name,
      description: translation.value.description,
      locale: translation.locale,
      plans: this.localizePlans(row.plans, locale),
      images: row.imageLinks.map((link) => ({ role: link.role, sortOrder: link.sortOrder, ...this.mapImage(link.image) })),
      destinations: row.destinationLinks.map((link) => this.mapDestination(link.destination, locale)).filter(Boolean),
      services: row.serviceLinks.map((link) => this.mapService(link.service, locale)).filter(Boolean),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapDestination(row: DestinationRow, locale: Locale) {
    const translation = localized(row.translations, locale);
    if (!translation) return null;
    return {
      country: row.country,
      id: row.id, name: translation.value.name, description: translation.value.description, locale: translation.locale,
      wards: (row.wardLinks ?? []).map(({ ward }) => ({
        code: ward.code,
        name: locale === 'en' ? (ward.nameEn ?? ward.name) : ward.name,
        fullName: locale === 'en' ? (ward.fullNameEn ?? ward.fullName) : ward.fullName,
        province: ward.province ? { code: ward.province.code, name: locale === 'en' ? (ward.province.nameEn ?? ward.province.name) : ward.province.name } : null,
      })),
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    };
  }

  private mapService(row: ServiceRow, locale: Locale) {
    const translation = localized(row.translations, locale);
    if (!translation) return null;
    return {
      id: row.id, name: translation.value.name, description: translation.value.description, locale: translation.locale,
      images: (row.imageLinks ?? []).map((link) => ({ sortOrder: link.sortOrder, ...this.mapImage(link.image) })),
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    };
  }

  private mapImage(image: { id: string; url: string; altText: string | null }) {
    const url = /^https?:\/\//.test(image.url) ? image.url : `${this.env.uploadPublicBaseUrl}/${image.url.replace(/^\//, '')}`;
    return { id: image.id, url, altText: image.altText };
  }

  private localizePlans(plans: TourPlanSnapshot[], locale: Locale) {
    return plans.map((plan) => ({
      name: plan.name[locale] ?? plan.name.vi ?? '',
      description: plan.description[locale] ?? plan.description.vi ?? '',
      sortOrder: plan.sortOrder,
      locale: { requested: locale, effective: plan.name[locale] ? locale : 'vi', fallback: !plan.name[locale] },
    })).sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
