"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { RenewalForm } from "./RenewalForm";

// 재등록 신청서 — ?branch_id=xxx (매장 QR 스캔)
// 기존 회원이 회원권 만료 후 다시 등록할 때. 기본 개인정보는 변경 X.
export default function RegisterRenewalPage() {
  return (
    <Suspense fallback={<Center>불러오는 중…</Center>}>
      <Entry />
    </Suspense>
  );
}

function Entry() {
  const sp = useSearchParams();
  const branchId = sp.get("branch_id");
  if (!branchId) return <BadQrError />;
  // 신규 신청서(MemberForm/PtForm)에서 같은 전화번호 발견 → 본인 확인 단계 건너뛰도록 prefill.
  const initialName = sp.get("prefill_name") ?? undefined;
  const initialPhone = sp.get("prefill_phone") ?? undefined;
  return (
    <RenewalForm
      branchId={branchId}
      initialName={initialName}
      initialPhone={initialPhone}
    />
  );
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
