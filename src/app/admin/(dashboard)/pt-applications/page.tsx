"use client";

import { useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import {
  deletePtApplication,
  getAdminPtApplications,
} from "@/lib/api/ptApplications";
import { getPtPasses } from "@/lib/api/passes";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { Select } from "@/components/Select";
import { Td, Th, TableMessage } from "@/components/Table";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { PTApplication } from "@/lib/api/types";
import { HoldDialog } from "../HoldDialog";
import { PtDetailDialog } from "./PtDetailDialog";
import { PtEditDialog } from "./PtEditDialog";

export default function AdminPtApplicationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<PTApplication | null>(null);
  const [editTarget, setEditTarget] = useState<PTApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<PTApplication | null>(null);
  const [holdTarget, setHoldTarget] = useState<PTApplication | null>(null);

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  // 이용 기간 대신 수강권명을 표시 — 지점별 PT 수강권 목록을 모아 id→이름 맵 구성
  const passQueries = useQueries({
    queries: (branchesQuery.data ?? []).map((b) => ({
      queryKey: ["pt-passes", b.id],
      queryFn: () => getPtPasses(b.id),
    })),
  });
  function ptPassName(id: string): string {
    for (const q of passQueries) {
      const hit = q.data?.find((p) => p.id === id);
      if (hit) return hit.name;
    }
    return "-";
  }

  // SUPER_ADMIN 지점 필터 ("" = 전체). FC는 토큰 기준 자동 분기.
  const [branchFilter, setBranchFilter] = useState("");
  const branchId = isSuper ? branchFilter || undefined : undefined;

  const ptQuery = useQuery({
    queryKey: ["admin", "pt-applications", branchId ?? "all"],
    queryFn: () => getAdminPtApplications(branchId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePtApplication(id),
    onSuccess: () => {
      toast.success("PT 신청이 삭제되었습니다.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "pt-applications"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const branchName = (id: string) =>
    branchesQuery.data?.find((b) => b.id === id)?.name ?? "-";

  const applications = ptQuery.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">PT 신청 조회</h1>
      <p className="mt-1 text-sm text-gray-500">
        키오스크 PT 신청서로 접수된 개인 레슨 신청입니다.
      </p>

      {isSuper && (
        <div className="mt-5 max-w-xs">
          <Select
            id="branch-filter"
            label="지점"
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
      )}

      <div className="mt-6">
        {ptQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : ptQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : applications.length === 0 ? (
          <TableMessage>PT 신청이 없습니다.</TableMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>지점</Th>
                  <Th>이름</Th>
                  <Th>전화번호</Th>
                  <Th>상태</Th>
                  <Th>수강권</Th>
                  <Th>결제 금액</Th>
                  <Th>신청일</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((a) => (
                  <tr key={a.id} className="text-gray-800">
                    <Td>{branchName(a.branch_id)}</Td>
                    <Td className="font-medium">{a.name}</Td>
                    <Td>{formatPhone(a.phone)}</Td>
                    <Td>
                      <StatusBadge status={a.status} />
                    </Td>
                    <Td>{ptPassName(a.pt_pass_id)}</Td>
                    <Td>{formatWon(a.final_price)}</Td>
                    <Td className="text-gray-500">{formatDate(a.created_at)}</Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <RowActionButton
                          variant="neutral"
                          onClick={() => setViewTarget(a)}
                        >
                          보기
                        </RowActionButton>
                        <RowActionButton onClick={() => setHoldTarget(a)}>
                          홀딩
                        </RowActionButton>
                        <RowActionButton onClick={() => setEditTarget(a)}>
                          수정
                        </RowActionButton>
                        <RowActionButton
                          variant="danger"
                          onClick={() => setDeleteTarget(a)}
                        >
                          삭제
                        </RowActionButton>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewTarget && (
        <PtDetailDialog
          key={viewTarget.id}
          app={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {editTarget && (
        <PtEditDialog
          key={editTarget.id}
          app={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {holdTarget && (
        <HoldDialog
          key={holdTarget.id}
          sourceType="PT_APPLICATION"
          sourceId={holdTarget.id}
          name={holdTarget.name}
          phone={holdTarget.phone}
          onClose={() => setHoldTarget(null)}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: ["admin", "pt-applications"],
            })
          }
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        danger
        title="PT 신청 삭제"
        message={
          deleteTarget
            ? `${deleteTarget.name}님의 PT 신청을 삭제하시겠습니까?`
            : ""
        }
        confirmLabel="삭제"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
