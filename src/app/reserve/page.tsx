"use client";

// 예약 페이지 — 공개. 네이버 플레이스 링크로 회원이 본인 휴대폰으로 접속.
// 지점은 URL 파라미터(?branch_id=)로 전달받음. 지점 선택 UI 없음.
// TODO: POST /reservations 예약 신청 폼
export default function ReservePage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">예약 페이지</h1>
      <p className="mt-2 text-sm text-gray-500">셋업 완료 — 신청 폼 구현 예정</p>
    </main>
  );
}
