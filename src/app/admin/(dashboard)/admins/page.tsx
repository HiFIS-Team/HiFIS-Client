"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Td, Th, TableMessage } from "@/components/Table";
import type { Admin } from "@/lib/api/types";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "대표",
  FC: "FC",
};

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

  const adminsQuery = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: getAdmins,
    enabled: isSuper,
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
        <h1 className="text-2xl font-bold text-gray-900">관리자 관리</h1>
        <p className="mt-2 text-gray-600">대표 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const branchName = (id: string | null) =>
    id ? (branchesQuery.data?.find((b) => b.id === id)?.name ?? "-") : "-";
  const admins = adminsQuery.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">관리자 관리</h1>
      <p className="mt-1 text-sm text-gray-500">
        FC 가입 승인·거부 및 계정 관리.
      </p>

      <div className="mt-6">
        {adminsQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : adminsQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : admins.length === 0 ? (
          <TableMessage>관리자가 없습니다.</TableMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>이름</Th>
                  <Th>이메일</Th>
                  <Th>역할</Th>
                  <Th>지점</Th>
                  <Th>상태</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((a) => (
                  <tr key={a.id} className="text-gray-800">
                    <Td className="font-medium">{a.name}</Td>
                    <Td>{a.email}</Td>
                    <Td>{ROLE_LABEL[a.role] ?? a.role}</Td>
                    <Td>{branchName(a.branch_id)}</Td>
                    <Td>
                      <AdminStatusBadge status={a.status} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
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
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
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
