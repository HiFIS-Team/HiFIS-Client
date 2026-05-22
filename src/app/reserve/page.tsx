import { Suspense } from "react";
import { ReserveForm } from "./ReserveForm";

// 예약 페이지 — 공개. 네이버 플레이스 링크로 회원이 본인 휴대폰으로 접속.
// 지점은 URL 파라미터(?branch_id=)로 전달받음.
// useSearchParams 사용 → 정적 export 에선 Suspense 경계 필요.
export default function ReservePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-6 py-16 text-center text-gray-500">
          불러오는 중…
        </main>
      }
    >
      <ReserveForm />
    </Suspense>
  );
}
