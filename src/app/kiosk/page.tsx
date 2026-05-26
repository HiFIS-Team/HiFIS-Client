"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BoltIcon,
  ChevronRightIcon,
  MapPinIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { getBranches } from "@/lib/api/branches";
import {
  clearKioskBranchId,
  getKioskBranchId,
  setKioskBranchId,
} from "@/lib/branch";
import type { Branch } from "@/lib/api/types";

// 신청서 키오스크 진입 — 센터 태블릿 고정, 로그인 없음.
// 지점 미설정이면 지점 설정 화면, 설정됐으면 신청서 선택 화면.
export default function KioskPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // localStorage 는 클라이언트에서만 접근 가능 → 마운트 후 로드
  useEffect(() => {
    setBranchId(getKioskBranchId());
    setLoaded(true);
  }, []);

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  if (!loaded || branchesQuery.isLoading) {
    return <KioskCenter>불러오는 중…</KioskCenter>;
  }
  if (branchesQuery.isError) {
    return (
      <KioskCenter>
        지점 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </KioskCenter>
    );
  }

  const branches = branchesQuery.data ?? [];
  const branch = branchId
    ? (branches.find((b) => b.id === branchId) ?? null)
    : null;

  // 지점 미설정(또는 저장된 지점이 목록에 없음) → 지점 설정 화면
  if (!branch) {
    return (
      <BranchSetup
        branches={branches}
        onPick={(id) => {
          setKioskBranchId(id);
          setBranchId(id);
        }}
      />
    );
  }

  // 지점 설정 완료 → 신청서 선택 화면
  return (
    <KioskHome
      branch={branch}
      onChangeBranch={() => {
        clearKioskBranchId();
        setBranchId(null);
      }}
    />
  );
}

// 지점 최초 설정 — 태블릿이 설치된 지점을 한 번만 선택
function BranchSetup({
  branches,
  onPick,
}: {
  branches: Branch[];
  onPick: (id: string) => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <header className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-primary">
            <MapPinIcon className="size-7" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            지점을 선택해 주세요
          </h1>
          <p className="mt-3 text-base text-gray-500">
            이 태블릿이 설치된 지점을 한 번만 선택하면 됩니다.
          </p>
        </header>
        <div className="mt-10 grid gap-3">
          {branches.length === 0 ? (
            <p className="text-center text-gray-500">등록된 지점이 없습니다.</p>
          ) : (
            branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onPick(b.id)}
                className="group flex items-center justify-between gap-2 rounded-xl border-2 border-gray-200 px-6 py-5 text-xl font-semibold text-gray-900 transition-colors hover:border-primary hover:bg-violet-50"
              >
                <span className="flex items-center gap-3">
                  <MapPinIcon className="size-5 text-gray-400 transition-colors group-hover:text-primary" />
                  {b.name}
                </span>
                <ChevronRightIcon className="size-5 text-gray-400 transition-colors group-hover:text-primary" />
              </button>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

// 신청서 선택 — 회원가입 / PT 중 선택
function KioskHome({
  branch,
  onChangeBranch,
}: {
  branch: Branch;
  onChangeBranch: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-4 py-1.5 text-base font-semibold text-primary">
            <MapPinIcon className="size-4" />
            {branch.name}
          </span>
        </div>

        <header className="mt-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            어떤 신청서를 작성하시겠어요?
          </h1>
          <p className="mt-3 text-base text-gray-500">
            아래 신청서 중 하나를 눌러 주세요.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <KioskChoice
            href="/kiosk/member"
            icon={UserPlusIcon}
            title="회원가입 신청서"
            desc="헬스장 회원권 등록"
          />
          <KioskChoice
            href="/kiosk/pt"
            icon={BoltIcon}
            title="PT 신청서"
            desc="개인 레슨(PT) 등록"
          />
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onChangeBranch}
          className="text-sm text-gray-500 underline underline-offset-2"
        >
          지점 변경
        </button>
      </div>
    </main>
  );
}

function KioskChoice({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center rounded-2xl border-2 border-gray-200 bg-white px-6 py-10 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-violet-50"
    >
      <div className="flex size-20 items-center justify-center rounded-2xl bg-violet-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon className="size-10" />
      </div>
      <span className="mt-5 text-2xl font-bold text-gray-900">{title}</span>
      <span className="mt-2 text-base text-gray-500">{desc}</span>
    </Link>
  );
}

function KioskCenter({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 text-center text-gray-500">
      {children}
    </main>
  );
}
