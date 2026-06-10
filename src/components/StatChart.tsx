"use client";

import { useState, type ComponentType } from "react";
import type { StatItem } from "@/lib/api/stats";
import { formatWon } from "@/lib/format";

// 항목 막대 리스트 본체 (헤더·테두리 없음).
// 탭 안 등에서 막대만 깔끔하게 보여주고 싶을 때 직접 사용.
// item.revenue 있으면 (상품별 판매) :
//   - 라벨 옆 괄호에 평균가(revenue / count) 표시
//   - 막대 row 클릭 시 펼침 → 매출(합산) 한 줄 추가
export function StatBars({
  items,
  total,
}: {
  items: StatItem[];
  total: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        const hasRevenue = item.revenue != null && item.count > 0;
        const avg = hasRevenue
          ? Math.round(item.revenue! / item.count)
          : null;
        const isExpanded = expanded.has(item.code);
        // 클릭 가능한 row 는 button, 아니면 div — 일관된 시각·접근성.
        const Row = hasRevenue ? "button" : "div";
        return (
          <div key={item.code}>
            <Row
              {...(hasRevenue
                ? {
                    type: "button" as const,
                    onClick: () => toggle(item.code),
                  }
                : {})}
              className={`block w-full text-left ${
                hasRevenue
                  ? "cursor-pointer transition-opacity hover:opacity-80"
                  : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-gray-700">
                  {item.label}
                  {avg != null && (
                    <span className="ml-1 text-gray-400">
                      ({formatWon(avg)})
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-gray-500">
                  {item.count}건 · {pct}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Row>
            {hasRevenue && isExpanded && (
              <p className="mt-1 text-right text-xs text-gray-500">
                매출 {formatWon(item.revenue!)}
              </p>
            )}
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
