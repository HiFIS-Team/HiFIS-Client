"use client";

import { PageTitle } from "../PageTitle";
import { useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BoltIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import {
  createBranch,
  getAdminBranches,
  updateBranch,
  type BranchInput,
} from "@/lib/api/branches";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { RowActionButton } from "@/components/RowActionButton";
import { TableMessage } from "@/components/Table";
import type { Branch } from "@/lib/api/types";
import { BranchFormDialog } from "./BranchFormDialog";
import { QrDialog } from "./QrDialog";
import { QrCodeIcon } from "@heroicons/react/24/outline";

// 직책 코드 → 한국어 라벨 (백엔드 POSITION_LABELS 와 일치)
const POSITION_LABEL: Record<string, string> = {
  MANAGER: "점장",
  TEAM_LEADER: "팀장",
  TRAINER: "트레이너",
  FC: "FC",
};

// 알림톡 발송자 표시 — 지점 카드에서 사용
function MessengerRow({
  messenger,
}: {
  messenger: Branch["messenger"];
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">알림톡 발송자</span>
      {messenger ? (
        <span className="font-medium text-gray-900">
          {messenger.name}{" "}
          <span className="text-xs text-gray-500">
            ({POSITION_LABEL[messenger.position] ?? messenger.position})
          </span>
        </span>
      ) : (
        <span className="text-gray-400">미설정</span>
      )}
    </div>
  );
}

// 카드 안의 링크 행 — 값이 있으면 새 탭 링크, 없으면 "없음"
function LinkRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          열기 →
        </a>
      ) : (
        <span className="text-gray-400">없음</span>
      )}
    </div>
  );
}

// 카드 안의 요약 셀 — 라벨 + 숫자
function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdminBranchesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  // null=닫힘, "new"=등록, Branch=수정
  const [formTarget, setFormTarget] = useState<Branch | "new" | null>(null);
  const [qrTarget, setQrTarget] = useState<Branch | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: getAdminBranches,
    enabled: isSuper,
  });

  // 전체 요약 (상단 배지용) + 지점별 요약 (카드용) — 모두 /admin/dashboard/summary 사용
  // staleTime 0: 신청 등 변동 즉시 반영
  const overallSummaryQuery = useQuery({
    queryKey: ["admin", "dashboard-summary", "all"],
    queryFn: () => getDashboardSummary(),
    enabled: isSuper,
    staleTime: 0,
  });
  const branches = branchesQuery.data ?? [];
  // 지점별 summary — useQueries 로 병렬 호출
  const branchSummaries = useQueries({
    queries: branches.map((b) => ({
      queryKey: ["admin", "dashboard-summary", b.id],
      queryFn: () => getDashboardSummary(b.id),
      enabled: isSuper,
      staleTime: 0,
    })),
  });

  // 지점 목록은 공개 ["branches"] 캐시도 함께 갱신
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  };

  const createMutation = useMutation({
    mutationFn: (v: BranchInput) => createBranch(v),
    onSuccess: () => {
      toast.success("지점이 등록되었습니다.");
      setFormTarget(null);
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const updateMutation = useMutation({
    mutationFn: (args: { id: string; values: BranchInput }) =>
      updateBranch(args.id, args.values),
    onSuccess: () => {
      toast.success("지점 정보가 수정되었습니다.");
      setFormTarget(null);
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // 권한 가드 — FC는 접근 불가
  if (meQuery.data && !isSuper) {
    return (
      <div>
        <PageTitle title="지점 관리" />
        <p className="mt-2 text-gray-600">대표 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const editing = formTarget && formTarget !== "new" ? formTarget : null;

  // 전체 합계 (상단 배지) — 1번 summary 호출 결과에서 추출
  const overall = overallSummaryQuery.data;
  const totalMembers = overall?.members.total ?? 0;
  const totalPts = overall?.pt_applications.total ?? 0;
  const totalReservations = overall?.reservations.total ?? 0;

  // 지점별 카운트 — branches.map index 와 같은 순서로 들어옴
  function countsFor(idx: number): {
    members: number;
    pts: number;
    reservations: number;
  } {
    const s = branchSummaries[idx]?.data;
    return {
      members: s?.members.total ?? 0,
      pts: s?.pt_applications.total ?? 0,
      reservations: s?.reservations.total ?? 0,
    };
  }

  function submitForm(values: BranchInput) {
    if (editing) updateMutation.mutate({ id: editing.id, values });
    else createMutation.mutate(values);
  }

  return (
    <div>
      <PageTitle title="지점 관리" />
      <p className="mt-1 text-sm text-gray-500">
        피트니스스타 지점을 등록·수정합니다.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1">
            <BuildingOffice2Icon className="size-3.5 text-primary" />
            <span className="font-semibold text-gray-900">
              {branches.length}
            </span>
            <span className="text-gray-600">지점</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1">
            <UsersIcon className="size-3.5 text-primary" />
            <span className="font-semibold text-gray-900">{totalMembers}</span>
            <span className="text-gray-600">회원</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1">
            <BoltIcon className="size-3.5 text-primary" />
            <span className="font-semibold text-gray-900">{totalPts}</span>
            <span className="text-gray-600">PT</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1">
            <CalendarIcon className="size-3.5 text-primary" />
            <span className="font-semibold text-gray-900">
              {totalReservations}
            </span>
            <span className="text-gray-600">예약</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          지점 등록
        </button>
      </div>

      <div className="mt-4">
        {branchesQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : branchesQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : branches.length === 0 ? (
          <TableMessage>등록된 지점이 없습니다.</TableMessage>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b, idx) => {
              const c = countsFor(idx);
              return (
              <article
                key={b.id}
                className="rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
                    <MapPinIcon className="size-5 text-primary" />
                    {b.name}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQrTarget(b)}
                      aria-label="QR 코드 보기"
                      title="QR 코드"
                      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <QrCodeIcon className="size-5" />
                    </button>
                    <RowActionButton onClick={() => setFormTarget(b)}>
                      수정
                    </RowActionButton>
                  </div>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <PhoneIcon className="size-4" />
                  {b.phone}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-2 py-2.5 text-center">
                  <StatCell label="회원" value={c.members} />
                  <StatCell label="PT" value={c.pts} />
                  <StatCell label="예약" value={c.reservations} />
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  <LinkRow label="카카오 채널" url={b.kakao_url} />
                  <LinkRow label="네이버 플레이스" url={b.naver_place_url} />
                  <MessengerRow messenger={b.messenger} />
                </div>
              </article>
              );
            })}
          </div>
        )}
      </div>

      {qrTarget && <QrDialog branch={qrTarget} onClose={() => setQrTarget(null)} />}

      <BranchFormDialog
        key={typeof formTarget === "string" ? "new" : (formTarget?.id ?? "closed")}
        open={formTarget !== null}
        title={editing ? "지점 수정" : "지점 등록"}
        initial={editing}
        loading={createMutation.isPending || updateMutation.isPending}
        onSubmit={submitForm}
        onCancel={() => setFormTarget(null)}
      />
    </div>
  );
}
