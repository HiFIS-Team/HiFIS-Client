"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import { deleteMember, getAdminMembers } from "@/lib/api/members";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { Select } from "@/components/Select";
import { Td, Th, TableMessage } from "@/components/Table";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { Member } from "@/lib/api/types";
import { MemberDetailDialog } from "./MemberDetailDialog";
import { MemberEditDialog } from "./MemberEditDialog";

export default function AdminMembersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [viewTarget, setViewTarget] = useState<Member | null>(null);

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

  // SUPER_ADMIN 지점 필터 ("" = 전체). FC는 토큰 기준 자동 분기.
  const [branchFilter, setBranchFilter] = useState("");
  const branchId = isSuper ? branchFilter || undefined : undefined;

  const membersQuery = useQuery({
    queryKey: ["admin", "members", branchId ?? "all"],
    queryFn: () => getAdminMembers(branchId),
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
                    <Td>
                      <div className="flex justify-end gap-2">
                        <RowActionButton
                          variant="neutral"
                          onClick={() => setViewTarget(m)}
                        >
                          보기
                        </RowActionButton>
                        <RowActionButton onClick={() => setEditTarget(m)}>
                          수정
                        </RowActionButton>
                        <RowActionButton
                          variant="danger"
                          onClick={() => setDeleteTarget(m)}
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
        <MemberDetailDialog
          key={viewTarget.id}
          member={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {editTarget && (
        <MemberEditDialog
          key={editTarget.id}
          member={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

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
