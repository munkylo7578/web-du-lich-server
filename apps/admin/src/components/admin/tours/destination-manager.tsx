"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Search, Trash2 } from "lucide-react";

import { searchDestinationsAction } from "@/app/admin/tours/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TourFormValues } from "@/features/admin-tours/tour-form-schema";
import type { AdminDestination, AdminWard } from "@/features/admin-tours/tour-types";

type DestinationManagerProps = {
  value: TourFormValues["destinations"];
  existingDestinations: AdminDestination[];
  error?: string;
  onChange: (value: TourFormValues["destinations"]) => void;
};

export function DestinationManager({ value, existingDestinations, error, onChange }: DestinationManagerProps) {
  const [knownDestinations, setKnownDestinations] = useState<AdminDestination[]>(existingDestinations);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationResults, setDestinationResults] = useState<AdminDestination[]>([]);
  const [isPending, startTransition] = useTransition();

  const destinationMap = useMemo(() => {
    const map = new Map<string, AdminDestination>();

    for (const destination of knownDestinations) {
      map.set(destination.destinationId, destination);
    }

    return map;
  }, [knownDestinations]);

  const searchExistingDestinations = (query: string) => {
    setDestinationQuery(query);

    if (query.trim().length < 2) {
      setDestinationResults([]);
      return;
    }

    startTransition(async () => {
      const results = await searchDestinationsAction(query);
      setDestinationResults(results);
      mergeKnownDestinations(results);
    });
  };

  const addExistingDestination = (destination: AdminDestination) => {
    if (value.some((item) => item.destinationId === destination.destinationId)) return;

    mergeKnownDestinations([destination]);
    onChange([...value, { destinationId: destination.destinationId, sortOrder: value.length }]);
    setDestinationQuery("");
    setDestinationResults([]);
  };

  const removeDestination = (index: number) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index).map((item, sortOrder) => ({ ...item, sortOrder })));
  };

  function mergeKnownDestinations(destinations: AdminDestination[]) {
    setKnownDestinations((current) => {
      const map = new Map(current.map((destination) => [destination.destinationId, destination]));

      for (const destination of destinations) {
        map.set(destination.destinationId, destination);
      }

      return [...map.values()];
    });
  }

  return (
    <div data-field-path="destinations" className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950" strokeWidth={2.75} />
          <Input
            value={destinationQuery}
            onChange={(event) => searchExistingDestinations(event.target.value)}
            className="glass-input h-11 rounded-2xl pl-9"
            placeholder="Tìm điểm đến đã có, ví dụ: Hà Giang"
          />
          {destinationQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-12 z-50 max-h-72 overflow-y-auto rounded-2xl border bg-white p-2 shadow-md">
              {isPending ? (
                <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tìm điểm đến...</p>
              ) : destinationResults.length ? (
                destinationResults.map((destination) => (
                  <button
                    key={destination.destinationId}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    onClick={() => addExistingDestination(destination)}
                  >
                    <span>
                      <span className="block font-medium text-foreground">{getDestinationName(destination)}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{formatWardList(destination.wards)}</span>
                    </span>
                    <Check className="mt-1 size-4 text-cyan-700" />
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">Không tìm thấy điểm đến phù hợp.</p>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Chỉ chọn điểm đến đã có. Tạo hoặc sửa điểm đến tại màn hình “Điểm đến”.</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!value.length && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Chưa có điểm đến. Tìm điểm đến đã có hoặc tạo điểm đến mới.
        </div>
      )}

      <div className="space-y-3">
        {value.map((destination, index) => {
          const detail = destinationMap.get(destination.destinationId);

          return (
            <div key={destination.destinationId} className="flex items-start justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm">
              <div>
                <p className="font-medium">{detail ? getDestinationName(detail) : destination.destinationId}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {detail ? formatWardList(detail.wards) : "Điểm đến đã được gắn với tour."}
                </p>
              </div>
              <Button type="button" variant="destructive" size="icon-sm" aria-label={`Xóa điểm đến ${index + 1}`} onClick={() => removeDestination(index)}>
                <Trash2 />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDestinationName(destination: AdminDestination): string {
  return destination.translations.find((translation) => translation.locale === "vi")?.name || "Chưa đặt tên";
}

function formatWardList(wards: AdminWard[]): string {
  if (!wards.length) return "Chưa liên kết phường/xã";
  return wards.map((ward) => ward.fullName || ward.name).slice(0, 3).join(" · ");
}
