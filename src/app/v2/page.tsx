import { GlobalHeader } from "./GlobalHeader";
import { ProjectTicker } from "./ProjectTicker";
import { HomeCards } from "./HomeCards";

// v2 홈 — 헤더 + 티커 + 하단 카드 3장 (바코드 · 인사 · 오늘 근무).
export default function V2Page() {
  return (
    <>
      <GlobalHeader />
      <ProjectTicker />
      <main className="flex-1 overflow-y-auto">
        <HomeCards />
      </main>
    </>
  );
}
