"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

// PC 헤더 우측 알림 아이콘 + 드롭다운 팝오버.
// mock 상태 — 알림 배열이 비어있어 empty state 만 렌더.
// 모바일 : onMobileOpen 이 있으면 대신 그 콜백 호출 (layout 이 오버레이 처리).

type Tab = "all" | "unread";

interface NotificationsPopoverProps {
  onMobileOpen?: () => void;
}

export function NotificationsPopover({ onMobileOpen }: NotificationsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 · Esc 로 닫기
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 모바일에서 눌리면 layout 의 오버레이로 위임, PC 는 dropdown 토글.
  function handleClick(e: React.MouseEvent) {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop && onMobileOpen) {
      e.preventDefault();
      onMobileOpen();
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label="알림"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-fg"
      >
        <BellIcon className="size-6" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="알림"
          className="animate-fade-in absolute top-full right-0 z-40 mt-2 hidden w-96 overflow-hidden rounded-lg border border-line bg-card shadow-xl lg:block"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-base font-bold text-fg">알림</h3>
            <div className="flex items-center gap-1">
              <div className="inline-flex rounded-full border border-line p-0.5">
                <TabButton active={tab === "all"} onClick={() => setTab("all")}>
                  전체
                </TabButton>
                <TabButton active={tab === "unread"} onClick={() => setTab("unread")}>
                  안읽음
                </TabButton>
              </div>
              <button
                type="button"
                aria-label="알림 설정"
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-fg"
              >
                <Cog6ToothIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* mock : 항상 empty */}
            <EmptyState />
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active ? "bg-card-hover text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-card-hover">
        <BellIcon className="size-6 text-muted" />
      </div>
      <p className="text-sm text-muted">알림이 없어요.</p>
    </div>
  );
}
