"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { MemberForm } from "./MemberForm";

// 회원가입 신청서 — ?branch_id=xxx (매장 QR 스캔)
export default function RegisterMemberPage() {
  return (
    <Suspense fallback={<Center>불러오는 중…</Center>}>
      <Entry />
    </Suspense>
  );
}

function Entry() {
  const branchId = useSearchParams().get("branch_id");
  if (!branchId) return <BadQrError />;
  return <MemberForm branchId={branchId} />;
}

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
      <Link
        href="/register"
        className="mt-4 inline-block text-sm text-primary underline underline-offset-2"
      >
        지점 선택 화면으로
      </Link>
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
