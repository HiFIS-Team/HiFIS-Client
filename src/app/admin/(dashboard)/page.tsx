"use client";

import { PageTitle } from "./PageTitle";
import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BoltIcon,
  CakeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
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
import { getDashboardSummary } from "@/lib/api/dashboard";
import { formatDate, formatPhone } from "@/lib/format";
import type { DayCount } from "@/lib/api/types";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

// 최근 신청 리스트 — 타입별 아이콘 + chip 색상 메타. 한 톤이지만 색으로 구분 가능.
const RECENT_TYPE_META: Record<
  string,
  { icon: ComponentType<{ className?: string }>; chipClass: string }
> = {
  예약: { icon: CalendarIcon, chipClass: "bg-blue-50 text-blue-600" },
  회원: { icon: UsersIcon, chipClass: "bg-green-50 text-green-600" },
  PT: { icon: BoltIcon, chipClass: "bg-violet-50 text-primary" },
};

// 요약 숫자 카드 — 아이콘 + 라벨 + 큰 숫자 + 부가 정보 (브랜드 톤 보라 테두리)
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName = "text-gray-400",
}: {
  label: string;
  value: number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-violet-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <Icon className={`size-5 ${iconClassName}`} />
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
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
          ? "border-amber-200 bg-amber-50"
          : "border-violet-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-sm font-medium ${
            active ? "text-amber-800" : "text-gray-500"
          }`}
        >
          {label}
        </p>
        <Icon
          className={`size-5 ${active ? "text-amber-500" : "text-gray-400"}`}
        />
      </div>
      <p
        className={`mt-1 text-2xl font-bold ${
          active ? "text-amber-900" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// 이번 달 가입 추이 — 일별 막대 (회원·PT 색깔 분할 스택)
// summary 응답의 this_month_by_day(0건 날은 생략) 을 받아 오늘까지 일자 모두 채워서 렌더.
function MonthlyTrendChart({
  memberByDay,
  ptByDay,
}: {
  memberByDay: DayCount[];
  ptByDay: DayCount[];
}) {
  const today = todayStr();
  const monthPrefix = today.slice(0, 7);
  const todayDay = Number(today.slice(8, 10));

  const memberByDate: Record<string, number> = {};
  const ptByDate: Record<string, number> = {};
  for (const d of memberByDay) memberByDate[d.date] = d.count;
  for (const d of ptByDay) ptByDate[d.date] = d.count;

  const days = Array.from(
    { length: todayDay },
    (_, i) => `${monthPrefix}-${String(i + 1).padStart(2, "0")}`,
  );
  const max = Math.max(
    ...days.map((d) => (memberByDate[d] ?? 0) + (ptByDate[d] ?? 0)),
    1,
  );
  const monthMembers = Object.values(memberByDate).reduce((a, b) => a + b, 0);
  const monthPts = Object.values(ptByDate).reduce((a, b) => a + b, 0);
  const monthLabel = Number(monthPrefix.slice(5));
  const todayLabel = `${monthLabel}/${todayDay}`;

  return (
    <section className="rounded-xl border border-violet-200 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          이번 달 가입 추이
        </h2>
        <p className="text-sm text-gray-500">
          회원{" "}
          <span className="font-semibold text-gray-900">{monthMembers}</span>명
          · PT{" "}
          <span className="font-semibold text-gray-900">{monthPts}</span>건
        </p>
      </div>

      <div className="mt-4 flex h-32 items-end gap-1">
        {days.map((d) => {
          const m = memberByDate[d] ?? 0;
          const p = ptByDate[d] ?? 0;
          const total = m + p;
          const heightPct = (total / max) * 100;
          return (
            <div
              key={d}
              className="flex flex-1 flex-col justify-end"
              title={`${d.slice(5).replace("-", "/")} · 회원 ${m} · PT ${p}`}
            >
              <div
                style={{ height: `${heightPct}%` }}
                className="flex w-full flex-col overflow-hidden rounded-t"
              >
                {p > 0 && (
                  <div style={{ flexGrow: p }} className="bg-violet-300" />
                )}
                {m > 0 && (
                  <div style={{ flexGrow: m }} className="bg-primary" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-xs text-gray-400">
        <span>{monthLabel}/1</span>
        <span>오늘 ({todayLabel})</span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-primary" />
          회원
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-violet-300" />
          PT
        </span>
      </div>
    </section>
  );
}

// 오늘 생일자 — summary 응답의 birthday_today 그대로 렌더
function BirthdayCard({
  list,
}: {
  list: { id: string; name: string; phone: string }[];
}) {
  return (
    <section className="rounded-xl border border-violet-200 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">오늘 생일자</h3>
        <CakeIcon className="size-5 text-pink-400" />
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">오늘 생일자가 없습니다.</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {list.length}명
          </p>
          <ul className="mt-3 space-y-1.5">
            {list.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900">{p.name}</span>
                <span className="text-gray-400">{formatPhone(p.phone)}</span>
              </li>
            ))}
            {list.length > 5 && (
              <li className="text-xs text-gray-400">외 {list.length - 5}명</li>
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
    <section className="rounded-xl border border-violet-200 p-5">
      <h3 className="text-base font-semibold text-gray-900">성별 분포</h3>
      {total === 0 ? (
        <p className="mt-3 text-sm text-gray-400">데이터가 없습니다.</p>
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
                className="stroke-violet-300"
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
                className="fill-gray-900 text-[7px] font-bold"
              >
                {total}명
              </text>
            </svg>
          </div>
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="inline-block size-2.5 rounded-sm bg-primary" />
              남 {male} · {malePct}%
            </span>
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="inline-block size-2.5 rounded-sm bg-violet-300" />
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
    <section className="rounded-xl border border-violet-200 p-5">
      <h3 className="text-base font-semibold text-gray-900">연령대 분포</h3>
      <div className="mt-4 space-y-2">
        {buckets.map((b, i) => {
          const count = counts[i];
          return (
            <div key={b.key} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0 text-gray-500">{b.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  style={{ width: `${(count / max) * 100}%` }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="w-8 shrink-0 text-right text-gray-700">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 이달의 FC — 피드백왕/친절왕/종합왕. 점수 데이터가 아직 없어 준비중 표시.
function FcKingCard({
  label,
  description,
  icon: Icon,
  iconBgClass,
  iconTextClass,
}: {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconTextClass: string;
}) {
  return (
    <section className="rounded-xl border border-violet-200 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-lg ${iconBgClass}`}
          >
            <Icon className={`size-5 ${iconTextClass}`} />
          </span>
          <h3 className="text-base font-semibold text-gray-900">{label}</h3>
        </div>
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          준비중
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-400">—</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </section>
  );
}

export default function AdminDashboardPage() {
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  // 모든 집계 데이터를 한 번에 — 회원 1000건+ 운영 환경에서도 정확한 카운트.
  const summaryQuery = useQuery({
    queryKey: ["admin", "dashboard-summary", "all"],
    queryFn: () => getDashboardSummary(),
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
      <p className="mt-1 text-sm text-gray-500">
        {name ? `${name}님, 환영합니다.` : "환영합니다."}
      </p>

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
        <h2 className="text-base font-semibold text-gray-900">회원 상태</h2>
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
            iconClassName="text-gray-400"
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
        <h2 className="text-base font-semibold text-gray-900">처리할 일</h2>
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
        <MonthlyTrendChart
          memberByDay={m?.this_month_by_day ?? []}
          ptByDay={pt?.this_month_by_day ?? []}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">회원 분석</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <BirthdayCard list={m?.birthday_today ?? []} />
          <GenderCard byGender={m?.by_gender ?? {}} />
          <AgeRangeCard byAgeRange={m?.by_age_range ?? {}} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">이달의 FC</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <FcKingCard
            label="피드백왕"
            description="회원 피드백 점수가 가장 높은 FC"
            icon={HandThumbUpIcon}
            iconBgClass="bg-amber-50"
            iconTextClass="text-amber-500"
          />
          <FcKingCard
            label="친절왕"
            description="회원 친절도 점수가 가장 높은 FC"
            icon={HeartIcon}
            iconBgClass="bg-rose-50"
            iconTextClass="text-rose-500"
          />
          <FcKingCard
            label="종합왕"
            description="모든 지표 합산 1위 FC"
            icon={TrophyIcon}
            iconBgClass="bg-violet-50"
            iconTextClass="text-primary"
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">최근 신청</h2>
        <div className="mt-3 rounded-xl border border-violet-200">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-gray-100">
                <InboxIcon className="size-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">최근 신청이 없습니다.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
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
                    <span className="font-medium text-gray-900">
                      {item.name}
                    </span>
                    <span className="ml-auto text-gray-500">
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
