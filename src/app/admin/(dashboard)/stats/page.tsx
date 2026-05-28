"use client";

import { PageTitle } from "../PageTitle";
import { useState, type ComponentType } from "react";
import {
  BuildingOffice2Icon,
  ChatBubbleBottomCenterTextIcon,
  FlagIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
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

// 막대 그래프 형태의 통계 블록 (차트 라이브러리 없이)
function StatChart({
  title,
  data,
  icon: Icon,
}: {
  title: string;
  data: StatsResponse;
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
    <section className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
          {Icon && <Icon className="size-4 text-primary" />}
          {title}
        </h2>
        <span className="text-sm text-gray-500">총 {total}건</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          기타에 직접 입력된 항목이 없습니다.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.label}>
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
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    enabled: isSuper,
  });

  // "" = 전체 지점. FC는 토큰 기준으로 자동 분기되므로 미사용.
  const [branchFilter, setBranchFilter] = useState("");
  const branchId = isSuper ? branchFilter || undefined : undefined;

  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });

  const referralQuery = useQuery({
    queryKey: ["admin", "stats", "referral", branchId ?? "all"],
    queryFn: () => getReferralStats(branchId),
    // 지점 변경 시 깜빡임 방지
    placeholderData: keepPreviousData,
  });
  const motivationQuery = useQuery({
    queryKey: ["admin", "stats", "motivation", branchId ?? "all"],
    queryFn: () => getMotivationStats(branchId),
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
      <PageTitle title="통계" />
      <p className="mt-1 text-sm text-gray-500">
        이번 달 신청 기준 집계입니다.
      </p>

      {isSuper && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
          <Select
            id="branch"
            label="지점"
            icon={BuildingOffice2Icon}
            options={[
              { value: "", label: "전체 지점" },
              ...(branchesQuery.data ?? []).map((b) => ({
                value: b.id,
                label: b.name,
              })),
            ]}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          />
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : isError ? (
          <p className="text-sm text-gray-500">통계를 불러오지 못했습니다.</p>
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
