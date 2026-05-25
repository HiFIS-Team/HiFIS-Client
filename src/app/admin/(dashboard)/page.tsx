"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BoltIcon,
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
import { formatDate } from "@/lib/format";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}
// YYYY-MM-DD 에 일수 더하기
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d + days).toLocaleDateString("en-CA");
}

// 클릭 가능한 요약 숫자 카드 — 아이콘 + 라벨 + 큰 숫자 + 부가 정보
function StatCard({
  label,
  value,
  href,
  hint,
  icon: Icon,
  iconClassName = "text-gray-400",
}: {
  label: string;
  value: number;
  href: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 p-4 transition-colors hover:border-primary"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <Icon className={`size-5 ${iconClassName}`} />
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </Link>
  );
}

// 처리할 일 카드 — 값 > 0 이면 amber 톤으로 강조, 0 이면 평범하게 (해야 할 일이 없다는 신호)
function TodoCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const active = value > 0;
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition-colors ${
        active
          ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
          : "border-gray-200 hover:border-primary"
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
    </Link>
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
    <section className="rounded-xl border border-gray-200 p-5">
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
  const expiringSoonCount = members.filter(
    (m) =>
      m.status === "REGISTERED" &&
      m.end_date >= today &&
      m.end_date <= sevenDaysLater,
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

  // 회원 상태 분포
  const activeMembersCount = members.filter(
    (m) => m.status === "REGISTERED",
  ).length;
  const expiredMembersCount = members.filter(
    (m) => m.status === "EXPIRED",
  ).length;
  const heldMembersCount = members.filter((m) => m.status === "HELD").length;

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
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      <p className="mt-1 text-sm text-gray-500">
        {name ? `${name}님, 환영합니다.` : "환영합니다."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="예약 신청"
          value={reservations.length}
          href="/admin/reservations"
          icon={CalendarIcon}
          hint={`이번 달 ${newReservationsThisMonth}건`}
        />
        <StatCard
          label="회원"
          value={members.length}
          href="/admin/members"
          icon={UsersIcon}
          hint={`이번 달 ${newMembersThisMonth}명`}
        />
        <StatCard
          label="PT"
          value={pts.length}
          href="/admin/pt-applications"
          icon={BoltIcon}
          hint={`이번 달 ${newPtsThisMonth}건`}
        />
        <StatCard
          label="알림톡 이력"
          value={messages.length}
          href="/admin/messages"
          icon={ChatBubbleLeftRightIcon}
          hint={`오늘 ${todayMessagesCount}건`}
        />
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">회원 상태</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="활성"
            value={activeMembersCount}
            href="/admin/members"
            icon={CheckCircleIcon}
            iconClassName="text-green-500"
          />
          <StatCard
            label="만료"
            value={expiredMembersCount}
            href="/admin/members"
            icon={XCircleIcon}
            iconClassName="text-gray-400"
          />
          <StatCard
            label="홀딩"
            value={heldMembersCount}
            href="/admin/members"
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
            href="/admin/members"
            icon={ClockIcon}
          />
          <TodoCard
            label="오늘 방문 예정"
            value={todayVisitCount}
            href="/admin/reservations"
            icon={CalendarDaysIcon}
          />
          {isSuper && (
            <TodoCard
              label="FC 가입 승인 대기"
              value={pendingFc}
              href="/admin/admins"
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
        <h2 className="text-base font-semibold text-gray-900">최근 신청</h2>
        <div className="mt-3 rounded-xl border border-gray-200">
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
