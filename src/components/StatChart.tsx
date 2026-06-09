import type { ComponentType } from "react";
import type { StatItem } from "@/lib/api/stats";

// 막대 그래프 형태의 통계 블록 (차트 라이브러리 없이).
// data 는 items + total 만 필요 — 유입/방문 통계와 상품 판매 통계 모두 재사용.
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
      {data.items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">데이터가 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {data.items.map((item) => {
            const pct =
              data.total > 0
                ? Math.round((item.count / data.total) * 100)
                : 0;
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
      )}
    </section>
  );
}
