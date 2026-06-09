"use client";

import { PageTitle } from "../PageTitle";
import { useMemo, useState, type ComponentType } from "react";
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  KeyIcon,
  SparklesIcon,
  TicketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import {
  getPassSalesStats,
  type PassSalesResponse,
  type StatItem,
} from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";
import { buildMonthOptions, currentMonthYM } from "@/lib/statsMonth";

// 4종(회원권/PT/락커/운동복) 탭 전환. 한 번에 한 차트만 보여 화면을 짧게 유지.
// 탭 라벨 옆에 그 종류의 총 건수를 같이 표시해 4종 비교는 탭 줄에서 한 번에.
function PassSalesTabs({ data }: { data: PassSalesResponse }) {
  type TabKey = "membership" | "pt" | "locker" | "clothes";
  const tabs: {
    key: TabKey;
    label: string;
    icon: ComponentType<{ className?: string }>;
    data: { items: StatItem[]; total: number };
  }[] = [
    { key: "membership", label: "회원권", icon: TicketIcon, data: data.membership },
    { key: "pt", label: "PT", icon: UserIcon, data: data.pt },
    { key: "locker", label: "락커", icon: KeyIcon, data: data.locker },
    { key: "clothes", label: "운동복", icon: SparklesIcon, data: data.clothes },
  ];
  const [active, setActive] = useState<TabKey>("membership");
  const activeTab = tabs.find((t) => t.key === active)!;

  return (
    <div>
      <div className="flex gap-4 overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => {
          const isActive = t.key === active;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
              <span
                className={`text-xs ${
                  isActive ? "text-primary/80" : "text-gray-500"
                }`}
              >
                {t.data.total}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <StatChart
          title={activeTab.label}
          icon={activeTab.icon}
          data={activeTab.data}
        />
      </div>
    </div>
  );
}

export default function AdminPassSalesPage() {
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

  // 상품별 판매는 지점별 의미가 강해서 "전체 지점" 옵션을 두지 않음.
  // SUPER_ADMIN 기본값은 화순점(이름에 "화순" 포함). 없으면 첫 지점으로 폴백.
  // FC 는 토큰 기준으로 백엔드가 본인 지점만 내려줘서 셀렉터 자체를 숨김.
  const [branchFilter, setBranchFilter] = useState("");
  const branches = branchesQuery.data ?? [];
  const defaultBranch =
    branches.find((b) => b.name.includes("화순")) ?? branches[0];
  const branchId = isSuper ? branchFilter || defaultBranch?.id : undefined;

  const [month, setMonth] = useState<string>(currentMonthYM);
  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  const passSalesQuery = useQuery({
    queryKey: ["admin", "stats", "passes", branchId ?? "self", month],
    queryFn: () => getPassSalesStats(branchId, month),
    placeholderData: keepPreviousData,
    // SUPER_ADMIN 은 branchId 가 정해진 뒤에만 호출 (브랜치 로드 전 한 번 비호출).
    enabled: !isSuper || !!branchId,
  });

  return (
    <div>
      <PageTitle title="상품별 판매" />
      <p className="mt-1 text-sm text-gray-500">
        선택한 달에 신청·등록된 상품 종류별 건수입니다.
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
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchFilter || defaultBranch?.id || ""}
            onChange={(e) => setBranchFilter(e.target.value)}
          />
        )}
      </div>

      <div className="mt-6">
        {passSalesQuery.isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : passSalesQuery.isError ? (
          <p className="text-sm text-gray-500">
            상품 판매 통계를 불러오지 못했습니다.
          </p>
        ) : passSalesQuery.data ? (
          <PassSalesTabs data={passSalesQuery.data} />
        ) : null}
      </div>
    </div>
  );
}
