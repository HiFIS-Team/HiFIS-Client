"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import {
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  ChevronRightIcon,
  KeyIcon,
  NewspaperIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { clearTokens } from "@/lib/api/tokenStore";
import { useToast } from "@/providers/ToastProvider";
import { useBranch } from "@/providers/BranchProvider";
import { adminRoleLabel } from "@/lib/format";
import { PageTitle } from "../PageTitle";
import { MobileSubPage } from "../MobileSubPage";
import { PasswordChangeDialog } from "../PasswordChangeDialog";
import { PushToggle } from "../PushToggle";
import { AdminsContent } from "../admins/AdminsContent";
import { ReleaseNotesContent } from "../release-notes/ReleaseNotesContent";

// 인라인 패널로 띄울 수 있는 서브 페이지 — 모바일에서만 사용.
// PC 는 사이드바에서 직접 해당 라우트로 이동.
type SubPanel = "admins" | "release-notes";

const SUB_PANEL_TITLE: Record<SubPanel, string> = {
  admins: "관리자 관리",
  "release-notes": "패치 노트",
};
const SUB_PANEL_ROUTE: Record<SubPanel, string> = {
  admins: "/admin/admins",
  "release-notes": "/admin/release-notes",
};

// 프로필 화면의 실제 내용 — MobileSubPage wrapper 와 분리.
// 라우트(/admin/profile) 와 layout 오버레이 양쪽에서 사용.
//   - 라우트: profile/page.tsx 가 MobileSubPage 로 감쌈 (PC sidebar 진입 케이스).
//   - 오버레이: layout 의 헤더 사람 아이콘 → state 로 MobileSubPage onClose 와 함께
//     렌더. parent 페이지 (대시보드 등) 가 그대로 mount 상태라 슬라이드 인/아웃
//     동안 뒤가 보임.
export function ProfileBody() {
  const router = useRouter();
  const toast = useToast();
  const { isSuper } = useBranch();
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const [passwordOpen, setPasswordOpen] = useState(false);
  // 모바일 인라인 패널 — 프로필 위에 슬라이드 인 (parent profile 그대로 mount)
  const [subPanel, setSubPanel] = useState<SubPanel | null>(null);

  function logout() {
    clearTokens();
    toast.success("로그아웃되었습니다.");
    router.replace("/admin/login");
  }

  // 모바일 : state 로 인라인 패널 띄움 (parent 가 유지되니 슬라이드 인/아웃 동안 뒤가 보임)
  // PC     : 그냥 라우트 push — 인라인 패널은 lg:hidden 가정
  function openSubPage(panel: SubPanel) {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) router.push(SUB_PANEL_ROUTE[panel]);
    else setSubPanel(panel);
  }

  const admin = meQuery.data;
  if (!admin) return null;

  return (
    <>
      <PageTitle title="내 정보" />

      {/* 사용자 정보 카드 — 아바타(이니셜) + 이름 + 역할 */}
      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {admin.name.charAt(0) || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight text-gray-900">
              {admin.name}
            </p>
            <p className="text-sm text-gray-500">{adminRoleLabel(admin)}</p>
          </div>
        </div>
      </section>

      {/* 운영 메뉴 */}
      <section className="mt-5 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <MenuButton
          icon={KeyIcon}
          label="비밀번호 변경"
          onClick={() => setPasswordOpen(true)}
        />
        {/* 푸시 알림 토글 — PushToggle 컴포넌트가 자체 ON/OFF 처리 */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <BellIcon className="size-5 shrink-0 text-gray-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">푸시 알림</p>
            <p className="mt-0.5 text-xs text-gray-500">
              새 신청·예약 등 도착 시 푸시로 알림
            </p>
          </div>
          <PushToggle />
        </div>
        {isSuper && (
          <MenuButton
            icon={UserGroupIcon}
            label="관리자 관리"
            onClick={() => openSubPage("admins")}
          />
        )}
        <MenuButton
          icon={NewspaperIcon}
          label="패치 노트"
          onClick={() => openSubPage("release-notes")}
        />
      </section>

      {/* 로그아웃 — 별도 섹션 분리해 강조 */}
      <section className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <MenuButton
          icon={ArrowRightStartOnRectangleIcon}
          label="로그아웃"
          onClick={logout}
          danger
        />
      </section>

      {passwordOpen && (
        <PasswordChangeDialog onClose={() => setPasswordOpen(false)} />
      )}

      <p className="mt-8 text-center text-[10px] text-gray-400">
        v{process.env.NEXT_PUBLIC_APP_VERSION}
        {process.env.NEXT_PUBLIC_APP_ENV === "dev" && (
          <span className="ml-1 text-gray-300">(dev)</span>
        )}
      </p>

      {/* 모바일 인라인 서브 패널 — fixed inset-0 z-50 로 프로필 위에 슬라이드 인.
          profile 의 MobileSubPage 가 그대로 mount 상태라 진입·종료 애니메이션
          내내 뒤가 보임 (iOS 네비 스택 톤). PC 에선 openSubPage 가 router.push
          로 분기하므로 여기 도달하지 않음. */}
      {subPanel && (
        <MobileSubPage
          title={SUB_PANEL_TITLE[subPanel]}
          onClose={() => setSubPanel(null)}
        >
          {subPanel === "admins" && <AdminsContent />}
          {subPanel === "release-notes" && <ReleaseNotesContent />}
        </MobileSubPage>
      )}
    </>
  );
}

// 메뉴 항목 — 클릭 액션 (다이얼로그·콜백·서브 패널). danger 면 빨강 강조.
function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
    >
      <Icon
        className={`size-5 shrink-0 ${danger ? "text-red-500" : "text-gray-500"}`}
      />
      <span
        className={`flex-1 text-sm font-medium ${danger ? "text-red-600" : "text-gray-900"}`}
      >
        {label}
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-gray-300" />
    </button>
  );
}
