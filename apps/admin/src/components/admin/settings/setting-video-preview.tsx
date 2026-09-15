"use client";

import { useEffect, useRef, useState } from "react";
import { Video } from "lucide-react";

/** Mount with a source key so a replaced video starts with a fresh preview. */
export function SettingVideoPreview({ src, label }: { src: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(src ? "loading" : "error");

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!src || !container || !video) return;

    let started = false;
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      setStatus("error");
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    const showFrame = () => {
      if (settled || video.seeking || video.readyState < 2 || !video.videoWidth) return;
      settled = true;
      clearTimeout(timeout);
      video.pause();
      setStatus("ready");
    };
    const seekFrame = () => {
      if (settled) return;
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        fail();
        return;
      }
      try {
        // Avoid both the often-black opening frame and the end of short clips.
        video.currentTime = Math.min(1, video.duration / 2);
      } catch {
        fail();
      }
    };
    const start = () => {
      if (started) return;
      started = true;
      timeout = setTimeout(fail, 20000);
      video.src = src;
      video.load();
    };

    video.addEventListener("loadedmetadata", seekFrame);
    video.addEventListener("loadeddata", showFrame);
    video.addEventListener("seeked", showFrame);
    video.addEventListener("error", fail);

    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start();
          observer?.disconnect();
        }
      }, { rootMargin: "200px" })
      : undefined;

    if (observer) observer.observe(container);
    else start();

    return () => {
      settled = true;
      observer?.disconnect();
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", seekFrame);
      video.removeEventListener("loadeddata", showFrame);
      video.removeEventListener("seeked", showFrame);
      video.removeEventListener("error", fail);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  const description = status === "error"
    ? `Không thể tải ảnh xem trước video: ${label}`
    : status === "loading" ? `Đang tải ảnh xem trước video: ${label}` : `Ảnh xem trước video: ${label}`;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={description}
      title={description}
      className="relative h-14 w-24 overflow-hidden rounded-xl border bg-slate-100"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        className={`pointer-events-none size-full object-cover ${status === "ready" ? "opacity-100" : "opacity-0"}`}
      >
        Trình duyệt không hỗ trợ xem trước video.
      </video>
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center text-cyan-800" aria-hidden="true">
          <Video className="size-5" />
        </div>
      )}
    </div>
  );
}
