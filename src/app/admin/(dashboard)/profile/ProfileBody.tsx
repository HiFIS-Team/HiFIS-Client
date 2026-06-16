"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import {
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
  EnvelopeIcon,
  KeyIcon,
  NewspaperIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { clearTokens } from "@/lib/api/tokenStore";
import { useToast } from "@/providers/ToastProvider";
import { useBranch } from "@/providers/BranchProvider";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { adminRoleLabel } from "@/lib/format";
import { branchShortName } from "@/components/BranchPicker";
import { Switch } from "@/components/Switch";
import { PageTitle } from "../PageTitle";
import { MobileSubPage } from "../MobileSubPage";
import { PasswordChangeDialog } from "../PasswordChangeDialog";
import { AdminsContent } from "../admins/AdminsContent";
import { BranchesContent } from "../branches/BranchesContent";
import { ReleaseNotesContent } from "../release-notes/ReleaseNotesContent";

// 인라인 패널로 띄울 수 있는 서브 페이지 — 모바일에서만 사용.
// PC 는 사이드바에서 직접 해당 라우트로 이동.
type SubPanel = "admins" | "branches" | "release-notes";

const SUB_PANEL_TITLE: Record<SubPanel, string> = {
  admins: "관리자 관리",
  branches: "지점 관리",
  "release-notes": "패치 노트",
};
const SUB_PANEL_ROUTE: Record<SubPanel, string> = {
  admins: "/admin/admins",
  branches: "/admin/branches",
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
  const { isSuper, branches } = useBranch();
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const [passwordOpen, setPasswordOpen] = useState(false);
  // 모바일 인라인 패널 — 프로필 위에 슬라이드 인 (parent profile 그대로 mount)
  const [subPanel, setSubPanel] = useState<SubPanel | null>(null);

  // 푸시 알림 — usePushNotifications 훅 직접 사용해 인라인 Switch 토글로.
  // (이전 PushToggle 풀-width 버튼 → 메뉴 행에 자연스럽게 녹는 토글로 교체)
  const push = usePushNotifications();
  const pushBlocked = push.permission === "denied";

  async function togglePush(next: boolean) {
    try {
      if (next) {
        await push.enable();
        toast.success("푸시 알림이 켜졌습니다.");
      } else {
        await push.disable();
        toast.success("푸시 알림이 꺼졌습니다.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "푸시 알림 설정 실패");
    }
  }

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

  // 카드 안에 노출할 지점 — FC 는 본인 지점, SUPER_ADMIN 은 "전 지점".
  const ownBranch = admin.branch_id
    ? branches.find((b) => b.id === admin.branch_id)
    : null;
  const branchLabel = ownBranch
    ? branchShortName(ownBranch.name)
    : isSuper
      ? "전 지점"
      : null;

  return (
    <>
      <PageTitle title="내 정보" />

      {/* 사용자 정보 카드 — 아바타(이니셜) + 이름 + 역할 칩.
          살짝 보라 글로우 + 배경 그라데이션 hint 로 hero 카드 톤. */}
      <section className="mt-6 overflow-hidden rounded-xl border border-line bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-lg shadow-primary/10">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-2xl font-bold text-white shadow-lg shadow-primary/40 ring-2 ring-primary/20">
            {admin.name.charAt(0) || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-black tracking-tight text-fg">
              {admin.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-primary bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {adminRoleLabel(admin)}
              </span>
              {branchLabel && (
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <BuildingOffice2Icon className="size-3.5" />
                  {branchLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 운영 메뉴 */}
      <section className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
        {/* 이메일 — info row. 클릭 액션 없음, 값만 노출. */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <EnvelopeIcon className="size-5 shrink-0 text-muted" />
          <span className="shrink-0 text-sm font-medium text-fg">이메일</span>
          <span className="min-w-0 flex-1 truncate text-right text-sm text-muted">
            {admin.email}
          </span>
        </div>
        <MenuButton
          icon={KeyIcon}
          label="비밀번호 변경"
          onClick={() => setPasswordOpen(true)}
        />
        {/* 푸시 알림 토글 — 인라인 Switch. supported 가 false 인 환경
            (브라우저 자체 불가) 에선 행 통째로 숨김. */}
        {push.supported && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <BellIcon className="size-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">푸시 알림</p>
              <p className="mt-0.5 text-xs text-muted">
                {pushBlocked
                  ? "브라우저 설정에서 알림 허용이 필요해요"
                  : "새 신청·예약 등 도착 시 푸시로 알림"}
              </p>
            </div>
            <Switch
              checked={push.subscribed}
              disabled={push.isBusy || pushBlocked}
              onChange={togglePush}
              ariaLabel="푸시 알림 토글"
            />
          </div>
        )}
        {isSuper && (
          <MenuButton
            icon={UserGroupIcon}
            label="관리자 관리"
            onClick={() => openSubPage("admins")}
          />
        )}
        {/* 지점 관리 — SUPER 전용. 관리자 관리·패치 노트와 동일하게 inline 패널 (모바일)
            또는 라우트 push (PC). 선택된 지점 1 건의 정보만 노출. */}
        {isSuper && (
          <MenuButton
            icon={BuildingOffice2Icon}
            label="지점 관리"
            onClick={() => openSubPage("branches")}
          />
        )}
        <MenuButton
          icon={NewspaperIcon}
          label="패치 노트"
          onClick={() => openSubPage("release-notes")}
        />
      </section>

      {/* 로그아웃 — 별도 섹션 분리해 강조 */}
      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
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

      <p className="mt-8 text-center text-[10px] text-muted">
        v{process.env.NEXT_PUBLIC_APP_VERSION}
        {process.env.NEXT_PUBLIC_APP_ENV === "dev" && (
          <span className="ml-1 opacity-60">(dev)</span>
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
          {subPanel === "branches" && <BranchesContent />}
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
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-card-hover"
    >
      <Icon
        className={`size-5 shrink-0 ${danger ? "text-red-400" : "text-muted"}`}
      />
      <span
        className={`flex-1 text-sm font-medium ${danger ? "text-red-400" : "text-fg"}`}
      >
        {label}
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted opacity-50" />
    </button>
  );
}

