"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, Search, Trash2 } from "lucide-react";
import { searchServicesAction } from "@/app/admin/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminService } from "@/features/admin-services/service-types";
import type { TourFormValues } from "@/features/admin-tours/tour-form-schema";

export function ServiceManager({ value, existingServices, onChange }: { value: TourFormValues["services"]; existingServices: AdminService[]; onChange: (value: TourFormValues["services"]) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminService[]>([]);
  const [selectedServices, setSelectedServices] = useState<AdminService[]>(existingServices);
  const [isPending, startTransition] = useTransition();
  const known = useMemo(
    () => new Map([...existingServices, ...selectedServices, ...results].map((item) => [item.serviceId, item])),
    [existingServices, results, selectedServices],
  );
  const search = (term: string) => {
    setQuery(term);
    if (term.trim().length < 2) return setResults([]);
    startTransition(async () => setResults(await searchServicesAction(term)));
  };
  const add = (service: AdminService) => {
    if (value.some((item) => item.serviceId === service.serviceId)) return;
    setSelectedServices((current) => current.some((item) => item.serviceId === service.serviceId)
      ? current
      : [...current, service]);
    onChange([...value, { serviceId: service.serviceId, sortOrder: value.length }]);
    setQuery(""); setResults([]);
  };
  const remove = (serviceId: string) => {
    setSelectedServices((current) => current.filter((item) => item.serviceId !== serviceId));
    onChange(value.filter((candidate) => candidate.serviceId !== serviceId).map((candidate, order) => ({ ...candidate, sortOrder: order })));
  };
  return <div className="space-y-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" /><Input value={query} onChange={(event) => search(event.target.value)} className="pl-9" placeholder="Tìm dịch vụ..." /></div>{query.trim().length >= 2 && <div className="max-h-52 overflow-y-auto rounded-2xl border bg-white p-2">{isPending ? <p className="p-4 text-sm">Đang tìm...</p> : results.map((item) => <button key={item.serviceId} type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-cyan-50" onClick={() => add(item)}>{item.translations.find((translation) => translation.locale === "vi")?.name}</button>)}</div>}<div className="space-y-2">{value.map((item) => { const service = known.get(item.serviceId); return <div key={item.serviceId} className="flex items-center gap-3 rounded-2xl border bg-white p-3"><GripVertical className="size-4 text-muted-foreground" /><span className="flex-1 font-medium">{service?.translations.find((translation) => translation.locale === "vi")?.name || item.serviceId}</span><Button type="button" variant="destructive" size="icon-sm" aria-label="Gỡ dịch vụ" onClick={() => remove(item.serviceId)}><Trash2 /></Button></div>; })}</div></div>;
}
