"use client";

import Link from "next/link";
import { PaperAirplaneIcon, UserCircleIcon } from "@heroicons/react/24/outline";
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
  onOpenProfile,
  onOpenNotifications,
  onOpenAlimtalk,
}: {
  admin: Admin;
  // 모바일 헤더 사람 아이콘 — 누르면 layout 의 profile 오버레이 state on.
  // 라우트 push 대신 state 로 처리해 parent 페이지가 unmount 되지 않게.
  onOpenProfile: () => void;
  // 모바일 알림 벨 — 누르면 layout 의 notification 오버레이 state on.
  // PC 는 NotificationBell 이 내부 dropdown 으로 처리.
  onOpenNotifications: () => void;
  // 모바일 알림톡 아이콘 — 누르면 layout 의 alimtalk 오버레이 state on.
  // PC 는 사이드바·라우트로 접근 — 헤더 아이콘 자체가 lg:hidden.
  onOpenAlimtalk: () => void;
}) {
  const { selectedBranchId, setSelectedBranchId, branches, isSuper } =
    useBranch();
  const ownBranch = branches.find((b) => b.id === selectedBranchId);
  const { title } = usePageTitle();
  const initial = admin.name.charAt(0) || "?";
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-12 items-center gap-2 border-b border-line bg-card px-3 lg:sticky lg:inset-x-auto lg:h-auto lg:gap-3 lg:px-6 lg:py-3">
      {/* 지점 — 좌측. SUPER_ADMIN 은 셀렉터, FC 는 본인 지점 라벨(선택 불가). */}
      {branches.length > 0 && (
        <div className="min-w-0">
          {isSuper ? (
            <BranchPicker
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              branches={branches}
            />
          ) : ownBranch ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-fg">
              <BuildingOffice2Icon className="size-4 shrink-0 text-muted" />
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
          <span className="mr-3 h-5 w-px bg-line" aria-hidden />
          <span className="truncate text-base font-black tracking-tight text-fg">
            {title}
          </span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-2 lg:gap-3">
        <NotificationBell onMobileOpen={onOpenNotifications} />
        {/* 모바일 : 알림 ↔ 프로필 사이 메시지(알림톡) 아이콘 — state 기반 오버레이로 이력·관리. */}
        <button
          type="button"
          onClick={onOpenAlimtalk}
          aria-label="메시지"
          className="rounded-md p-1.5 text-muted hover:bg-card-hover hover:text-fg lg:hidden"
        >
          <PaperAirplaneIcon className="size-6" />
        </button>
        {/* 모바일 : 알림 옆 사람 아이콘 — state 기반 오버레이로 프로필 띄움
            (route 가 아니라 button → layout 의 profileOpen state on).
            그래야 슬라이드 인/아웃 동안 parent 페이지가 뒤에서 그대로 보임. */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="내 정보"
          className="rounded-md p-1.5 text-muted hover:bg-card-hover hover:text-fg lg:hidden"
        >
          <UserCircleIcon className="size-6" />
        </button>
        {/* PC : 사용자 프로필 카드 (이니셜 아바타 + 이름 + 역할). 클릭 시 프로필 페이지로. */}
        <Link
          href="/admin/profile"
          className="hidden items-center gap-2 rounded-md py-1 pr-2 pl-1 transition-colors hover:bg-card-hover lg:flex"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {initial}
          </div>
          <div className="text-left leading-tight">
            <p className="text-sm font-semibold text-fg">{admin.name}</p>
            <p className="text-xs text-muted">{adminRoleLabel(admin)}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
