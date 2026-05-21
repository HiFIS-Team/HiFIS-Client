"use client";

// 신청서 키오스크 진입 — 센터 태블릿 고정, 로그인 없음, 전체화면(PWA).
// 회원가입 신청서 / PT 신청서 중 선택. 지점은 localStorage branch_id.
// TODO: 지점 최초 설정 + 둘 중 선택 화면
export default function KioskPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">신청서 키오스크</h1>
      <p className="mt-2 text-sm text-gray-500">셋업 완료 — 진입 화면 구현 예정</p>
    </main>
  );
}
