"use client";

// 관리자 대시보드 — 로그인 필요. 권한 분기(SUPER_ADMIN / FC).
// 토큰은 localStorage, 401 재발급은 API 래퍼에서 일괄 처리.
// TODO: 로그인 화면 → 대시보드
export default function AdminPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>
      <p className="mt-2 text-sm text-gray-500">셋업 완료 — 로그인 구현 예정</p>
    </main>
  );
}
