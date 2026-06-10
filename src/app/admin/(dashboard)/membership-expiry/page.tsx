"use client";

import { PageTitle } from "../PageTitle";
import { useMemo, useState } from "react";
import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
import { getMembershipExpiryStats } from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";
import {
  buildFutureMonthOptions,
  currentMonthYM,
} from "@/lib/statsMonth";

export default function AdminMembershipExpiryPage() {
  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId } = useBranch();

  // 월 셀렉터 — 기본값 이번 달. 향후 12개월 옵션 (미래 시점 시뮬레이션).
  const [month, setMonth] = useState<string>(currentMonthYM);
  const monthOptions = useMemo(() => buildFutureMonthOptions(12), []);

  const expiryQuery = useQuery({
    queryKey: ["admin", "stats", "membership-expiry", branchId ?? "all", month],
    queryFn: () => getMembershipExpiryStats(branchId, month),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageTitle title="잔여 기간" />
      <p className="mt-1 text-sm text-gray-500">
        선택한 달 시점에 유효한 회원들의 잔여 기간 분포입니다. 미래 달을
        고르면 그 시점 시뮬레이션 (이미 만료된 회원 제외).
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-md">
        <Select
          id="month"
          label="기준 월"
          icon={CalendarDaysIcon}
          options={monthOptions}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {expiryQuery.isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : expiryQuery.isError ? (
          <p className="text-sm text-gray-500">
            잔여 기간 통계를 불러오지 못했습니다.
          </p>
        ) : expiryQuery.data ? (
          <div className="sm:max-w-xl">
            <StatChart
              title="잔여 기간 분포"
              icon={ClockIcon}
              data={expiryQuery.data}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
