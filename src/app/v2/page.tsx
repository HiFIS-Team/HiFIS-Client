import { GlobalHeader } from "./GlobalHeader";

// v2 임시 인덱스 — 지금은 헤더만. 각 화면 붙는 시점에 라우팅 · 본문 채움.
export default function V2Page() {
  return (
    <>
      <GlobalHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <p className="text-sm text-muted">v2 개발 중</p>
        </div>
      </main>
    </>
  );
}
