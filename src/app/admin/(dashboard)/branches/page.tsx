"use client";

import { PageTitle } from "../PageTitle";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import {
  createBranch,
  getAdminBranches,
  updateBranch,
  type BranchInput,
} from "@/lib/api/branches";
import { getAdminReservations } from "@/lib/api/reservations";
import { getAdminMembers } from "@/lib/api/members";
import { getAdminPtApplications } from "@/lib/api/ptApplications";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { RowActionButton } from "@/components/RowActionButton";
import { TableMessage } from "@/components/Table";
import type { Branch } from "@/lib/api/types";
import { BranchFormDialog } from "./BranchFormDialog";

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

  const branchesQuery = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: getAdminBranches,
    enabled: isSuper,
  });

  // 지점별 요약 — 대시보드와 같은 캐시키를 써서 캐시 공유
  const reservationsQuery = useQuery({
    queryKey: ["admin", "reservations", "all"],
    queryFn: () => getAdminReservations(),
    enabled: isSuper,
  });
  const membersQuery = useQuery({
    queryKey: ["admin", "members", "all"],
    queryFn: () => getAdminMembers(),
    enabled: isSuper,
  });
  const ptQuery = useQuery({
    queryKey: ["admin", "pt-applications", "all"],
    queryFn: () => getAdminPtApplications(),
    enabled: isSuper,
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

  const branches = branchesQuery.data ?? [];
  const reservations = reservationsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const pts = ptQuery.data ?? [];
  const editing = formTarget && formTarget !== "new" ? formTarget : null;

  // 지점별 카운트
  const countBy = <T extends { branch_id: string }>(arr: T[], id: string) =>
    arr.filter((x) => x.branch_id === id).length;

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

      <div className="mt-6 flex justify-end">
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
            {branches.map((b) => (
              <article
                key={b.id}
                className="rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
                    <MapPinIcon className="size-5 text-primary" />
                    {b.name}
                  </h2>
                  <RowActionButton onClick={() => setFormTarget(b)}>
                    수정
                  </RowActionButton>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <PhoneIcon className="size-4" />
                  {b.phone}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-2 py-2.5 text-center">
                  <StatCell label="회원" value={countBy(members, b.id)} />
                  <StatCell label="PT" value={countBy(pts, b.id)} />
                  <StatCell label="예약" value={countBy(reservations, b.id)} />
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  <LinkRow label="카카오 채널" url={b.kakao_url} />
                  <LinkRow label="네이버 플레이스" url={b.naver_place_url} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

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
