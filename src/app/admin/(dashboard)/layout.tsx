"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowPathIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/api/tokenStore";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";

// 관리자 대시보드 셸 — 로그인 확인 후 사이드바 + 본문.
// 모바일: 햄버거 + 슬라이드 드로어. 데스크탑(lg+): sticky 사이드바.
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  // 모바일 드로어 열림 상태 (데스크탑에선 사용 안 함)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 로그인한 관리자 정보 (사이드바 권한 분기 + 본문 페이지에서 캐시 재사용)
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });

  // 토큰이 아예 없으면 즉시 로그인 화면으로
  useEffect(() => {
    if (!getAccessToken()) router.replace("/admin/login");
  }, [router]);

  // getMe 실패(토큰 만료·무효) → 로그인 화면으로
  useEffect(() => {
    if (meQuery.isError) router.replace("/admin/login");
  }, [meQuery.isError, router]);

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-gray-500">
        <ArrowPathIcon className="size-6 animate-spin text-gray-400" />
        불러오는 중…
      </div>
    );
  }
  if (!meQuery.data) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* 모바일 상단 바 — 햄버거 + 브랜드 + 알림벨 (데스크탑에선 숨김) */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="메뉴 열기"
          className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100"
        >
          <Bars3Icon className="size-6" />
        </button>
        <span className="text-base font-bold text-gray-900">HiFIS</span>
        <span className="text-sm text-gray-500">관리자</span>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      <div className="flex">
        <Sidebar
          admin={meQuery.data}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
