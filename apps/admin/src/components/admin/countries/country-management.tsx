"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { DESTINATION_COUNTRIES, DESTINATION_COUNTRY_LABELS } from "@destination-country";
import { Edit3, Globe, Languages, Search } from "lucide-react";

import { updateAdminCountryAction } from "@/app/admin/settings/countries/actions";
import { AdminListTable } from "@/components/admin/shared/admin-list-table";
import { CoverImageUploadField, type PendingImage } from "@/components/admin/shared/cover-image-upload-field";
import { ExpandableText } from "@/components/admin/shared/expandable-text";
import { RichTextEditor } from "@/components/admin/tours/rich-text-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countryEditorSchema, type CountryFormValues, type CountryEditorValues } from "@/features/admin-countries/country-form-schema";
import type { AdminCountry } from "@/features/admin-countries/country-types";
import { imageFieldErrors, pendingImagesSchema } from "@/features/admin-tours/tour-form-schema";
import { submitUpload } from "@/features/shared/upload-validation";

const locales = ["en", "vi"] as const;
const contentFields = ["description", "visa", "weather"] as const;
const contentLabels = { description: "Mô tả", visa: "Visa", weather: "Thời tiết" };
type Locale = typeof locales[number];

export function CountryManagement({ countries }: { countries: AdminCountry[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingCountry, setEditingCountry] = useState<AdminCountry | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCountries = countries.filter((country) => [
    country.code, DESTINATION_COUNTRY_LABELS[country.code],
    ...country.translations.map((translation) => translation.name),
  ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
  const missingCountries = DESTINATION_COUNTRIES.filter((code) => !countries.some((country) => country.code === code));

  return (
    <>
      <section className="space-y-5">
        <div className="mb-7">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">Danh sách quốc gia</h1>
          <p className="mt-2 text-sm text-muted-foreground">Chỉnh sửa nội dung và hình ảnh cho Lào, Campuchia và Việt Nam. Không thêm hoặc xóa quốc gia.</p>
        </div>
        {missingCountries.length > 0 && <Alert><AlertDescription>
          Thiếu dữ liệu quốc gia: {missingCountries.map((code) => DESTINATION_COUNTRY_LABELS[code]).join(", ")}. Vui lòng kiểm tra migration 0024 để khởi tạo đủ ba quốc gia.
        </AlertDescription></Alert>}
        <Card className="gap-0 overflow-hidden rounded-[28px] border border-cyan-900/15 bg-white/95 py-0 shadow-[0_18px_55px_-42px_rgba(8,47,73,0.55)]">
          <div className="flex flex-col gap-3 border-b border-cyan-900/15 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Label htmlFor="country-search" className="sr-only">Tìm quốc gia</Label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" />
              <Input id="country-search" value={query} onChange={(event) => setQuery(event.target.value)} className="glass-input h-10 rounded-2xl pl-9" placeholder="Tìm theo tên hoặc mã quốc gia..." />
            </div>
            <p className="rounded-full border border-cyan-900/15 bg-cyan-50 px-3 py-1 text-sm font-medium text-slate-800">{filteredCountries.length} quốc gia</p>
          </div>
          <CardContent className="overflow-x-auto p-0">
            <AdminListTable className="min-w-[760px]">
              <colgroup><col /><col className="w-24" /><col className="w-32" /><col className="w-36" /><col className="w-24" /></colgroup>
              <TableHeader><TableRow>
                <TableHead>Quốc gia</TableHead><TableHead>Mã</TableHead><TableHead>Ngôn ngữ</TableHead><TableHead>Cập nhật</TableHead><TableHead><span className="sr-only">Thao tác</span></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredCountries.map((country) => {
                  const cover = country.images.find((image) => image.role === "cover");
                  const translation = country.translations.find((item) => item.locale === "en");
                  return <TableRow key={country.code}>
                    <TableCell>
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-800">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover.url} alt="" className="size-12 rounded-xl object-cover" />
                          ) : <Globe aria-hidden="true" className="size-5" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <ExpandableText text={translation?.name || DESTINATION_COUNTRY_LABELS[country.code]} className="font-medium text-foreground" />
                          <ExpandableText text={stripHtml(translation?.description || "") || "Chưa có mô tả quốc gia."} className="text-xs text-muted-foreground" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{country.code}</Badge></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1.5">{country.translations.map((item) => <Badge key={item.locale} variant="secondary"><Languages aria-hidden="true" data-icon="inline-start" />{item.locale.toUpperCase()}</Badge>)}</div></TableCell>
                    <TableCell className="text-muted-foreground">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(country.updatedAt))}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" aria-label={`Chỉnh sửa ${DESTINATION_COUNTRY_LABELS[country.code]}`} onClick={() => setEditingCountry(country)}><Edit3 /></Button></TableCell>
                  </TableRow>;
                })}
                {!filteredCountries.length && <TableRow><TableCell colSpan={5} className="h-44 text-center text-muted-foreground">
                  {countries.length ? "Không tìm thấy quốc gia phù hợp. Hãy thử từ khóa khác." : "Chưa có dữ liệu quốc gia. Vui lòng chạy migration 0024."}
                </TableCell></TableRow>}
              </TableBody>
            </AdminListTable>
          </CardContent>
        </Card>
      </section>
      {editingCountry && <CountryFormDrawer key={editingCountry.code} country={editingCountry}
        onClose={() => setEditingCountry(null)} onSaved={() => { setEditingCountry(null); router.refresh(); }} />}
    </>
  );
}

