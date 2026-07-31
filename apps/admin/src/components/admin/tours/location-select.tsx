"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Loader2, MapPin, X } from "lucide-react";

import { searchLocationsAction } from "@/app/admin/tours/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminLocation } from "@/features/admin-tours/tour-types";
import { cn } from "@/lib/utils";

type LocationSelectProps = {
  value: string | null;
  selectedLocation: AdminLocation | null;
  onChange: (value: string | null) => void;
};

export function LocationSelect({ value, selectedLocation, onChange }: LocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState<AdminLocation | null>(selectedLocation);
  const [results, setResults] = useState<AdminLocation[]>([]);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => {
    if (!value) return null;

    return (
      (selectedOption?.id === value ? selectedOption : null) ??
      results.find((item) => item.id === value) ??
      (selectedLocation?.id === value ? selectedLocation : null)
    );
  }, [results, selectedLocation, selectedOption, value]);

  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }

    if (selectedLocation?.id === value) {
      setSelectedOption(selectedLocation);
    }
  }, [selectedLocation, value]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function updateDropdownPosition() {
      const rect = controlRef.current?.getBoundingClientRect();

      if (!rect) return;

      setDropdownStyle({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
    }

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, value]);

  useEffect(() => {
    if (!open) {
      setDebouncedQuery("");
      return;
    }

    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [open, query]);

  useEffect(() => {
    if (!open || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let ignore = false;

    startTransition(async () => {
      try {
        const next = await searchLocationsAction(debouncedQuery);

        if (!ignore) {
          setResults(next);
        }
      } catch {
        if (!ignore) {
          setResults([]);
        }
      }
    });

    return () => {
      ignore = true;
    };
  }, [debouncedQuery, open]);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      id="tour-location-results"
      role="listbox"
      style={dropdownStyle}
      className="fixed z-[100] max-h-72 overflow-y-auto rounded-2xl border border-white/80 bg-white/98 p-2 shadow-2xl shadow-slate-950/15 backdrop-blur"
    >
      {query.trim().length < 2 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Nhập ít nhất 2 ký tự để tìm địa chỉ.
        </p>
      ) : isPending ? (
        <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang tìm địa chỉ...
        </p>
      ) : results.length ? (
        results.map((location) => (
          <button
            key={location.id}
            type="button"
            role="option"
            aria-selected={location.id === value}
            className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            onClick={() => {
              setSelectedOption(location);
              onChange(location.id);
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
          >
            <span>
              <span className="block font-medium text-foreground">{location.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {location.country} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </span>
            </span>
            <Check
              className={cn(
                "mt-1 size-4 text-cyan-700",
                location.id === value ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        ))
      ) : (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Không tìm thấy địa chỉ phù hợp.
        </p>
      )}
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative z-[70] space-y-2">
      <div ref={controlRef} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-950 drop-shadow-sm"
            strokeWidth={2.75}
          />
          <Input
            role="combobox"
            aria-expanded={open}
            aria-controls="tour-location-results"
            aria-autocomplete="list"
            value={open ? query : selected ? formatLocation(selected) : ""}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            className="glass-input h-11 rounded-2xl pl-9 pr-10"
            placeholder="Gõ vào để tìm địa chỉ"
          />
          <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-600" />
        </div>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Bỏ chọn vị trí"
            className="h-11 rounded-2xl"
            onClick={() => {
              onChange(null);
              setSelectedOption(null);
              setQuery("");
              setResults([]);
            }}
          >
            <X />
          </Button>
        )}
      </div>

      {selected && !open && (
        <p className="text-xs text-muted-foreground">
          Đã chọn: {selected.name} · {selected.country} · {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
        </p>
      )}

      {dropdown && typeof document !== "undefined" ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

function formatLocation(location: AdminLocation): string {
  return `${location.name}, ${location.country}`;
}
