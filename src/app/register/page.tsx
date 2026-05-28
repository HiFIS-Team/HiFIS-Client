"use client";

import { Suspense, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BoltIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { getBranches } from "@/lib/api/branches";

// 신청서 진입 — 매장 QR 스캔 → ?branch_id=xxx 로 진입.
// 회원가입 / PT 중 선택. 로그인 없음.
// (이전 키오스크 태블릿 흐름 대체 — 사용자 본인 폰에서 작성)
export default function RegisterPage() {
  return (
    <Suspense fallback={<Center>불러오는 중…</Center>}>
      <RegisterEntry />
    </Suspense>
  );
}

function RegisterEntry() {
  const branchId = useSearchParams().get("branch_id");
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  if (!branchId) return <BadQrError />;
  if (branchesQuery.isLoading) return <Center>불러오는 중…</Center>;
  if (branchesQuery.isError) {
    return <Center>지점 정보를 불러오지 못했습니다.</Center>;
  }
  const branch = branchesQuery.data?.find((b) => b.id === branchId);
  if (!branch) return <BadQrError />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo.png"
          alt=""
          aria-hidden="true"
          className="mx-auto size-16"
        />
        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-primary">
            <MapPinIcon className="size-3.5" />
            {branch.name}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          어떤 신청서를 작성하시겠어요?
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          아래 신청서 중 하나를 눌러 주세요.
        </p>
      </header>

      <div className="mt-8 grid gap-4">
        <Choice
          href={`/register/member?branch_id=${branchId}`}
          icon={UserPlusIcon}
          title="회원가입 신청서"
          desc="헬스장 회원권 등록"
        />
        <Choice
          href={`/register/pt?branch_id=${branchId}`}
          icon={BoltIcon}
          title="PT 신청서"
          desc="개인 레슨(PT) 등록"
        />
      </div>
    </main>
  );
}

function Choice({
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
      className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-5 py-5 transition-all hover:border-primary hover:bg-violet-50 active:scale-[0.98]"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-gray-900">{title}</span>
        <span className="block text-sm text-gray-500">{desc}</span>
      </div>
    </Link>
  );
}

// QR 의 branch_id 가 없거나 잘못된 경우 — 매장에 비치된 QR 을 다시 스캔 안내
function BadQrError() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
        <ExclamationTriangleIcon className="size-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-gray-900">
        잘못된 접근입니다
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        매장에 비치된 QR 코드를 다시 스캔해 주세요.
      </p>
    </main>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6 text-center text-sm text-gray-500">
      {children}
    </main>
  );
}
