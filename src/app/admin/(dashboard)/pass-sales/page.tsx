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
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import {
  getPassSalesStats,
  type PassSalesResponse,
  type StatItem,
} from "@/lib/api/stats";
import { Select } from "@/components/Select";
import { StatBars } from "@/components/StatChart";
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

  // 탭 상태와 변환된 탭 목록 — 응답이 없어도 0건으로 채워 탭 줄은 항상 표시.
  const [passTab, setPassTab] = useState<PassTabKey>("membership");
  const passTabs = buildPassTabs(passSalesQuery.data);
  const activePassTab = passTabs.find((t) => t.key === passTab)!;

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

      {/* 탭 줄 — 카드 밖. 상품 관리와 동일한 underline 탭 스타일.
          좁은 화면에서 라벨이 잘리지 않게 가로 스크롤은 유지하되 스크롤바는 숨김. */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {passTabs.map((t) => {
          const isActive = t.key === passTab;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setPassTab(t.key)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
              <span
                className={`text-xs ${
                  isActive ? "text-primary/80" : "text-gray-500"
                }`}
              >
                {t.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* 통계 — 카드 안에 막대만 (헤더는 탭에 이미 있음) */}
      <div className="mt-4">
        {passSalesQuery.isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : passSalesQuery.isError ? (
          <p className="text-sm text-gray-500">
            상품 판매 통계를 불러오지 못했습니다.
          </p>
        ) : passSalesQuery.data ? (
          <section className="rounded-xl border border-gray-200 p-5">
            <StatBars items={activePassTab.items} total={activePassTab.total} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
