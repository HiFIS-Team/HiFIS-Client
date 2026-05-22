"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/branches";
import {
  deletePtApplication,
  getAdminPtApplications,
} from "@/lib/api/ptApplications";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Td, Th, TableMessage } from "@/components/Table";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { PTApplication } from "@/lib/api/types";

export default function AdminPtApplicationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<PTApplication | null>(null);

  const ptQuery = useQuery({
    queryKey: ["admin", "pt-applications"],
    queryFn: getAdminPtApplications,
  });
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
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
                  <Th>이용 기간</Th>
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
                    <Td className="text-gray-500">
                      {formatDate(a.start_date)} ~ {formatDate(a.end_date)}
                    </Td>
                    <Td>{formatWon(a.final_price)}</Td>
                    <Td className="text-gray-500">{formatDate(a.created_at)}</Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(a)}
                        className="font-medium text-red-600 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
