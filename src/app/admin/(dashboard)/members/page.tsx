"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/branches";
import { deleteMember, getAdminMembers } from "@/lib/api/members";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Td, Th, TableMessage } from "@/components/Table";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { Member } from "@/lib/api/types";

// 회원 상태 배지 — REGISTERED(유효) / EXPIRED(만료)
function StatusBadge({ status }: { status: string }) {
  const active = status === "REGISTERED";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {active ? "유효" : "만료"}
    </span>
  );
}

export default function AdminMembersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const membersQuery = useQuery({
    queryKey: ["admin", "members"],
    queryFn: getAdminMembers,
  });
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => {
      toast.success("회원이 삭제되었습니다.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const branchName = (id: string) =>
    branchesQuery.data?.find((b) => b.id === id)?.name ?? "-";

  const members = membersQuery.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">회원 조회</h1>
      <p className="mt-1 text-sm text-gray-500">
        키오스크 회원가입 신청서로 접수된 회원입니다.
      </p>

      <div className="mt-6">
        {membersQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : membersQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : members.length === 0 ? (
          <TableMessage>등록된 회원이 없습니다.</TableMessage>
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
                {members.map((m) => (
                  <tr key={m.id} className="text-gray-800">
                    <Td>{branchName(m.branch_id)}</Td>
                    <Td className="font-medium">{m.name}</Td>
                    <Td>{formatPhone(m.phone)}</Td>
                    <Td>
                      <StatusBadge status={m.status} />
                    </Td>
                    <Td className="text-gray-500">
                      {formatDate(m.start_date)} ~ {formatDate(m.end_date)}
                    </Td>
                    <Td>{formatWon(m.final_price)}</Td>
                    <Td className="text-gray-500">{formatDate(m.created_at)}</Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
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
        title="회원 삭제"
        message={
          deleteTarget ? `${deleteTarget.name}님을 삭제하시겠습니까?` : ""
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
