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
import { MobileTabBar } from "./MobileTabBar";
import { SubTabBar } from "./SubTabBar";
import { MobileSubPage } from "./MobileSubPage";
import { ProfileBody } from "./profile/ProfileBody";
import { NotificationsBody } from "./NotificationBell";

// 관리자 대시보드 셸 — 로그인 확인 후 사이드바 + 본문.
// 모바일: 햄버거 + 슬라이드 드로어. 데스크탑(lg+): sticky 사이드바.
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  // 모바일 프로필 / 알림 오버레이 — 헤더 사람·벨 아이콘 누르면 state on,
  // MobileSubPage 가 fixed inset-0 z-50 으로 현재 페이지 위에 슬라이드 인.
  // 라우트 push 대신 state 로 가는 이유 : parent 페이지가 unmount 되면 슬라이드
  // 인/아웃 동안 뒤가 흰 배경으로 보이게 됨. state 면 parent 그대로 mount 유지.
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

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
      {/* 모바일 : 헤더 → 콘텐츠 → 하단 탭바 vertical 흐름 (사이드바 미표시).
          PC    : 좌측 사이드바(전체 높이) + 우측 inner 컨테이너(헤더 + 콘텐츠).
                  Sidebar 자체가 hidden lg:flex 라 모바일에선 자동 비표시. */}
      <Sidebar admin={meQuery.data} />
      {/* 모바일 GlobalHeader 가 fixed top-0 이라 flow 에서 빠져 있어 첫 in-flow 자식
          (SubTabBar 또는 main) 이 헤더 뒤에 깔리지 않게 컬럼에 padding-top 줌.
          PC 는 sticky 헤더가 flow 안이라 padding 불필요. */}
      <div className="flex min-w-0 flex-1 flex-col pt-[44px] lg:pt-0">
        <GlobalHeader
          admin={meQuery.data}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenNotifications={() => setNotificationOpen(true)}
        />
        {/* 모바일 전용 상단 서브탭 — 현재 그룹의 하위 페이지들을 한 줄로. */}
        <SubTabBar />
        {/* PC : 본문 배경 옅은 회색 + 페이지 콘텐츠 전체를 흰 카드로 감싸 사이드바/헤더(흰) 와 톤 통일.
            모바일은 wrap 의 lg: 클래스가 적용 안 돼 기존처럼 흰 배경 + 평면.
            overflow-x-clip : translateX 슬라이드 인 애니메이션이 잠깐 카드를
            화면 오른쪽 밖으로 밀어내는데, 그게 body 가로 스크롤바를 만들어
            세로 뷰포트가 잠깐 줄어들고 → fixed bottom-0 인 MobileTabBar 가
            스크롤바 높이만큼 아래로 내려갔다 올라오는 현상이 있었다. */}
        <main className="flex-1 overflow-x-clip pb-20 lg:bg-gray-50 lg:pb-0">
          <div className="px-4 py-6 lg:m-6 lg:rounded-xl lg:border lg:border-gray-200 lg:bg-white lg:p-8">
            {children}
          </div>
        </main>
        {/* 모바일 전용 하단 5탭 — PC 는 lg:hidden 으로 숨고 기존 사이드바가 보임. */}
        <MobileTabBar />
      </div>
      {pendingNotes && (
        <ReleaseNotesDialog
          notes={pendingNotes}
          onClose={dismissReleaseNotes}
        />
      )}
      {/* 모바일 프로필 오버레이 — 헤더 사람 아이콘 → MobileSubPage 가 현재
          페이지 위에 슬라이드 인. parent 페이지(대시보드 등) 가 그대로 mount
          상태라 뒤에서 보이고, ← 누르면 슬라이드 아웃 후 unmount. */}
      {profileOpen && (
        <MobileSubPage
          title="내 정보"
          onClose={() => setProfileOpen(false)}
        >
          <ProfileBody />
        </MobileSubPage>
      )}
      {/* 모바일 알림 오버레이 — 헤더 알림 벨 → 동일하게 MobileSubPage 슬라이드 인.
          항목 클릭 시 onItemClick 으로 즉시 close (애니메이션 생략) + router.push.
          PC 는 NotificationBell 자체 dropdown 이라 여기 도달하지 않음. */}
      {notificationOpen && (
        <MobileSubPage
          title="알림"
          onClose={() => setNotificationOpen(false)}
        >
          <NotificationsBody onItemClick={() => setNotificationOpen(false)} />
        </MobileSubPage>
      )}
    </div>
    </PageTitleProvider>
    </BranchProvider>
  );
}
