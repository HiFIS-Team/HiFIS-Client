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
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import { getCategoryStats } from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";
import { buildMonthOptions, currentMonthYM } from "@/lib/statsMonth";

export default function AdminRegistrationMixPage() {
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

  // "" = 전체 지점. FC는 토큰 기준 자동 분기.
  const [branchFilter, setBranchFilter] = useState("");
  const branchId = isSuper ? branchFilter || undefined : undefined;

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
      <p className="mt-1 text-sm text-gray-500">
        선택한 달 신청 중 신규(NEW) 와 재등록(EXISTING) 비율입니다.
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
        {isSuper && (
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
        )}
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
              title="수강권"
              icon={BoltIcon}
              data={categoryQuery.data.pt}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
