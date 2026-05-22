"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/api/tokenStore";
import { useToast } from "@/providers/ToastProvider";
import type { Admin } from "@/lib/api/types";

interface NavItem {
  href: string;
  label: string;
  // 아직 구현 전이면 false → 사이드바에 흐리게 "준비 중" 표시
  ready: boolean;
  // SUPER_ADMIN 전용 메뉴 (FC에게는 숨김)
  superOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "대시보드", ready: true },
  { href: "/admin/reservations", label: "예약", ready: true },
  { href: "/admin/members", label: "회원", ready: true },
  { href: "/admin/pt-applications", label: "PT 신청", ready: true },
  { href: "/admin/passes", label: "상품 관리", ready: true },
  { href: "/admin/stats", label: "통계", ready: true },
  { href: "/admin/messages", label: "알림톡 이력", ready: true },
  { href: "/admin/holds", label: "홀딩", ready: false },
  { href: "/admin/branches", label: "지점 관리", ready: true, superOnly: true },
  { href: "/admin/admins", label: "관리자 관리", ready: false, superOnly: true },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "대표",
  FC: "FC",
};

export function Sidebar({ admin }: { admin: Admin }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  // FC는 SUPER_ADMIN 전용 메뉴를 보지 못함
  const items = NAV.filter(
    (n) => !n.superOnly || admin.role === "SUPER_ADMIN",
  );

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
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div className="px-5 py-5">
        <span className="text-lg font-bold text-gray-900">HiFIS</span>
        <span className="ml-1.5 text-sm text-gray-500">관리자</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) =>
          item.ready ? (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-400"
            >
              {item.label}
              <span className="text-xs">준비 중</span>
            </span>
          ),
        )}
      </nav>

      <div className="border-t border-gray-200 px-5 py-4">
        <p className="truncate text-sm font-semibold text-gray-900">
          {admin.name}
        </p>
        <p className="text-xs text-gray-500">
          {ROLE_LABEL[admin.role] ?? admin.role}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
