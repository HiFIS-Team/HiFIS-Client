"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getAdmins } from "@/lib/api/admins";
import { getAdminReservations } from "@/lib/api/reservations";
import { getAdminMembers } from "@/lib/api/members";
import { getAdminPtApplications } from "@/lib/api/ptApplications";
import { formatDate } from "@/lib/format";

// 클릭 가능한 요약 숫자 카드
function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 p-4 transition-colors hover:border-primary"
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  // 목록 쿼리 — 조회 화면(필터 없음)과 캐시 공유
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
  const adminsQuery = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: getAdmins,
    enabled: isSuper,
  });

  const reservations = reservationsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const pts = ptQuery.data ?? [];
  const activeMembers = members.filter(
    (m) => m.status === "REGISTERED",
  ).length;
  const pendingFc = (adminsQuery.data ?? []).filter(
    (a) => a.status === "PENDING_APPROVAL",
  ).length;

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
        />
        <StatCard label="회원" value={members.length} href="/admin/members" />
        <StatCard
          label="PT 신청"
          value={pts.length}
          href="/admin/pt-applications"
        />
        <StatCard
          label="활성 회원"
          value={activeMembers}
          href="/admin/members"
        />
      </div>

      {isSuper && pendingFc > 0 && (
        <Link
          href="/admin/admins"
          className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 transition-colors hover:bg-amber-100"
        >
          <span className="text-sm font-medium text-amber-800">
            승인 대기 중인 FC가 {pendingFc}명 있습니다.
          </span>
          <span className="text-sm font-semibold text-amber-800">확인 →</span>
        </Link>
      )}

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
