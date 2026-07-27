"use client";

// 헤더 바로 밑 뉴스티커 — 본인 소속 프로젝트 이름 + D-day.
// 우→좌 흐름. hover 시 정지 (globals.css .animate-marquee).
// 지금은 mock — 백엔드 준비되면 GET /admin/projects/mine 등으로 교체.

interface ProjectItem {
  name: string;
  // 마감까지 남은 일수. 음수면 D+n (기한 지남)
  dday: number;
  // 리딩 dot 색. tailwind 색 유틸리티 (`bg-*`) 그대로 넘김.
  dotClass?: string;
}

const MOCK: ProjectItem[] = [
  { name: "환경 정비 리브랜딩", dday: 12, dotClass: "bg-primary" },
  { name: "PT룸 장비 교체", dday: 20, dotClass: "bg-primary" },
  { name: "여름 회원 이벤트", dday: 45, dotClass: "bg-yellow-400" },
  { name: "FC 평가 항목 개편", dday: 7, dotClass: "bg-primary" },
  { name: "지점 통합 회원권", dday: 60, dotClass: "bg-red-500" },
];

function formatDday(n: number) {
  if (n === 0) return "D-day";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

export function ProjectTicker() {
  const items = MOCK;
  if (items.length === 0) return null;

  return (
    <div className="h-9 shrink-0 overflow-hidden border-b border-line bg-surface">
      <div className="animate-marquee flex h-full w-max items-center whitespace-nowrap">
        {/* 두 번 렌더 — seamless loop 을 위한 duplicate. aria-hidden 으로 스크린리더 중복 방지. */}
        <TickerRow items={items} />
        <TickerRow items={items} ariaHidden />
      </div>
    </div>
  );
}

function TickerRow({
  items,
  ariaHidden,
}: {
  items: ProjectItem[];
  ariaHidden?: boolean;
}) {
  return (
    <ul
      className="flex items-center gap-8 pr-8"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((p, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <span
            className={`size-1.5 shrink-0 rounded-full ${p.dotClass ?? "bg-primary"}`}
            aria-hidden
          />
          <span className="text-fg">{p.name}</span>
          <span className="font-bold text-primary">{formatDday(p.dday)}</span>
        </li>
      ))}
    </ul>
  );
}
