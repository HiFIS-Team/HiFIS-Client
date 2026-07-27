import { MobileTabBar } from "./MobileTabBar";

// v2 트리 셸. globals.css 의 [data-theme="dark"] 스코프 토큰이 이 안에만 적용되도록 wrapper.
// fixed inset-0 + flex-col — iOS 오버스크롤 방지 (v1 admin 과 동일 패턴).
// children 은 min-h-0 로 감싸 안쪽에서만 스크롤. 하단에 MobileTabBar (모바일 전용).
// PC 셸(사이드바 등) 은 디자인 확정 후 추가.
export default function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="dark"
      className="fixed inset-0 flex flex-col bg-surface text-fg"
    >
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MobileTabBar />
    </div>
  );
}
