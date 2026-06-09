import type { ComponentType } from "react";
import type { StatItem } from "@/lib/api/stats";

// 항목 막대 리스트 본체 (헤더·테두리 없음).
// 탭 안 등에서 막대만 깔끔하게 보여주고 싶을 때 직접 사용.
export function StatBars({
  items,
  total,
}: {
  items: StatItem[];
  total: number;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.code}>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">{item.label}</span>
              <span className="text-gray-500">
                {item.count}건 · {pct}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 막대 그래프 형태의 통계 블록 (차트 라이브러리 없이).
// data 는 items + total 만 필요 — 유입/방문 통계에서 사용.
export function StatChart({
  title,
  data,
  icon: Icon,
}: {
  title: string;
  data: { items: StatItem[]; total: number };
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
          {Icon && <Icon className="size-4 text-primary" />}
          {title}
        </h2>
        <span className="text-sm text-gray-500">총 {data.total}건</span>
      </div>
      <div className="mt-4">
        <StatBars items={data.items} total={data.total} />
      </div>
    </section>
  );
}
