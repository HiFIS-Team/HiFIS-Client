"use client";

import { PageTitle } from "../PageTitle";
import { useState } from "react";
import { BuildingOffice2Icon, ClockIcon } from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import { getMembershipExpiryStats } from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";

export default function AdminMembershipExpiryPage() {
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

  // 오늘 시점 스냅샷이라 월 필터 없음. 지점 필터만.
  const expiryQuery = useQuery({
    queryKey: ["admin", "stats", "membership-expiry", branchId ?? "all"],
    queryFn: () => getMembershipExpiryStats(branchId),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageTitle title="잔여 기간" />
      <p className="mt-1 text-sm text-gray-500">
        오늘 시점 유효 회원의 회원권 잔여 기간 분포입니다.
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
