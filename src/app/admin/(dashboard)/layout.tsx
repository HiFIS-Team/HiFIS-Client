"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/api/tokenStore";
import { useHeartbeat } from "@/lib/hooks/useHeartbeat";
import { useNotificationNavigate } from "@/lib/hooks/useNotificationNavigate";
import {
  RELEASE_NOTES,
  semverCompare,
  type ReleaseNote,
} from "@/lib/releaseNotes";
import { ReleaseNotesDialog } from "@/components/ReleaseNotesDialog";
import { BranchProvider } from "@/providers/BranchProvider";
import { Sidebar } from "./Sidebar";
import { GlobalHeader } from "./GlobalHeader";
import { PageTitleProvider } from "./PageTitleProvider";

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

  // 릴리스 노트 모달 — 새 버전 배포 후 어드민 진입 시 "이번 배포" 내역만 안내.
  // 못 본 이전 버전들은 사이드바의 "패치 노트" 페이지에서 언제든 다시 볼 수 있어
  // 모달이 두 버전 이상을 한 번에 쏟아내지 않도록 분리.
  //
  // 동작:
  // - ack 키 없는 새 어드민 → 모달 X, 현재 버전을 silent 저장 (이전 노트는 패치 노트 페이지에서)
  // - lastAcked < current → 현재 버전 노트만 모달로
  // - lastAcked >= current → 모달 X
  //
  // 키 이름이 "hifis-acked-release-version" 인 이유:
  // v1.1.0 초기 배포에 silent-skip 버그가 있어 옛 키로 잠겨버린 LS 를 한 번 초기화한 흔적.
  const ACK_STORAGE_KEY = "hifis-acked-release-version";
  const [pendingNotes, setPendingNotes] = useState<ReleaseNote[] | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = process.env.NEXT_PUBLIC_APP_VERSION;
    if (!current) return;
    const lastAcked = window.localStorage.getItem(ACK_STORAGE_KEY);
    // 새 어드민 — 모달 안 띄우고 현재 버전 저장. 과거 노트는 패치 노트 페이지에서.
    if (!lastAcked) {
      window.localStorage.setItem(ACK_STORAGE_KEY, current);
      return;
    }
    if (semverCompare(current, lastAcked) <= 0) return;
    // 이번 배포 버전 노트만 — 못 본 이전 버전은 패치 노트 페이지에서 확인.
    const currentNote = RELEASE_NOTES.find((n) => n.version === current);
    if (currentNote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingNotes([currentNote]);
    } else {
      // 노트 항목이 없는 버전이면 조용히 저장
      window.localStorage.setItem(ACK_STORAGE_KEY, current);
    }
  }, []);
  function dismissReleaseNotes() {
    const current = process.env.NEXT_PUBLIC_APP_VERSION;
    if (current && typeof window !== "undefined") {
      window.localStorage.setItem(ACK_STORAGE_KEY, current);
    }
    setPendingNotes(null);
  }

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
    <BranchProvider>
    <PageTitleProvider>
    <div className="min-h-screen bg-white lg:flex">
      {/* 모바일 : 위로 헤더 → 아래로 사이드바(드로어) + main 의 vertical 흐름.
          PC   : 좌측 사이드바(전체 높이) + 우측 inner 컨테이너(헤더 + main).
                 sidebar 가 자체 sticky h-screen 이라 lg:flex 만으로 분기 가능. */}
      <Sidebar
        admin={meQuery.data}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <GlobalHeader
          admin={meQuery.data}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        {/* PC : 본문 배경을 옅은 회색으로 — 사이드바/헤더(흰) 와 시각 구분. 모바일은 흰 그대로. */}
        <main className="flex-1 px-4 py-6 lg:bg-gray-50 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
      {pendingNotes && (
        <ReleaseNotesDialog
          notes={pendingNotes}
          onClose={dismissReleaseNotes}
        />
      )}
    </div>
    </PageTitleProvider>
    </BranchProvider>
  );
}
