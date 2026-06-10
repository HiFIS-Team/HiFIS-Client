"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import { BuildingOffice2Icon } from "@heroicons/react/16/solid";
import { useBranch } from "@/providers/BranchProvider";
import { BranchPicker, branchShortName } from "@/components/BranchPicker";
import { NotificationBell } from "./NotificationBell";

// 어드민 sticky 상단 헤더 — 모바일 기준.
// 좌: 햄버거 + 지점 (SUPER_ADMIN 은 셀렉터, FC 는 본인 지점 라벨). 우: 알림벨.
// 브랜드(로고/HiFIS) 는 사이드바 안.
export function GlobalHeader({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { selectedBranchId, setSelectedBranchId, branches, isSuper } =
    useBranch();
  const ownBranch = branches.find((b) => b.id === selectedBranchId);
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
      {/* 지점 — 햄버거 옆. SUPER_ADMIN 은 셀렉터, FC 는 본인 지점 라벨(선택 불가). */}
      {branches.length > 0 && (
        <div className="min-w-0">
          {isSuper ? (
            <BranchPicker
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              branches={branches}
            />
          ) : ownBranch ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700">
              <BuildingOffice2Icon className="size-4 shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-left">
                {branchShortName(ownBranch.name)}
              </span>
            </div>
          ) : null}
        </div>
      )}
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  );
}
