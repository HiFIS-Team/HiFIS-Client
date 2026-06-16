"use client";

import { PageTitle } from "../PageTitle";
import { useMemo, useState, type ComponentType } from "react";
import {
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  FlagIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
import {
  getMotivationStats,
  getReferralStats,
  type StatDetailItem,
  type StatsResponse,
} from "@/lib/api/stats";
import { getEnums } from "@/lib/api/enums";
import type { EnumOption } from "@/lib/api/types";
import { aggregateReferralDetails } from "@/lib/referral";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";
import { buildMonthOptions, currentMonthYM } from "@/lib/statsMonth";

// 자유 입력 항목(referral_detail) 별 카운트 — enum 차트와 별개 섹션.
// 백엔드가 "기타" 선택 후 자유 입력된 텍스트들을 집계해 내려준다.
function StatDetailChart({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: StatDetailItem[];
  icon?: ComponentType<{ className?: string }>;
}) {
  const total = items.reduce((sum, x) => sum + x.count, 0);
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-fg">
          {Icon && <Icon className="size-4 text-primary" />}
          {title}
        </h2>
        <span className="text-sm text-muted">총 {total}건</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          기타에 직접 입력된 항목이 없습니다.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-fg">{item.label}</span>
                  <span className="text-muted">
                    {item.count}건 · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-card-hover">
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

// 서버 응답에 빠진 enum 옵션을 0건으로 채워 전체 항목을 보여준다.
// (백엔드가 0건은 응답에서 생략하더라도 차트에 모두 노출되게)
function fillWithEnum(
  data: StatsResponse,
  options: EnumOption[],
): StatsResponse {
  const existing = new Set(data.items.map((x) => x.code));
  const missing = options
    .filter((o) => !existing.has(o.code))
    .map((o) => ({ code: o.code, label: o.label, count: 0 }));
  return { ...data, items: [...data.items, ...missing] };
}

export default function AdminStatsPage() {
  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId } = useBranch();

  // 월 필터 — 기본값 이번 달. 최근 12개월 옵션.
  const [month, setMonth] = useState<string>(currentMonthYM);
  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });

  const referralQuery = useQuery({
    queryKey: ["admin", "stats", "referral", branchId ?? "all", month],
    queryFn: () => getReferralStats(branchId, month),
    // 지점·월 변경 시 깜빡임 방지
    placeholderData: keepPreviousData,
  });
  const motivationQuery = useQuery({
    queryKey: ["admin", "stats", "motivation", branchId ?? "all", month],
    queryFn: () => getMotivationStats(branchId, month),
    placeholderData: keepPreviousData,
  });

  const isLoading =
    enumsQuery.isLoading ||
    referralQuery.isLoading ||
    motivationQuery.isLoading;
  const isError =
    enumsQuery.isError || referralQuery.isError || motivationQuery.isError;

  return (
    <div>
      <PageTitle title="유입·방문" />
      <p className="hidden">
        선택한 달 신청 기준 집계입니다.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
        <Select
          id="month"
          label="월"
          icon={CalendarDaysIcon}
          options={monthOptions}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 월 셀렉터만. */}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : isError ? (
          <p className="text-sm text-muted">통계를 불러오지 못했습니다.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <StatChart
              title="유입 경로"
              icon={MegaphoneIcon}
              data={fillWithEnum(
                referralQuery.data!,
                enumsQuery.data!.referral,
              )}
            />
            <StatChart
              title="방문 목적"
              icon={FlagIcon}
              data={fillWithEnum(
                motivationQuery.data!,
                enumsQuery.data!.motivation,
              )}
            />
            {/* 기타 세부 입력 — "기타" 선택 시 자유 입력된 텍스트별 집계.
                enum 라벨이 포함된 입력들은 같은 라벨로 합산 ("블로그를 보고 방문" → "블로그").
                항목 없으면 차트 숨김. */}
            {referralQuery.data!.details.length > 0 && (
              <StatDetailChart
                title="유입 경로 — 기타 세부 입력"
                icon={ChatBubbleBottomCenterTextIcon}
                items={aggregateReferralDetails(
                  referralQuery.data!.details,
                  enumsQuery.data!.referral,
                )}
              />
            )}
          </div>
        )}
      </div>

    </div>
  );
}
