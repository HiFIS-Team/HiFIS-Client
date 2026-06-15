"use client";

import Link from "next/link";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/outline";
import { BuildingOffice2Icon } from "@heroicons/react/16/solid";
import { useBranch } from "@/providers/BranchProvider";
import { BranchPicker, branchShortName } from "@/components/BranchPicker";
import { NotificationBell } from "./NotificationBell";
import { usePageTitle } from "./PageTitleProvider";
import { adminRoleLabel } from "@/lib/format";
import type { Admin } from "@/lib/api/types";

// 어드민 sticky 상단 헤더.
// 모바일 : 햄버거 + 지점 + (우)알림벨.
// PC     : 지점 + 페이지 타이틀 + (우)알림벨 + 사용자 프로필 카드.
//          페이지 타이틀은 PageTitleProvider 를 통해 페이지의 <PageTitle/> 에서 받음.
//          프로필 카드(아바타 + 이름 + 역할) 는 PC 헤더 우측을 채워 휑함을 해소.
export function GlobalHeader({
  admin,
  onOpenDrawer,
}: {
  admin: Admin;
  onOpenDrawer: () => void;
}) {
  const { selectedBranchId, setSelectedBranchId, branches, isSuper } =
    useBranch();
  const ownBranch = branches.find((b) => b.id === selectedBranchId);
  const { title } = usePageTitle();
  const initial = admin.name.charAt(0) || "?";
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 lg:gap-3 lg:px-6 lg:py-3">
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
      {/* PC : 페이지 타이틀 (지점 옆 구분선 + 본문 제목). 모바일 hidden. */}
      {title && (
        <div className="hidden min-w-0 items-center lg:flex">
          <span className="mr-3 h-5 w-px bg-gray-200" aria-hidden />
          <span className="truncate text-base font-semibold text-gray-800">
            {title}
          </span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-2 lg:gap-3">
        <NotificationBell />
        {/* 모바일 : 알림 옆 사람 아이콘 — 누르면 프로필 페이지로. */}
        <Link
          href="/admin/profile"
          aria-label="내 정보"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
        >
          <UserCircleIcon className="size-6" />
        </Link>
        {/* PC : 사용자 프로필 카드 (이니셜 아바타 + 이름 + 역할). 클릭 시 프로필 페이지로. */}
        <Link
          href="/admin/profile"
          className="hidden items-center gap-2 rounded-md py-1 pr-2 pl-1 transition-colors hover:bg-gray-100 lg:flex"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initial}
          </div>
          <div className="text-left leading-tight">
            <p className="text-sm font-semibold text-gray-900">{admin.name}</p>
            <p className="text-xs text-gray-500">{adminRoleLabel(admin)}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
