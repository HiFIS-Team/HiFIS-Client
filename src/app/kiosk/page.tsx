"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          지점을 선택해 주세요
        </h1>
        <p className="mt-2 text-base text-gray-500">
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
              className="rounded-xl border-2 border-gray-200 px-6 py-5 text-xl font-semibold text-gray-900 transition-colors hover:border-primary hover:bg-violet-50"
            >
              {b.name}
            </button>
          ))
        )}
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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="text-center">
        <span className="inline-block rounded-full bg-violet-50 px-4 py-1 text-base font-semibold text-primary">
          {branch.name}
        </span>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          신청서를 선택해 주세요
        </h1>
        <p className="mt-2 text-base text-gray-500">
          작성하실 신청서를 눌러 주세요.
        </p>
      </header>

      <div className="mt-10 grid gap-4">
        <KioskChoice
          href="/kiosk/member"
          title="회원가입 신청서"
          desc="헬스장 회원권 등록"
        />
        <KioskChoice
          href="/kiosk/pt"
          title="PT 신청서"
          desc="개인 레슨(PT) 등록"
        />
      </div>

      <div className="mt-8 text-center">
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
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border-2 border-gray-200 px-6 py-8 transition-colors hover:border-primary hover:bg-violet-50"
    >
      <span className="text-2xl font-bold text-gray-900">{title}</span>
      <span className="mt-1 text-base text-gray-500">{desc}</span>
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
