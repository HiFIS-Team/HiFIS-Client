"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon,
  UsersIcon,
  BriefcaseIcon,
  CubeIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  Squares2X2Icon as Squares2X2SolidIcon,
  UsersIcon as UsersSolidIcon,
  BriefcaseIcon as BriefcaseSolidIcon,
  CubeIcon as CubeSolidIcon,
  ChartBarIcon as ChartBarSolidIcon,
} from "@heroicons/react/24/solid";
import type { ComponentType } from "react";

// 모바일 하단 5탭 — 각 탭이 여러 페이지를 묶는 그룹.
// 활성 탭 판정: 현재 pathname 이 그 탭의 routes 중 하나로 시작하면 활성.
// PC(lg+) 에선 lg:hidden 으로 숨고 기존 사이드바가 보임.

interface TabDef {
  href: string; // 탭 누르면 이동할 기본 경로 (그룹의 첫 페이지)
  label: string;
  icon: ComponentType<{ className?: string }>;
  iconActive: ComponentType<{ className?: string }>;
  routes: string[]; // 이 탭에 포함되는 페이지 경로들 (활성 판정용)
}

const TABS: TabDef[] = [
  {
    href: "/admin",
    label: "홈",
    icon: Squares2X2Icon,
    iconActive: Squares2X2SolidIcon,
    routes: ["/admin"],
  },
  {
    href: "/admin/members",
    label: "회원",
    icon: UsersIcon,
    iconActive: UsersSolidIcon,
    routes: ["/admin/members", "/admin/reservations", "/admin/pt-applications"],
  },
  {
    href: "/admin/alimtalk-templates",
    label: "업무",
    icon: BriefcaseIcon,
    iconActive: BriefcaseSolidIcon,
    routes: [
      "/admin/alimtalk-templates",
      "/admin/messages",
      "/admin/staff",
    ],
  },
  {
    href: "/admin/passes",
    label: "상품",
    icon: CubeIcon,
    iconActive: CubeSolidIcon,
    routes: ["/admin/passes", "/admin/branches"],
  },
  {
    href: "/admin/stats",
    label: "통계",
    icon: ChartBarIcon,
    iconActive: ChartBarSolidIcon,
    routes: [
      "/admin/stats",
      "/admin/pass-sales",
      "/admin/registration-mix",
      "/admin/membership-expiry",
    ],
  },
];

function isActive(pathname: string, tab: TabDef): boolean {
  // 홈은 정확 일치만 — 다른 경로가 "/admin" 으로 시작해서 홈이 같이 켜지는 걸 막음.
  if (tab.href === "/admin") return pathname === "/admin";
  return tab.routes.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 탭"
      className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab);
        const Icon = active ? tab.iconActive : tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
              active ? "text-primary" : "text-gray-500"
            }`}
          >
            <Icon className="size-6" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
