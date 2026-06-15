"use client";

import Link from "next/link";
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
import { PasswordChangeDialog } from "../PasswordChangeDialog";
import { PushToggle } from "../PushToggle";

// 헤더 우측 사람 아이콘으로 진입하는 프로필 페이지.
// 사이드바 푸터에 흩어져 있던 항목들을 한 곳으로 모음:
// 비밀번호 변경 / 푸시 알림 / 관리자 관리(SUPER) / 패치 노트 / 로그아웃.
export default function AdminProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { isSuper } = useBranch();
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const [passwordOpen, setPasswordOpen] = useState(false);

  function logout() {
    clearTokens();
    toast.success("로그아웃되었습니다.");
    router.replace("/admin/login");
  }

  const admin = meQuery.data;
  if (!admin) return null;

  return (
    <div>
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
          <MenuLink
            icon={UserGroupIcon}
            label="관리자 관리"
            href="/admin/admins"
          />
        )}
        <MenuLink
          icon={NewspaperIcon}
          label="패치 노트"
          href="/admin/release-notes"
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
    </div>
  );
}

// 메뉴 항목 — 클릭 액션 (다이얼로그·콜백). danger 면 빨강 강조.
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

// 메뉴 항목 — 다른 페이지로 이동.
function MenuLink({
  icon: Icon,
  label,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
    >
      <Icon className="size-5 shrink-0 text-gray-500" />
      <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
      <ChevronRightIcon className="size-4 shrink-0 text-gray-300" />
    </Link>
  );
}
