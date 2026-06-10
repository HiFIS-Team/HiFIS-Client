"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { clearTokens } from "@/lib/api/tokenStore";
import { adminRoleLabel } from "@/lib/format";
import { useToast } from "@/providers/ToastProvider";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import type { Admin } from "@/lib/api/types";
import { NAV_ICONS } from "./navIcons";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { PushToggle } from "./PushToggle";

interface NavItem {
  href: string;
  label: string;
  // SUPER_ADMIN 전용 (FC에게는 숨김)
  superOnly?: boolean;
  // 준비중 — 클릭 비활성 + 배지 표시
  comingSoon?: boolean;
}
interface NavGroup {
  // null이면 그룹 라벨 없이 항목만
  label: string | null;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: null, items: [{ href: "/admin", label: "대시보드" }] },
  {
    label: "신청 조회",
    items: [
      { href: "/admin/reservations", label: "예약" },
      { href: "/admin/members", label: "회원" },
      { href: "/admin/pt-applications", label: "PT" },
    ],
  },
  {
    label: "운영",
    items: [
      { href: "/admin/passes", label: "상품 관리" },
      { href: "/admin/branches", label: "지점 관리", superOnly: true },
    ],
  },
  {
    label: "통계",
    items: [
      { href: "/admin/stats", label: "유입·방문" },
      { href: "/admin/pass-sales", label: "상품별 판매" },
      { href: "/admin/registration-mix", label: "신규·재등록" },
      { href: "/admin/membership-expiry", label: "잔여 기간" },
    ],
  },
  {
    label: "알림톡",
    items: [
      {
        href: "/admin/alimtalk-templates",
        label: "알림톡 관리",
      },
      { href: "/admin/messages", label: "알림톡 이력" },
    ],
  },
  {
    label: "직원 관리",
    items: [
      {
        href: "/admin/staff/facility-care",
        label: "환경정비",
        comingSoon: true,
      },
      {
        href: "/admin/staff/peer-review",
        label: "동료평가",
        comingSoon: true,
      },
      {
        href: "/admin/staff/kindness",
        label: "회원 친절도",
        comingSoon: true,
      },
      { href: "/admin/staff/classes", label: "수업 개수", comingSoon: true },
      {
        href: "/admin/staff/contribution",
        label: "센터 기여도",
        comingSoon: true,
      },
    ],
  },
  {
    label: "계정",
    items: [
      { href: "/admin/admins", label: "관리자 관리", superOnly: true },
      { href: "/admin/release-notes", label: "패치 노트" },
    ],
  },
];

// 모바일: 드로어 (open/onClose 제어). 데스크탑(lg+): 항상 sticky 표시.
export function Sidebar({
  admin,
  open,
  onClose,
}: {
  admin: Admin;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [passwordOpen, setPasswordOpen] = useState(false);
  // 모바일 드로어 열려있는 동안 뒤 페이지 스크롤 잠금. 데스크탑(lg+)은 open 이
  // 항상 false 라 영향 없음 (드로어 토글은 모바일 햄버거에서만 호출됨).
  useBodyScrollLock(open);

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function logout() {
    // 모바일 드로어가 열린 채로 로그아웃하면 layout 이 즉시 unmount 되며 깜빡임 — 먼저 닫음
    onClose();
    clearTokens();
    toast.success("로그아웃되었습니다.");
    router.replace("/admin/login");
  }

  return (
    <>
      {/* 모바일 드로어 백드롭 — 항상 마운트, opacity 토글로 부드럽게 페이드.
          (unmount 방식은 페이지 이동 시 즉시 사라지며 깜빡임 발생) */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-50 transition-transform duration-200 lg:sticky lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
      {/* 사이드바 상단 — 브랜드(로고 + HiFIS) + 모바일 드로어 닫기. */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          {/* 정적 PNG — 추가 최적화 불필요 (Next.js static export) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.png"
            alt=""
            aria-hidden="true"
            className="size-7"
          />
          <span className="text-lg font-bold text-gray-900">HiFIS</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group, gi) => {
          // FC는 SUPER_ADMIN 전용 항목 제외 — 그룹이 비면 통째로 숨김
          const items = group.items.filter(
            (n) => !n.superOnly || admin.role === "SUPER_ADMIN",
          );
          if (items.length === 0) return null;
          return (
            <div key={gi}>
              {group.label && (
                <p className="px-3 pb-1 text-xs font-semibold text-gray-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = NAV_ICONS[item.href];
                  if (item.comingSoon) {
                    return (
                      <div
                        key={item.href}
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-gray-400"
                        aria-disabled="true"
                        title="준비중"
                      >
                        {Icon && <Icon className="size-4 shrink-0" />}
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          준비중
                        </span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {Icon && <Icon className="size-4 shrink-0" />}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-5 py-4">
        {/* 모바일 : 이름·역할 표시. PC 는 헤더 프로필 카드에 같은 정보가 있어 숨김. */}
        <div className="lg:hidden">
          <p className="truncate text-sm font-semibold text-gray-900">
            {admin.name}
          </p>
          <p className="text-xs text-gray-500">{adminRoleLabel(admin)}</p>
        </div>
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 lg:mt-0"
        >
          비밀번호 변경
        </button>
        <PushToggle />
        <button
          type="button"
          onClick={logout}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          로그아웃
        </button>
        {/* 빌드 버전 — next.config 에서 package.json version 주입.
            NEXT_PUBLIC_APP_ENV=dev 면 옆에 (dev) 표시. */}
        <p className="mt-3 text-center text-[10px] text-gray-400">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
          {process.env.NEXT_PUBLIC_APP_ENV === "dev" && (
            <span className="ml-1 text-gray-300">(dev)</span>
          )}
        </p>
      </div>
    </aside>

      {passwordOpen && (
        <PasswordChangeDialog onClose={() => setPasswordOpen(false)} />
      )}
    </>
  );
}
