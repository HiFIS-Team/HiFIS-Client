"use client";

import { PageTitle } from "../PageTitle";
import { useState } from "react";
import { BuildingOffice2Icon, ClockIcon } from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
import { getMembershipExpiryStats } from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";

export default function AdminMembershipExpiryPage() {
  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId } = useBranch();

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

      {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 필터 없음. */}

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
