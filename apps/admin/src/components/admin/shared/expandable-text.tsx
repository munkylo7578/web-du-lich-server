"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ExpandableTextProps = {
  text: string;
  className?: string;
};

/** Reset expansion when a paginated row is reused for different content. */
export function ExpandableText({ text, className }: ExpandableTextProps) {
  return <TextPreview key={text} text={text} className={className} />;
}

function TextPreview({ text, className }: ExpandableTextProps) {
  const id = useId();
  const probeRef = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;

    let disposed = false;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!disposed) setOverflows(probe.scrollHeight > probe.clientHeight + 1);
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    measure();
    // Font loading can change wrapping without changing a clamped box's height.
    document.fonts?.addEventListener("loadingdone", measure);
    void document.fonts?.ready.then(() => { if (!disposed) measure(); });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, []);

  const isExpanded = expanded && overflows;
  return (
    <div className="min-w-0 max-w-full">
      <div className={cn("relative whitespace-pre-line text-sm leading-5 [overflow-wrap:anywhere]", className)}>
        <p id={id} className={isExpanded ? undefined : "line-clamp-2"}>{text || "—"}</p>
        {/* Always measure the collapsed layout, even while the visible text is expanded. */}
        <p ref={probeRef} aria-hidden="true" className="pointer-events-none invisible absolute inset-x-0 top-0 line-clamp-2 select-none">{text || "—"}</p>
      </div>
      {overflows && (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={id}
          onClick={() => setExpanded(!isExpanded)}
          className="mt-1 inline-flex min-h-8 cursor-pointer items-center rounded px-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [@media(pointer:coarse)]:min-h-11"
        >
          {isExpanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
