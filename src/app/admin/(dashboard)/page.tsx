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
  PauseCircleIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getAdmins } from "@/lib/api/admins";
import { getAdminReservations } from "@/lib/api/reservations";
import { getAdminMembers } from "@/lib/api/members";
import { getAdminPtApplications } from "@/lib/api/ptApplications";
import { getAdminMessages } from "@/lib/api/messages";
import { formatDate, formatPhone } from "@/lib/format";
import type { Member, PTApplication } from "@/lib/api/types";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}
// YYYY-MM-DD 에 일수 더하기
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d + days).toLocaleDateString("en-CA");
}

// 사람 단위 통계용 공통 타입 — 회원·PT 신청 양쪽에 공통으로 있는 필드만
type Person = {
  id: string;
  phone: string;
  name: string;
  gender: string;
  birth_date: string;
};

// 회원 + PT 신청을 전화번호로 합쳐 중복 제거 — 같은 사람이 양쪽에 있으면 1명으로
function uniquePeople(members: Member[], pts: PTApplication[]): Person[] {
  const byPhone = new Map<string, Person>();
  for (const m of members) {
    if (!byPhone.has(m.phone)) byPhone.set(m.phone, m);
  }
  for (const p of pts) {
    if (!byPhone.has(p.phone)) byPhone.set(p.phone, p);
  }
  return Array.from(byPhone.values());
}

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
function MonthlyTrendChart({
  memberDates,
  ptDates,
}: {
  memberDates: string[];
  ptDates: string[];
}) {
  const today = todayStr();
  const monthPrefix = today.slice(0, 7);
  const todayDay = Number(today.slice(8, 10));

  const memberByDate: Record<string, number> = {};
  const ptByDate: Record<string, number> = {};
  for (const iso of memberDates) {
    const day = iso.slice(0, 10);
    if (day.startsWith(monthPrefix))
      memberByDate[day] = (memberByDate[day] ?? 0) + 1;
  }
  for (const iso of ptDates) {
    const day = iso.slice(0, 10);
    if (day.startsWith(monthPrefix))
      ptByDate[day] = (ptByDate[day] ?? 0) + 1;
  }

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

// 오늘 생일자 — birth_date 의 MM-DD 가 오늘과 같은 사람
function BirthdayCard({ people }: { people: Person[] }) {
  const today = todayStr();
  const monthDay = today.slice(5);
  const list = people.filter((p) => p.birth_date?.slice(5) === monthDay);

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

// 성별 분포 — 수평 스택 바 + 범례
function GenderCard({ people }: { people: Person[] }) {
  const male = people.filter((p) => p.gender === "M").length;
  const female = people.filter((p) => p.gender === "F").length;
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

// 연령대 분포 — 만 나이 기준 10대~50대+ 버킷별 막대
function AgeRangeCard({ people }: { people: Person[] }) {
  const currentYear = Number(todayStr().slice(0, 4));
  const labels = ["10대", "20대", "30대", "40대", "50대+"] as const;
  const buckets: Record<string, number> = {
    "10대": 0,
    "20대": 0,
    "30대": 0,
    "40대": 0,
    "50대+": 0,
  };
  for (const m of people) {
    if (!m.birth_date) continue;
    const age = currentYear - Number(m.birth_date.slice(0, 4));
    if (age < 20) buckets["10대"]++;
    else if (age < 30) buckets["20대"]++;
    else if (age < 40) buckets["30대"]++;
    else if (age < 50) buckets["40대"]++;
    else buckets["50대+"]++;
  }
  const max = Math.max(...Object.values(buckets), 1);

  return (
    <section className="rounded-xl border border-violet-200 p-5">
      <h3 className="text-base font-semibold text-gray-900">연령대 분포</h3>
      <div className="mt-4 space-y-2">
        {labels.map((label) => {
          const count = buckets[label];
          return (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0 text-gray-500">{label}</span>
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

export default function AdminDashboardPage() {
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  const reservationsQuery = useQuery({
    queryKey: ["admin", "reservations", "all"],
    queryFn: () => getAdminReservations(),
  });
  const membersQuery = useQuery({
    queryKey: ["admin", "members", "all"],
    queryFn: () => getAdminMembers(),
  });
  const ptQuery = useQuery({
    queryKey: ["admin", "pt-applications", "all"],
    queryFn: () => getAdminPtApplications(),
  });
  const messagesQuery = useQuery({
    queryKey: ["admin", "messages", "all"],
    queryFn: () => getAdminMessages(),
  });
  const adminsQuery = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: getAdmins,
    enabled: isSuper,
  });

  const reservations = reservationsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const pts = ptQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const pendingFc = (adminsQuery.data ?? []).filter(
    (a) => a.status === "PENDING_APPROVAL",
  ).length;

  // 처리할 일 — 만기 임박(7일내) · 오늘 방문 · 승인 대기
  const today = todayStr();
  const sevenDaysLater = addDays(today, 7);
  const monthPrefix = today.slice(0, 7);
  // 만기 임박 — 회원 + PT 합산 (이용 기간 종료가 곧 다가오는 건수)
  const expiringSoonCount =
    members.filter(
      (m) =>
        m.status === "REGISTERED" &&
        m.end_date >= today &&
        m.end_date <= sevenDaysLater,
    ).length +
    pts.filter(
      (p) =>
        p.status === "REGISTERED" &&
        p.end_date >= today &&
        p.end_date <= sevenDaysLater,
    ).length;
  const todayVisitCount = reservations.filter(
    (r) => r.visit_date === today,
  ).length;

  // StatCard 부가 정보 — 이번 달 신규 / 오늘 발송
  const newReservationsThisMonth = reservations.filter((r) =>
    r.created_at.startsWith(monthPrefix),
  ).length;
  const newMembersThisMonth = members.filter((m) =>
    m.created_at.startsWith(monthPrefix),
  ).length;
  const newPtsThisMonth = pts.filter((p) =>
    p.created_at.startsWith(monthPrefix),
  ).length;
  const todayMessagesCount = messages.filter((m) =>
    m.sent_at.startsWith(today),
  ).length;

  // 회원 분석용 — 회원 + PT 합쳐 전화번호로 중복 제거한 사람 목록
  const people = uniquePeople(members, pts);

  // 이용자 상태 분포 — 회원 + PT 신청 합산
  const activeCount =
    members.filter((m) => m.status === "REGISTERED").length +
    pts.filter((p) => p.status === "REGISTERED").length;
  const expiredCount =
    members.filter((m) => m.status === "EXPIRED").length +
    pts.filter((p) => p.status === "EXPIRED").length;
  const heldCount =
    members.filter((m) => m.status === "HELD").length +
    pts.filter((p) => p.status === "HELD").length;

  // 최근 신청 — 예약·회원·PT 를 합쳐 최신순 상위 5건
  const recent = [
    ...reservations.map((r) => ({
      key: `r-${r.id}`,
      name: r.name,
      type: "예약",
      created_at: r.created_at,
    })),
    ...members.map((m) => ({
      key: `m-${m.id}`,
      name: m.name,
      type: "회원",
      created_at: m.created_at,
    })),
    ...pts.map((p) => ({
      key: `p-${p.id}`,
      name: p.name,
      type: "PT",
      created_at: p.created_at,
    })),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5);

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
          value={reservations.length}
          icon={CalendarIcon}
          hint={`이번 달 ${newReservationsThisMonth}건`}
        />
        <StatCard
          label="회원"
          value={members.length}
          icon={UsersIcon}
          hint={`이번 달 ${newMembersThisMonth}명`}
        />
        <StatCard
          label="PT"
          value={pts.length}
          icon={BoltIcon}
          hint={`이번 달 ${newPtsThisMonth}건`}
        />
        <StatCard
          label="알림톡 이력"
          value={messages.length}
          icon={ChatBubbleLeftRightIcon}
          hint={`오늘 ${todayMessagesCount}건`}
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
            value={todayVisitCount}
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
          memberDates={members.map((m) => m.created_at)}
          ptDates={pts.map((p) => p.created_at)}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">회원 분석</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <BirthdayCard people={people} />
          <GenderCard people={people} />
          <AgeRangeCard people={people} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">최근 신청</h2>
        <div className="mt-3 rounded-xl border border-violet-200">
          {recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              최근 신청이 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recent.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-primary">
                    {item.type}
                  </span>
                  <span className="font-medium text-gray-900">
                    {item.name}
                  </span>
                  <span className="ml-auto text-gray-500">
                    {formatDate(item.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