function CountryFormDrawer({ country, onClose, onSaved }: { country: AdminCountry; onClose: () => void; onSaved: () => void }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [message, setMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, string[]>>({});
  const form = useForm<CountryFormValues, unknown, CountryEditorValues>({
    resolver: zodResolver(countryEditorSchema), defaultValues: toEditorValues(country),
  });

  useEffect(() => () => {
    pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const submit = form.handleSubmit(async (data) => {
    if (saving.current) return;
    setMessage(undefined);
    setImageErrors({});
    const pending = pendingImagesSchema.safeParse(pendingImages);
    if (!pending.success) {
      setImageErrors(imageFieldErrors(pending.error.issues, "pendingImages"));
      setMessage("Vui lòng kiểm tra thông tin ảnh.");
      return;
    }
    if ([...data.existingImages, ...pending.data].filter((image) => image.role === "cover").length > 1) {
      setMessage("Chỉ được chọn một ảnh bìa.");
      return;
    }
    saving.current = true;
    setIsSaving(true);
    try {
      const body = new FormData();
      body.set("payload", JSON.stringify(data));
      body.set("pendingImages", JSON.stringify(pending.data));
      pendingImages.forEach((image) => body.set(`file:${image.clientId}`, image.file));
      const result = await submitUpload(body, updateAdminCountryAction);
      if (result.success) {
        onSaved();
        return;
      }
      setMessage(result.message);
      setImageErrors(result.fieldErrors ?? {});
      for (const currentLocale of locales) {
        for (const field of ["name", ...contentFields] as const) {
          const path = `translations.${currentLocale}.${field}` as const;
          const error = result.fieldErrors?.[path]?.[0];
          if (error) form.setError(path, { type: "server", message: error });
        }
      }
      const invalidLocale = locales.find((value) => Object.keys(result.fieldErrors ?? {}).some((path) => path.startsWith(`translations.${value}.`)));
      if (invalidLocale) setLocale(invalidLocale);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }, (errors) => {
    if (errors.translations?.en) setLocale("en");
    else if (errors.translations?.vi) setLocale("vi");
    const parsed = countryEditorSchema.safeParse(form.getValues());
    if (!parsed.success) setImageErrors(imageFieldErrors(parsed.error.issues));
    setMessage("Vui lòng kiểm tra các trường được đánh dấu.");
  });

  return <Sheet open onOpenChange={(open) => { if (!open && !saving.current) onClose(); }}>
    <SheetContent fullscreen className="tour-drawer-surface gap-0 text-slate-950" showCloseButton={!isSaving}>
      <SheetHeader className="tour-drawer-chrome sticky top-0 z-20 rounded-none border-x-0 border-t-0 px-5 py-4 sm:px-8">
        <div className="mx-auto w-full max-w-[1180px] pr-12">
          <SheetTitle className="text-xl sm:text-2xl">Chỉnh sửa quốc gia — {DESTINATION_COUNTRY_LABELS[country.code]}</SheetTitle>
          <SheetDescription className="mt-1">Tên tiếng Anh là bắt buộc. Ảnh mới chỉ được upload khi lưu quốc gia.</SheetDescription>
        </div>
      </SheetHeader>
      <form onSubmit={submit} noValidate aria-busy={isSaving} className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-[1180px] space-y-7">
            {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
            <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
              <div><h3 className="font-heading text-base font-semibold">Nội dung đa ngôn ngữ</h3><p className="mt-1 text-sm text-muted-foreground">Tiếng Việt có thể bổ sung sau. Khi nhập nội dung tiếng Việt, cần nhập tên tiếng Việt.</p></div>
              <Tabs value={locale} onValueChange={(value) => { if (value === "en" || value === "vi") setLocale(value); }}>
                <TabsList><TabsTrigger value="en">English *</TabsTrigger><TabsTrigger value="vi">Tiếng Việt</TabsTrigger></TabsList>
                {locales.map((currentLocale) => <TabsContent key={currentLocale} value={currentLocale} className="space-y-4 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor={`country-name-${currentLocale}`}>Tên quốc gia ({currentLocale.toUpperCase()}){currentLocale === "en" && <span className="text-destructive" aria-hidden="true"> *</span>}</Label>
                    <Input id={`country-name-${currentLocale}`} disabled={isSaving} aria-required={currentLocale === "en"}
                      aria-invalid={Boolean(form.formState.errors.translations?.[currentLocale]?.name)}
                      aria-describedby={form.formState.errors.translations?.[currentLocale]?.name ? `country-name-${currentLocale}-error` : undefined}
                      {...form.register(`translations.${currentLocale}.name`)} />
                    {form.formState.errors.translations?.[currentLocale]?.name && <p id={`country-name-${currentLocale}-error`} role="alert" className="text-xs text-destructive">{form.formState.errors.translations[currentLocale]?.name?.message}</p>}
                  </div>
                  {contentFields.map((fieldName) => {
                    const label = `${contentLabels[fieldName]} (${currentLocale.toUpperCase()})`;
                    const error = form.formState.errors.translations?.[currentLocale]?.[fieldName];
                    return <div key={fieldName} className="space-y-2">
                      <p className="text-sm font-medium">{label}</p>
                      <Controller control={form.control} name={`translations.${currentLocale}.${fieldName}`} render={({ field }) => (
                        <RichTextEditor value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} label={label}
                          disabled={isSaving} invalid={Boolean(error)} placeholder={`${contentLabels[fieldName]} quốc gia (không bắt buộc)...`} />
                      )} />
                      {error && <p role="alert" className="text-xs text-destructive">{error.message}</p>}
                    </div>;
                  })}
                </TabsContent>)}
              </Tabs>
            </section>
            <section className="tour-drawer-panel space-y-4 rounded-[28px] p-5 sm:p-7">
              <div><h3 className="font-heading text-base font-semibold">Hình ảnh</h3><p className="mt-1 text-sm text-muted-foreground">Chọn, kéo thả hoặc paste ảnh. Tên ảnh không bắt buộc. Chỉ một ảnh được đặt làm ảnh bìa.</p></div>
              {imageErrors.existingImages?.[0] && <p role="alert" className="text-sm text-destructive">{imageErrors.existingImages[0]}</p>}
              {imageErrors.pendingImages?.[0] && <p role="alert" className="text-sm text-destructive">{imageErrors.pendingImages[0]}</p>}
              <fieldset disabled={isSaving}>
                <legend className="sr-only">Hình ảnh quốc gia</legend>
                <Controller control={form.control} name="existingImages" render={({ field }) => (
                  <CoverImageUploadField active disabled={isSaving} ensureCover existing={field.value} pending={pendingImages}
                    helperText="JPEG, PNG, WebP, AVIF · tối đa 50MB · chỉ upload khi lưu quốc gia" errors={imageErrors}
                    onExistingChange={(images) => { setImageErrors({}); field.onChange(images); }}
                    onPendingChange={(images) => { setImageErrors({}); pendingImagesRef.current = images; setPendingImages(images); }} />
                )} />
              </fieldset>
            </section>
          </div>
        </div>
        <SheetFooter className="tour-drawer-chrome sticky bottom-0 z-20 rounded-none border-x-0 border-b-0 px-5 py-4 sm:px-8">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-6 text-base" disabled={isSaving} onClick={onClose}>Hủy</Button>
            <Button type="submit" size="lg" className="h-12 rounded-2xl px-6 text-base" disabled={isSaving}>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>;
}

function toEditorValues(country: AdminCountry): CountryFormValues {
  const translation = (locale: Locale) => {
    const stored = country.translations.find((item) => item.locale === locale);
    return { name: stored?.name || "", description: stored?.description || "", visa: stored?.visa || "", weather: stored?.weather || "" };
  };
  return {
    code: country.code,
    translations: { en: translation("en"), vi: translation("vi") },
    existingImages: country.images.map((image) => ({ ...image, altText: image.altText || "" })),
  };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;|&#xA0;/gi, " ").replace(/\s+/g, " ").trim();
}
