"use client";

import { PageTitle } from "../PageTitle";
import { useMemo, useState } from "react";
import {
  BoltIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
import { getCategoryStats } from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";
import { buildMonthOptions, currentMonthYM } from "@/lib/statsMonth";

export default function AdminRegistrationMixPage() {
  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId } = useBranch();

  const [month, setMonth] = useState<string>(currentMonthYM);
  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  const categoryQuery = useQuery({
    queryKey: ["admin", "stats", "category", branchId ?? "all", month],
    queryFn: () => getCategoryStats(branchId, month),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageTitle title="신규·재등록" />
      <p className="mt-1 text-sm text-gray-500 lg:hidden">
        선택한 달 신청 중 신규와 재등록 비율입니다.
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
        {categoryQuery.isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : categoryQuery.isError ? (
          <p className="text-sm text-gray-500">
            통계를 불러오지 못했습니다.
          </p>
        ) : categoryQuery.data ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <StatChart
              title="회원"
              icon={UsersIcon}
              data={categoryQuery.data.member}
            />
            <StatChart
              title="PT"
              icon={BoltIcon}
              data={categoryQuery.data.pt}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
