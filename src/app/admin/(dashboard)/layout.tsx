"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowPathIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/api/tokenStore";
import { useHeartbeat } from "@/lib/hooks/useHeartbeat";
import { useNotificationNavigate } from "@/lib/hooks/useNotificationNavigate";
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

  // 60초마다 heartbeat ping — SUPER_ADMIN 의 "관리자 관리" 화면에서 접속중 표시용.
  // (토큰 없으면 hook 내부에서 skip — 로그인 화면으로 리다이렉트 되는 짧은 순간 안전)
  useHeartbeat();

  // SW push 알림 클릭 → postMessage('notification-click', url) → 여기서 router.push 로 SPA 라우팅.
  // ?detail=<id> 같은 query 변화로 회원/PT 상세 다이얼로그 자동 오픈이 정확히 동작하도록.
  useNotificationNavigate();

  // SW 새 버전 자동 확인 — 브라우저 기본 체크 주기(최대 24시간) 기다리지 않도록
  // 어드민 페이지 진입 시마다 한 번 update() 호출. Serwist (skipWaiting + clientsClaim)
  // 라 새 sw.js 받으면 즉시 활성화 → 핸드폰 PWA 가 옛 SW 그대로 도는 케이스 차단.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {});
  }, []);

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo.png"
          alt=""
          aria-hidden="true"
          className="size-7"
        />
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
