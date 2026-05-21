import Link from "next/link";

// 개발용 인덱스 — 세 화면 진입점.
// 실제 배포 시 라우팅 정책(키오스크 URL 등)에 맞춰 교체.
export default function Home() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">HiFIS · 피트니스스타</h1>
      <p className="mt-2 text-sm text-gray-500">개발용 인덱스 — 세 화면 진입점</p>
      <ul className="mt-6 space-y-3">
        <li>
          <Link href="/reserve" className="text-blue-600 underline">
            예약 페이지 (공개 · 네이버 플레이스)
          </Link>
        </li>
        <li>
          <Link href="/kiosk" className="text-blue-600 underline">
            신청서 키오스크 (센터 태블릿)
          </Link>
        </li>
        <li>
          <Link href="/admin" className="text-blue-600 underline">
            관리자 대시보드 (로그인)
          </Link>
        </li>
      </ul>
    </main>
  );
}
