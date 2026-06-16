"use client";

import { PageTitle } from "./PageTitle";
import { useRef, useState, type ComponentType, type TouchEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BoltIcon,
  CakeIcon,
  HandRaisedIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  HandThumbUpIcon,
  HeartIcon,
  InboxIcon,
  PauseCircleIcon,
  TrophyIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getAdmins } from "@/lib/api/admins";
import { useBranch } from "@/providers/BranchProvider";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { formatDate, formatPhone } from "@/lib/format";
import type { Branch, DayCount } from "@/lib/api/types";

// 최근 신청 리스트 — 타입별 아이콘 + chip 색상 메타. 한 톤이지만 색으로 구분 가능.
const RECENT_TYPE_META: Record<
  string,
  { icon: ComponentType<{ className?: string }>; chipClass: string }
> = {
  예약: { icon: CalendarIcon, chipClass: "bg-blue-500/10 text-blue-400" },
  회원: { icon: UsersIcon, chipClass: "bg-green-500/10 text-green-400" },
  PT: { icon: BoltIcon, chipClass: "bg-primary/10 text-primary" },
};

// 요약 숫자 카드 — 아이콘 + 라벨 + 큰 숫자 + 부가 정보 (브랜드 톤 보라 테두리)
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName = "text-muted",
}: {
  label: string;
  value: number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <Icon className={`size-5 ${iconClassName}`} />
      </div>
      <p className="mt-1 text-2xl font-bold text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// 처리할 일 카드 — 값 > 0 이면 amber 톤으로 강조, 0 이면 보라 테두리 (해야 할 일이 없다는 신호)
function TodoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  const active = value > 0;
  return (
    <div
      className={`rounded-xl border p-4 ${
        active
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-line bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-sm font-medium ${
            active ? "text-amber-200" : "text-muted"
          }`}
        >
          {label}
        </p>
        <Icon
          className={`size-5 ${active ? "text-amber-400" : "text-muted"}`}
        />
      </div>
      <p
        className={`mt-1 text-2xl font-bold ${
          active ? "text-amber-100" : "text-fg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// 이번 달 가입 추이 — 회원·PT 두 줄 수평 막대 (연령대 분포 카드와 동일 패턴).
// 같은 max 기준으로 길이 비교 → 회원·PT 상대적 비중 한눈에.
function MonthlyTrendChart({
  memberByDay,
  ptByDay,
}: {
  memberByDay: DayCount[];
  ptByDay: DayCount[];
}) {
  const monthMembers = memberByDay.reduce((sum, d) => sum + d.count, 0);
  const monthPts = ptByDay.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(monthMembers, monthPts, 1);
  const today = new Date();
  const todayLabel = `${today.getMonth() + 1}/${today.getDate()}`;

  // PC 세로 막대 — 카드가 좁아서 가로보다 세로가 빈 공간 적음.
  const V_MAX = 100; // 막대 영역 세로 최대치(px)
  const memberBarPx =
    monthMembers > 0
      ? Math.max(4, Math.round((monthMembers / max) * V_MAX))
      : 0;
  const ptBarPx =
    monthPts > 0 ? Math.max(4, Math.round((monthPts / max) * V_MAX)) : 0;

  return (
    <section className="flex h-full flex-col rounded-xl border border-line bg-card p-5">
      <h3 className="text-base font-semibold text-fg">
        이번 달 가입 추이
      </h3>

      {/* 모바일: 가로 막대 — 제목과 today 양쪽 모두 mt-6 으로 여백 확보 */}
      <div className="mt-6 space-y-4 lg:hidden">
        <HorizontalBar
          label="회원"
          count={monthMembers}
          max={max}
          unit="명"
          barClass="bg-primary"
        />
        <HorizontalBar
          label="PT"
          count={monthPts}
          max={max}
          unit="건"
          barClass="bg-violet-400"
        />
      </div>

      {/* PC: 세로 막대 — 카운트(위) → 막대 → 라벨(아래). items-end 로 라벨 끝선 정렬 */}
      <div className="hidden flex-1 items-end justify-center gap-10 pt-2 lg:flex">
        <VerticalBar
          label="회원"
          count={monthMembers}
          unit="명"
          barPx={memberBarPx}
          barClass="bg-primary"
        />
        <VerticalBar
          label="PT"
          count={monthPts}
          unit="건"
          barPx={ptBarPx}
          barClass="bg-violet-400"
        />
      </div>

      <p className="mt-6 text-right text-xs text-muted lg:mt-3">
        오늘 {todayLabel}
      </p>
    </section>
  );
}

// 가로 막대 한 줄 — 좌측 라벨 + 회색 트랙 안에 색 막대 + 우측 카운트.
function HorizontalBar({
  label,
  count,
  max,
  unit,
  barClass,
}: {
  label: string;
  count: number;
  max: number;
  unit: string;
  barClass: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-5 text-sm">
      <span className="w-10 shrink-0 text-muted">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-card-hover">
        {count > 0 && (
          <div
            style={{ width: `${Math.max(2, pct)}%` }}
            className={`h-full rounded-full ${barClass}`}
          />
        )}
      </div>
      <span className="w-14 shrink-0 text-right tabular-nums text-fg">
        {count}
        {unit}
      </span>
    </div>
  );
}

// 세로 막대 한 칸 — 카운트(위) → 막대 → 라벨(아래).
// items-center 로 세로 컬럼 가운데 정렬, 컬럼 자체는 부모 items-end 로 바닥 정렬.
function VerticalBar({
  label,
  count,
  unit,
  barPx,
  barClass,
}: {
  label: string;
  count: number;
  unit: string;
  barPx: number;
  barClass: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-sm font-semibold tabular-nums text-fg">
        {count}
        {unit}
      </span>
      <div
        style={{ height: `${barPx}px` }}
        className={`w-10 rounded-t ${barClass}`}
      />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

// 오늘 생일자 — summary 응답의 birthday_today 그대로 렌더
function BirthdayCard({
  list,
}: {
  list: { id: string; name: string; phone: string }[];
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-fg">오늘 생일자</h3>
        <CakeIcon className="size-5 text-pink-400" />
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted">오늘 생일자가 없습니다.</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold text-fg">
            {list.length}명
          </p>
          <ul className="mt-3 space-y-1.5">
            {list.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-fg">{p.name}</span>
                <span className="text-muted">{formatPhone(p.phone)}</span>
              </li>
            ))}
            {list.length > 5 && (
              <li className="text-xs text-muted">외 {list.length - 5}명</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}

// 성별 분포 — summary 의 by_gender 그대로
function GenderCard({ byGender }: { byGender: Record<string, number> }) {
  const male = byGender.M ?? 0;
  const female = byGender.F ?? 0;
  const total = male + female;
  const malePct = total > 0 ? Math.round((male / total) * 100) : 0;
  const femalePct = total > 0 ? 100 - malePct : 0;

  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h3 className="text-base font-semibold text-fg">성별 분포</h3>
      {total === 0 ? (
        <p className="mt-3 text-sm text-muted">데이터가 없습니다.</p>
      ) : (
        <>
          <div className="mt-4 flex justify-center">
            {/* viewBox 36×36, r=15.915 → 둘레 ≈ 100 (% 대비 stroke-dasharray) */}
            <svg viewBox="0 0 36 36" className="size-32">
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                strokeWidth="4"
                className="stroke-violet-400/30"
              />
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                strokeWidth="4"
                strokeDasharray={`${malePct} ${100 - malePct}`}
                transform="rotate(-90 18 18)"
                className="stroke-primary"
              />
              <text
                x="18"
                y="18"
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-[color:var(--color-fg)] text-[7px] font-bold"
              >
                {total}명
              </text>
            </svg>
          </div>
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-fg">
              <span className="inline-block size-2.5 rounded-sm bg-primary" />
              남 {male} · {malePct}%
            </span>
            <span className="flex items-center gap-1.5 text-fg">
              <span className="inline-block size-2.5 rounded-sm bg-violet-400" />
              여 {female} · {femalePct}%
            </span>
          </div>
        </>
      )}
    </section>
  );
}

// 연령대 분포 — summary 의 by_age_range 그대로
function AgeRangeCard({
  byAgeRange,
}: {
  byAgeRange: Record<string, number>;
}) {
  // 백엔드 키와 표시 라벨 매핑
  const buckets: { key: string; label: string }[] = [
    { key: "10s", label: "10대" },
    { key: "20s", label: "20대" },
    { key: "30s", label: "30대" },
    { key: "40s", label: "40대" },
    { key: "50s_plus", label: "50대+" },
  ];
  const counts = buckets.map((b) => byAgeRange[b.key] ?? 0);
  const max = Math.max(...counts, 1);

  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h3 className="text-base font-semibold text-fg">연령대 분포</h3>
      <div className="mt-4 space-y-2">
        {buckets.map((b, i) => {
          const count = counts[i];
          return (
            <div key={b.key} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0 text-muted">{b.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-hover">
                <div
                  style={{ width: `${(count / max) * 100}%` }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="w-8 shrink-0 text-right text-fg">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 이달의 우수사원 — 피드백왕/친절왕/종합왕. 점수 데이터가 아직 없어 준비중 표시.
// 카드 안에서 지점별 1명을 한 번에 한 명씩 — < > 버튼 또는 좌우 스와이프로 전환.
// 카드별 독립 (피드백왕은 화순 보고 친절왕은 첨단 봐도 됨).
function MonthlyAwardCard({
  label,
  description,
  icon: Icon,
  iconBgClass,
  iconTextClass,
  branches,
}: {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconTextClass: string;
  branches: Branch[];
}) {
  const [idx, setIdx] = useState(0);
  const total = branches.length;
  const safeIdx = total > 0 ? idx % total : 0;
  const current = total > 0 ? branches[safeIdx] : null;

  function go(delta: number) {
    if (total === 0) return;
    setIdx((i) => (i + delta + total) % total);
  }

  // 가벼운 가로 스와이프 — touchstart x 좌표 저장 후 touchend 와 비교.
  // |dx| > 40px 면 한 칸 이동. 라이브러리 없이 가볍게.
  const touchStartX = useRef<number | null>(null);
  function onTouchStart(e: TouchEvent<HTMLElement>) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: TouchEvent<HTMLElement>) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  }

  return (
    // key 로 지점 전환 시 section 자체를 재마운트 → 카드 박스 전체가 우측에서
    // 슬라이드 인 (글씨가 아니라 네모칸 자체가 이동되는 느낌).
    <section
      key={current?.id ?? "empty"}
      className="animate-slide-in-right relative rounded-xl border border-line bg-card p-5"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
          >
            <Icon className={`size-5 ${iconTextClass}`} />
          </span>
          <h3 className="truncate text-base font-semibold text-fg">
            {label}
          </h3>
          {/* 라벨 옆 지점명 — 현재 보고 있는 지점 */}
          <span className="shrink-0 text-sm text-muted">
            {current ? branchShortName(current.name) : "—"}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-card-hover px-1.5 py-0.5 text-[10px] font-medium text-muted">
          준비중
        </span>
      </div>

      {/* 본문 — 사람 이름만 큰 글씨로. 데이터 들어오면 채워짐. */}
      <div className="mt-4 min-h-[3.5rem] pr-10">
        <p className="text-2xl font-bold text-muted">—</p>
      </div>

      {/* 우측 가운데 화살표 — 누르면 다음 지점으로 (rotate). 좌측 스와이프도 동일. */}
      {total > 1 && (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="다음 지점"
          className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-card-hover text-muted ring-1 ring-line hover:text-fg"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      )}

      <p className="mt-3 text-xs text-muted">{description}</p>
    </section>
  );
}

// "피트니스스타 화순점" → "화순점" — 신청서 폼과 동일한 prefix strip.
function branchShortName(name: string): string {
  return name.replace(/^피트니스스타\s*/, "");
}

export default function AdminDashboardPage() {
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점. 대시보드 모든 정보는
  // 이 지점만 보여줌 (회원/PT/예약/알림톡 카운트, 최근 신청, 가입 추이 등 전부).
  const { selectedBranchId, branches: allBranches } = useBranch();
  const selectedBranch = allBranches.find((b) => b.id === selectedBranchId);
  const branches = selectedBranch ? [selectedBranch] : [];

  // 모든 집계 데이터를 한 번에 — 회원 1000건+ 운영 환경에서도 정확한 카운트.
  // staleTime 0: 데이터 변동(신청 등) 즉시 반영하려고 페이지 진입 시 항상 새로.
  const summaryQuery = useQuery({
    queryKey: ["admin", "dashboard-summary", selectedBranchId ?? "self"],
    queryFn: () => getDashboardSummary(selectedBranchId),
    staleTime: 0,
    enabled: !!selectedBranchId,
  });
  const adminsQuery = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => getAdmins(),
    enabled: isSuper,
  });

  const summary = summaryQuery.data;
  const m = summary?.members;
  const pt = summary?.pt_applications;
  const r = summary?.reservations;
  const msg = summary?.messages;

  const pendingFc = (adminsQuery.data ?? []).filter(
    (a) => a.status === "PENDING_APPROVAL",
  ).length;

  // 만기 임박 — 회원 + PT 합산
  const expiringSoonCount =
    (m?.expiring_soon_count ?? 0) + (pt?.expiring_soon_count ?? 0);

  // 회원 상태 — 회원 + PT 합산
  const statusCount = (key: string) =>
    (m?.by_status?.[key] ?? 0) + (pt?.by_status?.[key] ?? 0);
  const activeCount = statusCount("REGISTERED");
  const expiredCount = statusCount("EXPIRED");
  const heldCount = statusCount("HELD");

  // 최근 신청 — 예약·회원·PT 각각 5건씩 받아서 합쳐 최신순 상위 5건
  type RecentRow = {
    key: string;
    name: string;
    type: string;
    created_at: string;
  };
  const recent: RecentRow[] = summary
    ? [
        ...summary.reservations.recent.map((x) => ({
          key: `r-${x.id}`,
          name: x.name,
          type: "예약",
          created_at: x.created_at,
        })),
        ...summary.members.recent.map((x) => ({
          key: `m-${x.id}`,
          name: x.name,
          type: "회원",
          created_at: x.created_at,
        })),
        ...summary.pt_applications.recent.map((x) => ({
          key: `p-${x.id}`,
          name: x.name,
          type: "PT",
          created_at: x.created_at,
        })),
      ]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5)
    : [];

  const name = meQuery.data?.name ?? "";

  return (
    <div>
      <PageTitle title="대시보드" />
      {/* 홈 인사말 — GBX 톤(굵은 산세리프 + 좁은 자간) 으로 무게감. */}
      <h1 className="text-3xl leading-[1.15] font-black tracking-tighter text-fg">
        <span className="inline-flex items-center gap-2">
          안녕하세요
          <HandRaisedIcon className="size-7 text-primary" />
        </span>
        <br />
        {name ? `${name}님!` : "환영합니다!"}
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="예약 신청"
          value={r?.total ?? 0}
          icon={CalendarIcon}
          hint={`이번 달 ${r?.this_month ?? 0}건`}
        />
        <StatCard
          label="회원"
          value={m?.total ?? 0}
          icon={UsersIcon}
          hint={`이번 달 ${m?.this_month_signups ?? 0}명`}
        />
        <StatCard
          label="PT"
          value={pt?.total ?? 0}
          icon={BoltIcon}
          hint={`이번 달 ${pt?.this_month_signups ?? 0}건`}
        />
        <StatCard
          label="알림톡 이력"
          value={msg?.total ?? 0}
          icon={ChatBubbleLeftRightIcon}
          hint={`오늘 ${msg?.today ?? 0}건`}
        />
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-fg">회원 상태</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="활성"
            value={activeCount}
            icon={CheckCircleIcon}
            iconClassName="text-green-500"
          />
          <StatCard
            label="만료"
            value={expiredCount}
            icon={XCircleIcon}
            iconClassName="text-muted"
          />
          <StatCard
            label="홀딩"
            value={heldCount}
            icon={PauseCircleIcon}
            iconClassName="text-amber-500"
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-fg">처리할 일</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <TodoCard
            label="만기 임박 (7일 내)"
            value={expiringSoonCount}
            icon={ClockIcon}
          />
          <TodoCard
            label="오늘 방문 예정"
            value={r?.today_visit ?? 0}
            icon={CalendarDaysIcon}
          />
          {isSuper && (
            <TodoCard
              label="FC 가입 승인 대기"
              value={pendingFc}
              icon={UserPlusIcon}
            />
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-fg">회원 분석</h2>
        {/* 가입 추이도 회원 분석 범주라 같은 grid 에 합침.
            mobile 1col → sm 2col → lg 4col 로 적당히 채워짐. */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MonthlyTrendChart
            memberByDay={m?.this_month_by_day ?? []}
            ptByDay={pt?.this_month_by_day ?? []}
          />
          <BirthdayCard list={m?.birthday_today ?? []} />
          <GenderCard byGender={m?.by_gender ?? {}} />
          <AgeRangeCard byAgeRange={m?.by_age_range ?? {}} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-fg">이달의 우수사원</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <MonthlyAwardCard
            label="피드백왕"
            description="회원 피드백 점수가 가장 높은 사원"
            icon={HandThumbUpIcon}
            iconBgClass="bg-amber-500/10"
            iconTextClass="text-amber-400"
            branches={branches}
          />
          <MonthlyAwardCard
            label="친절왕"
            description="회원 친절도 점수가 가장 높은 사원"
            icon={HeartIcon}
            iconBgClass="bg-rose-500/10"
            iconTextClass="text-rose-400"
            branches={branches}
          />
          <MonthlyAwardCard
            label="종합왕"
            description="모든 지표 합산 1위 사원"
            icon={TrophyIcon}
            iconBgClass="bg-primary/10"
            iconTextClass="text-primary"
            branches={branches}
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-fg">최근 신청</h2>
        <div className="mt-3 rounded-xl border border-line bg-card">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-card-hover">
                <InboxIcon className="size-5 text-muted" />
              </div>
              <p className="text-sm text-muted">최근 신청이 없습니다.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((item) => {
                const meta = RECENT_TYPE_META[item.type];
                const Icon = meta.icon;
                return (
                  <li
                    key={item.key}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.chipClass}`}
                    >
                      <Icon className="size-3" />
                      {item.type}
                    </span>
                    <span className="font-medium text-fg">
                      {item.name}
                    </span>
                    <span className="ml-auto text-muted">
                      {formatDate(item.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
