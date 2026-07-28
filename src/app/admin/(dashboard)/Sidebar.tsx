"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/api/tokenStore";
import { useToast } from "@/providers/ToastProvider";
import type { EmployeeOut } from "@/lib/api/v2/types";
import { NAV_ICONS } from "./navIcons";

// v2 재편 — 회원/PT/예약/상품/통계/알림톡 계열 제거.
// 새 18개 도메인을 성격별 그룹으로 묶음.
// 사용자 프로필·비밀번호·푸시 토글은 프로필 페이지에 있어 사이드바 하단에서 뺐음.

interface NavItem {
  // action 이 있으면 button (로그아웃), 아니면 Link.
  href: string;
  label: string;
  action?: "logout";
}
interface NavGroup {
  // null 이면 그룹 라벨 없이 항목만 (홈 같은 상단 단일 항목).
  label: string | null;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: null, items: [{ href: "/admin", label: "홈" }] },
  {
    label: "업무",
    items: [
      { href: "/admin/schedule", label: "일정" },
      { href: "/admin/tasks", label: "업무" },
      { href: "/admin/projects", label: "프로젝트" },
      { href: "/admin/approvals", label: "전자결재" },
      { href: "/admin/meetings", label: "회의록" },
      { href: "/admin/attendance", label: "근태 · 월차" },
      { href: "/admin/documents", label: "문서함" },
    ],
  },
  {
    // 사내톡·알림은 헤더 아이콘/FAB 로 접근 — 사이드바에서는 공지만.
    label: "커뮤니케이션",
    items: [{ href: "/admin/notices", label: "공지" }],
  },
  {
    label: "인사",
    items: [
      { href: "/admin/accounts", label: "계정관리" },
      { href: "/admin/staff", label: "직원" },
      { href: "/admin/payroll", label: "급여명세서" },
      { href: "/admin/ranking", label: "랭킹" },
    ],
  },
  {
    label: "계정",
    items: [
      { href: "/admin/profile", label: "프로필" },
      { href: "/admin/guide", label: "앱 가이드" },
      { href: "/admin/logout", label: "로그아웃", action: "logout" },
    ],
  },
];

// PC(lg+) 전용 sticky 사이드바. 모바일은 하단 탭바 + 헤더 프로필 아이콘으로 대체.
export function Sidebar({ admin: _admin }: { admin: EmployeeOut }) {
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
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-card lg:sticky lg:top-0 lg:flex">
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
        <span className="text-lg font-black tracking-tighter text-fg">
          HiFIS
        </span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 pb-1 text-xs font-semibold text-muted">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.href];
                const active = item.action ? false : isActive(item.href);
                const baseClass =
                  "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors";
                const activeClass = active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-transparent text-fg hover:bg-card-hover";

                if (item.action === "logout") {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={logout}
                      className={`${baseClass} ${activeClass}`}
                    >
                      {Icon && <Icon className="size-4 shrink-0" />}
                      {item.label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${baseClass} ${activeClass}`}
                  >
                    {Icon && <Icon className="size-4 shrink-0" />}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단 — 빌드 버전만. 프로필·비밀번호·푸시는 nav 의 프로필 항목에서 처리. */}
      <div className="border-t border-line px-5 py-3">
        <p className="text-center text-[10px] text-muted">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
          {process.env.NEXT_PUBLIC_APP_ENV === "dev" && (
            <span className="ml-1 opacity-60">(dev)</span>
          )}
        </p>
      </div>
    </aside>
  );
}
