"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/api/tokenStore";
import { useToast } from "@/providers/ToastProvider";
import type { Admin } from "@/lib/api/types";
import { NotificationBell } from "./NotificationBell";

interface NavItem {
  href: string;
  label: string;
  // SUPER_ADMIN 전용 (FC에게는 숨김)
  superOnly?: boolean;
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
    label: "분석",
    items: [
      { href: "/admin/stats", label: "통계" },
      { href: "/admin/messages", label: "알림톡 이력" },
    ],
  },
  {
    label: "계정",
    items: [{ href: "/admin/admins", label: "관리자 관리", superOnly: true }],
  },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "대표",
  FC: "FC",
};

export function Sidebar({ admin }: { admin: Admin }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

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
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <span className="text-lg font-bold text-gray-900">HiFIS</span>
          <span className="ml-1.5 text-sm text-gray-500">관리자</span>
        </div>
        <NotificationBell />
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
                {items.map((item) => (
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
                ))}
              </div>
            </div>
          );
        })}
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
