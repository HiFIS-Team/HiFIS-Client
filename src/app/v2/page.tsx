import { GlobalHeader } from "./GlobalHeader";
import { ProjectTicker } from "./ProjectTicker";

// v2 임시 인덱스 — 지금은 헤더 + 프로젝트 티커만. 각 화면 붙는 시점에 라우팅 · 본문 채움.
export default function V2Page() {
  return (
    <>
      <GlobalHeader />
      <ProjectTicker />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <p className="text-sm text-muted">v2 개발 중</p>
        </div>
      </main>
    </>
  );
}
