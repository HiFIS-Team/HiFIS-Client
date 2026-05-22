"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getKioskBranchId } from "@/lib/branch";
import { MemberForm } from "./MemberForm";

// 회원가입 신청서 — 지점은 키오스크 localStorage 에서 가져온다.
export default function KioskMemberPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBranchId(getKioskBranchId());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center text-gray-500">
        불러오는 중…
      </main>
    );
  }

  if (!branchId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">
          지점 설정이 필요합니다
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          키오스크 첫 화면에서 지점을 먼저 설정해 주세요.
        </p>
        <Link
          href="/kiosk"
          className="mt-4 inline-block text-sm text-primary underline underline-offset-2"
        >
          키오스크 처음으로
        </Link>
      </main>
    );
  }

  return <MemberForm branchId={branchId} />;
}
