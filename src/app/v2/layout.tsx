// v2 트리 셸. globals.css 의 [data-theme="dark"] 스코프 토큰이 이 안에만 적용되도록 wrapper.
// fixed inset-0 + flex-col — iOS 오버스크롤 방지 (v1 admin 과 동일 패턴).
// 자식이 flex-1 로 나머지를 채우고 안쪽에서 스크롤 담당.
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
      {children}
    </div>
  );
}
