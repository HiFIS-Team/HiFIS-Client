"use client";

import { PageTitle } from "../PageTitle";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BuildingOffice2Icon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import {
  approveAdmin,
  deleteAdmin,
  getAdmins,
  rejectAdmin,
} from "@/lib/api/admins";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { Select } from "@/components/Select";
import { TableMessage, TableSkeleton } from "@/components/Table";
import { adminRoleLabel, formatDate, timeAgo } from "@/lib/format";
import type { Admin } from "@/lib/api/types";

// 관리자 계정 상태 배지
function AdminStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "활성", cls: "bg-green-100 text-green-700" },
    PENDING_APPROVAL: { label: "승인 대기", cls: "bg-amber-100 text-amber-700" },
    PENDING_EMAIL: {
      label: "이메일 인증 대기",
      cls: "bg-gray-100 text-gray-600",
    },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export default function AdminAdminsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";
  // 지점 필터 ("" = 전체)
  const [branchFilter, setBranchFilter] = useState("");

  const adminsQuery = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => getAdmins(),
    enabled: isSuper,
    // FC 가입 신청 들어오면 새로고침 없이 보이게 — 30초마다 폴링 (탭 백그라운드는 제외)
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    enabled: isSuper,
  });

  // 거부·삭제는 확인 모달 — 어떤 동작인지 함께 보관
  const [confirmTarget, setConfirmTarget] = useState<{
    action: "reject" | "delete";
    admin: Admin;
  } | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "admins"] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveAdmin(id),
    onSuccess: () => {
      toast.success("가입을 승인했습니다.");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectAdmin(id),
    onSuccess: () => {
      toast.success("가입을 거부했습니다.");
      setConfirmTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      toast.success("계정을 삭제했습니다.");
      setConfirmTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // 권한 가드 — FC는 접근 불가
  if (meQuery.data && !isSuper) {
    return (
      <div>
        <PageTitle title="관리자 관리" />
        <p className="mt-2 text-gray-600">대표 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const branchName = (id: string | null) =>
    id ? (branchesQuery.data?.find((b) => b.id === id)?.name ?? "-") : "-";
  const admins = adminsQuery.data ?? [];
  // 지점 필터 — 대표(SUPER_ADMIN)는 지점과 무관하므로 항상 표시
  // 정렬 — 대표는 항상 맨 위, FC 는 가입(created_at) 오름차순
  const visibleAdmins = admins
    .filter(
      (a) =>
        !branchFilter ||
        a.role === "SUPER_ADMIN" ||
        a.branch_id === branchFilter,
    )
    .slice()
    .sort((a, b) => {
      if (a.role === "SUPER_ADMIN" && b.role !== "SUPER_ADMIN") return -1;
      if (a.role !== "SUPER_ADMIN" && b.role === "SUPER_ADMIN") return 1;
      // 같은 role 안에서는 가입순(created_at 오름차순)
      return a.created_at.localeCompare(b.created_at);
    });

  return (
    <div>
      <PageTitle title="관리자 관리" />
      <p className="mt-1 text-sm text-gray-500">
        FC 가입 승인·거부 및 계정 관리.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
        <Select
          id="branch-filter"
          label="지점"
          icon={BuildingOffice2Icon}
          options={[
            { value: "", label: "전체 지점" },
            ...(branchesQuery.data ?? []).map((b) => ({
              value: b.id,
              label: b.name,
            })),
          ]}
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {adminsQuery.isLoading ? (
          <TableSkeleton />
        ) : adminsQuery.isError ? (
          <TableMessage variant="error">목록을 불러오지 못했습니다.</TableMessage>
        ) : visibleAdmins.length === 0 ? (
          <TableMessage>관리자가 없습니다.</TableMessage>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAdmins.map((a) => (
              <article
                key={a.id}
                className="rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="flex items-center gap-2 truncate text-lg font-bold text-gray-900">
                      {a.name}
                      {a.is_online && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                          title="최근 5분 안에 접속 신호가 있었어요"
                        >
                          <span
                            className="size-1.5 rounded-full bg-green-500"
                            aria-hidden="true"
                          />
                          접속중
                        </span>
                      )}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {adminRoleLabel(a)}
                      {a.branch_id ? ` · ${branchName(a.branch_id)}` : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                      <EnvelopeIcon className="size-4 shrink-0" />
                      <span className="truncate">{a.email}</span>
                    </p>
                    {/* 활성 계정 한정 — 오프라인이면 마지막 접속 시각 표시 */}
                    {!a.is_online && a.status === "ACTIVE" && (
                      <p className="mt-1 text-xs text-gray-400">
                        {a.last_seen_at
                          ? `마지막 접속 ${timeAgo(a.last_seen_at)}`
                          : "접속 기록 없음"}
                      </p>
                    )}
                  </div>
                  <AdminStatusBadge status={a.status} />
                </div>

                <div className="mt-6 flex min-h-[2rem] items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">
                    가입일 {formatDate(a.created_at)}
                  </p>
                  <div className="flex gap-2">
                    {a.status === "PENDING_APPROVAL" ? (
                      <>
                        <RowActionButton
                          onClick={() => approveMutation.mutate(a.id)}
                        >
                          승인
                        </RowActionButton>
                        <RowActionButton
                          variant="danger"
                          onClick={() =>
                            setConfirmTarget({ action: "reject", admin: a })
                          }
                        >
                          거부
                        </RowActionButton>
                      </>
                    ) : a.role === "FC" && a.status === "ACTIVE" ? (
                      <RowActionButton
                        variant="danger"
                        onClick={() =>
                          setConfirmTarget({ action: "delete", admin: a })
                        }
                      >
                        삭제
                      </RowActionButton>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        danger
        title={confirmTarget?.action === "reject" ? "가입 거부" : "계정 삭제"}
        message={
          confirmTarget
            ? confirmTarget.action === "reject"
              ? `${confirmTarget.admin.name}님의 가입 신청을 거부하시겠습니까? 계정이 삭제됩니다.`
              : `${confirmTarget.admin.name}님의 계정을 삭제하시겠습니까?`
            : ""
        }
        confirmLabel={confirmTarget?.action === "reject" ? "거부" : "삭제"}
        loading={rejectMutation.isPending || deleteMutation.isPending}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.action === "reject")
            rejectMutation.mutate(confirmTarget.admin.id);
          else deleteMutation.mutate(confirmTarget.admin.id);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
