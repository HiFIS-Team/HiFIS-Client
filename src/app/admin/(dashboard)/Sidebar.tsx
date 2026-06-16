"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/api/tokenStore";
import { adminRoleLabel } from "@/lib/format";
import { useToast } from "@/providers/ToastProvider";
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
    // 지점 관리는 프로필 메뉴로 이동 — 운영 그룹은 상품 관리만.
    label: "운영",
    items: [{ href: "/admin/passes", label: "상품 관리" }],
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
        label: "환경 정비",
      },
      {
        href: "/admin/staff/peer-review",
        label: "동료 평가",
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
      { href: "/admin/staff/projects", label: "프로젝트" },
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

// PC(lg+) 전용 sticky 사이드바. 모바일은 하단 탭바 + 헤더 프로필 아이콘으로 대체.
export function Sidebar({ admin }: { admin: Admin }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [passwordOpen, setPasswordOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function logout() {
    clearTokens();
    toast.success("로그아웃되었습니다.");
    router.replace("/admin/login");
  }

  return (
    <>
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white lg:sticky lg:top-0 lg:flex">
      {/* 사이드바 상단 — 브랜드(로고 + HiFIS). */}
      <div className="flex items-center gap-2 px-5 py-4">
        {/* 정적 PNG — 추가 최적화 불필요 (Next.js static export) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo.png"
          alt=""
          aria-hidden="true"
          className="size-7"
        />
        <span className="text-lg font-black tracking-tighter text-gray-900">HiFIS</span>
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
