"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { useBranch } from "@/providers/BranchProvider";
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
import { TableMessage, TableSkeleton } from "@/components/Table";
import { adminRoleLabel, formatDate, timeAgo } from "@/lib/format";
import type { Admin, Branch } from "@/lib/api/types";
import { PageTitle } from "../PageTitle";

// 대표(SUPER_ADMIN) 표시 순서 — 운영진 우선순위. 목록에 없는 이름은 뒤로.
const SUPER_ADMIN_ORDER = ["이준경", "이준승", "문명진", "김은후"];
function superAdminRank(name: string): number {
  const idx = SUPER_ADMIN_ORDER.indexOf(name);
  return idx === -1 ? SUPER_ADMIN_ORDER.length : idx;
}

// SUPER_ADMIN 라벨 그룹 순서 — 대표 → 관리자 → (그 외).
const SUPER_ADMIN_LABEL_ORDER = ["대표", "관리자"];
function superAdminLabelRank(label: string): number {
  const idx = SUPER_ADMIN_LABEL_ORDER.indexOf(label);
  return idx === -1 ? SUPER_ADMIN_LABEL_ORDER.length : idx;
}

// FC 지점 표시 순서 — 사장님이 요청한 운영 우선순위.
const BRANCH_ORDER = ["화순", "첨단", "동광주"];
function branchRank(branchId: string | null, branches: Branch[]): number {
  if (!branchId) return BRANCH_ORDER.length;
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return BRANCH_ORDER.length;
  const idx = BRANCH_ORDER.findIndex((kw) => branch.name.includes(kw));
  return idx === -1 ? BRANCH_ORDER.length : idx;
}

// FC 직책 표시 순서 — 점장 → 팀장 → 트레이너 → FC.
const POSITION_ORDER = ["MANAGER", "TEAM_LEADER", "TRAINER", "FC"];
function positionRank(position: string | null): number {
  if (!position) return POSITION_ORDER.length;
  const idx = POSITION_ORDER.indexOf(position);
  return idx === -1 ? POSITION_ORDER.length : idx;
}

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

// 관리자 관리 화면의 실제 내용 — MobileSubPage wrapper 와 분리.
// 라우트(/admin/admins) 와 프로필 인라인 패널 양쪽에서 사용.
export function AdminsContent() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { selectedBranchId: branchId, branches, isSuper } = useBranch();

  const adminsQuery = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => getAdmins(),
    enabled: isSuper,
    // FC 가입 신청 들어오면 새로고침 없이 보이게 — 30초마다 폴링 (탭 백그라운드는 제외)
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
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

  if (!isSuper) {
    return (
      <>
        <PageTitle title="관리자 관리" />
        <p className="mt-2 text-gray-600">대표 관리자만 접근할 수 있습니다.</p>
      </>
    );
  }

  const branchName = (id: string | null) =>
    id ? (branches.find((b) => b.id === id)?.name ?? "-") : "-";
  const admins = adminsQuery.data ?? [];
  // 글로벌 지점 필터 — SUPER_ADMIN 본인은 지점 무관이라 항상 표시
  // 정렬 규칙:
  //   1) SUPER_ADMIN 이 항상 맨 위
  //   2) SUPER_ADMIN 끼리는 라벨(대표 → 관리자 → 기타) → 운영진 우선순위 → 가입순
  //   3) FC 는 지점(화순 → 첨단 → 동광주) → 직책(점장 → 팀장 → 트레이너 → FC) → 가입순
  const visibleAdmins = admins
    .filter(
      (a) =>
        !branchId ||
        a.role === "SUPER_ADMIN" ||
        a.branch_id === branchId,
    )
    .slice()
    .sort((a, b) => {
      if (a.role === "SUPER_ADMIN" && b.role !== "SUPER_ADMIN") return -1;
      if (a.role !== "SUPER_ADMIN" && b.role === "SUPER_ADMIN") return 1;
      if (a.role === "SUPER_ADMIN" && b.role === "SUPER_ADMIN") {
        const la = superAdminLabelRank(adminRoleLabel(a));
        const lb = superAdminLabelRank(adminRoleLabel(b));
        if (la !== lb) return la - lb;
        const ra = superAdminRank(a.name);
        const rb = superAdminRank(b.name);
        if (ra !== rb) return ra - rb;
        return a.created_at.localeCompare(b.created_at);
      }
      // FC 끼리 — 지점 → 직책 → 가입순
      const ba = branchRank(a.branch_id, branches);
      const bb = branchRank(b.branch_id, branches);
      if (ba !== bb) return ba - bb;
      const pa = positionRank(a.position);
      const pb = positionRank(b.position);
      if (pa !== pb) return pa - pb;
      return a.created_at.localeCompare(b.created_at);
    });

  return (
    <>
      <PageTitle title="관리자 관리" />
      <p className="hidden">FC 가입 승인·거부 및 계정 관리.</p>

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
                      {/* 활성 계정 한정 — online 이면 녹색 "접속중", offline 이면
                          회색으로 마지막 접속 시각 (예: "방금 전", "5분 전").
                          last_seen_at 이 아예 없으면 칩 자체를 안 보임 (신규/대기 계정) */}
                      {a.status === "ACTIVE" && (a.is_online || a.last_seen_at) && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.is_online
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                          title={
                            a.is_online
                              ? "최근 5분 안에 접속 신호가 있었어요"
                              : a.last_seen_at
                                ? `마지막 접속: ${a.last_seen_at}`
                                : undefined
                          }
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              a.is_online ? "bg-green-500" : "bg-gray-400"
                            }`}
                            aria-hidden="true"
                          />
                          {a.is_online ? "접속중" : timeAgo(a.last_seen_at!)}
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
                    ) : a.role === "FC" &&
                      (a.status === "ACTIVE" ||
                        a.status === "PENDING_EMAIL") ? (
                      // ACTIVE 는 정상 FC 계정 정리용,
                      // PENDING_EMAIL 은 이메일 인증 안 끝낸 채 방치된 row 청소용
                      // (같은 사람이 재가입하면 두 row 가 같이 떠 보임)
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
        requireText={confirmTarget?.action === "reject" ? "거부" : "삭제"}
        loading={rejectMutation.isPending || deleteMutation.isPending}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.action === "reject")
            rejectMutation.mutate(confirmTarget.admin.id);
          else deleteMutation.mutate(confirmTarget.admin.id);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
