"use client";

import { PageTitle } from "../PageTitle";
import { useMemo, useState, type ComponentType } from "react";
import {
  BoltIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  LockClosedIcon,
  ShoppingBagIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
import {
  getPassSalesStats,
  type PassSalesResponse,
  type StatItem,
} from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatChart } from "@/components/StatChart";
import { buildMonthOptions, currentMonthYM } from "@/lib/statsMonth";
import { comparePassOrderByName } from "@/lib/passDuration";

// 통계 응답의 패스 항목을 상품관리 페이지(sortPassesForUI) 와 같은 순서로 정렬.
// 백엔드 응답이 어떤 순서로 오든 화면에서 동일한 순서로 보이게 한다.
function sortStatItems(items: StatItem[]): StatItem[] {
  return items
    .slice()
    .sort((a, b) => comparePassOrderByName(a.label, b.label));
}

type PassTabKey = "membership" | "pt" | "locker" | "clothes";
interface PassTab {
  key: PassTabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: StatItem[];
  total: number;
}

// 응답을 탭 모양으로 변환 — 상품관리·신청서 Select 와 같은 순서로 정렬한 items 포함.
// 응답 없을 땐 모두 0 건으로 채워 탭 줄은 항상 표시.
function buildPassTabs(data: PassSalesResponse | undefined): PassTab[] {
  const get = (key: keyof PassSalesResponse) =>
    data ? data[key] : { items: [], total: 0 };
  return [
    { key: "membership", label: "회원권", icon: TicketIcon, ...get("membership"), items: sortStatItems(get("membership").items) },
    { key: "pt", label: "수강권", icon: BoltIcon, ...get("pt"), items: sortStatItems(get("pt").items) },
    { key: "locker", label: "락커", icon: LockClosedIcon, ...get("locker"), items: sortStatItems(get("locker").items) },
    { key: "clothes", label: "운동복", icon: ShoppingBagIcon, ...get("clothes"), items: sortStatItems(get("clothes").items) },
  ];
}

export default function AdminPassSalesPage() {
  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId } = useBranch();

  const [month, setMonth] = useState<string>(currentMonthYM);
  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  const passSalesQuery = useQuery({
    queryKey: ["admin", "stats", "passes", branchId ?? "self", month],
    queryFn: () => getPassSalesStats(branchId, month),
    placeholderData: keepPreviousData,
    enabled: !!branchId,
  });

  // 탭 상태와 변환된 탭 목록 — 응답이 없어도 0건으로 채워 탭 줄은 항상 표시.
  const [passTab, setPassTab] = useState<PassTabKey>("membership");
  const passTabs = buildPassTabs(passSalesQuery.data);
  const activePassTab = passTabs.find((t) => t.key === passTab)!;

  return (
    <div>
      <PageTitle title="상품별 판매" />
      <p className="hidden">
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
        {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 월 셀렉터만. */}
      </div>

      {/* 탭 줄 — 카드 밖. 4개를 flex-1 로 균등 분할해 폭에 맞춰 줄어들게.
          모바일에서는 패딩만 좁혀(px-2) 한 줄에 다 들어가고 가로 스크롤 불필요. */}
      <div className="mt-6 flex border-b border-gray-200">
        {passTabs.map((t) => {
          const isActive = t.key === passTab;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setPassTab(t.key)}
              className={`-mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-sm font-medium whitespace-nowrap sm:px-4 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 통계 — 통계 페이지의 유입경로/방문목적과 동일한 StatChart (헤더 좌: 제목, 우: 총 N건). */}
      <div className="mt-4">
        {passSalesQuery.isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : passSalesQuery.isError ? (
          <p className="text-sm text-gray-500">
            상품 판매 통계를 불러오지 못했습니다.
          </p>
        ) : passSalesQuery.data ? (
          <StatChart
            title={activePassTab.label}
            icon={activePassTab.icon}
            data={{ items: activePassTab.items, total: activePassTab.total }}
          />
        ) : null}
      </div>
    </div>
  );
}
