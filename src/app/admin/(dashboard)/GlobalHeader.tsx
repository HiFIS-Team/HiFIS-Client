"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import { useBranch } from "@/providers/BranchProvider";
import { BranchPicker } from "@/components/BranchPicker";
import { NotificationBell } from "./NotificationBell";

// 어드민 sticky 상단 헤더 — 모바일 기준.
// 좌: 햄버거 + 지점 셀렉터(SUPER_ADMIN 만). 우: 알림벨.
// 브랜드(로고/HiFIS) 는 사이드바 안.
export function GlobalHeader({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { selectedBranchId, setSelectedBranchId, branches, isSuper } =
    useBranch();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 lg:px-4">
      {/* 햄버거 — 모바일만 */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="메뉴 열기"
        className="shrink-0 rounded-md p-1.5 text-gray-700 hover:bg-gray-100 lg:hidden"
      >
        <Bars3Icon className="size-6" />
      </button>
      {/* 지점 칩 — 햄버거 옆 (좌측 정렬). SUPER_ADMIN 만. */}
      {isSuper && branches.length > 0 && (
        <div className="min-w-0">
          <BranchPicker
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            branches={branches}
          />
        </div>
      )}
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  );
}
