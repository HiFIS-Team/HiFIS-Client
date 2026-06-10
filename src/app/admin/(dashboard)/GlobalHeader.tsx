"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import { useBranch } from "@/providers/BranchProvider";
import { BranchPicker } from "@/components/BranchPicker";
import { NotificationBell } from "./NotificationBell";

// 어드민 sticky 상단 헤더 — 모바일/데스크탑 공통.
// 모바일은 햄버거 표시, 데스크탑은 사이드바 sticky 옆에 정렬.
// 우측에 지점 칩(SUPER_ADMIN 만) + 알림벨.
export function GlobalHeader({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { selectedBranchId, setSelectedBranchId, branches, isSuper } =
    useBranch();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
      {/* 햄버거 — 모바일만 */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="메뉴 열기"
        className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100 lg:hidden"
      >
        <Bars3Icon className="size-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/logo.png"
        alt=""
        aria-hidden="true"
        className="size-7"
      />
      <span className="text-base font-bold text-gray-900">HiFIS</span>
      <span className="hidden text-sm text-gray-500 sm:inline">관리자</span>
      <div className="ml-auto flex items-center gap-2">
        {isSuper && branches.length > 0 && (
          <div className="w-32 sm:w-40">
            <BranchPicker
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              branches={branches}
            />
          </div>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
