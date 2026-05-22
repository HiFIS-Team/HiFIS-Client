"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/branches";
import { deleteReservation, getAdminReservations } from "@/lib/api/reservations";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Reservation } from "@/lib/api/types";

// 전화번호 숫자 → 하이픈 형식
function formatPhone(value: string): string {
  const n = value.replace(/\D/g, "");
  if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  return value;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR");
}

export default function AdminReservationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);

  const reservationsQuery = useQuery({
    queryKey: ["admin", "reservations"],
    queryFn: getAdminReservations,
  });
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReservation(id),
    onSuccess: () => {
      toast.success("예약이 삭제되었습니다.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const branchName = (id: string) =>
    branchesQuery.data?.find((b) => b.id === id)?.name ?? "-";

  const reservations = reservationsQuery.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">예약 신청 조회</h1>
      <p className="mt-1 text-sm text-gray-500">
        네이버 플레이스를 통해 접수된 방문 예약입니다.
      </p>

      <div className="mt-6">
        {reservationsQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : reservationsQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : reservations.length === 0 ? (
          <TableMessage>예약 신청이 없습니다.</TableMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>지점</Th>
                  <Th>이름</Th>
                  <Th>전화번호</Th>
                  <Th>방문 예정일</Th>
                  <Th>신청일</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reservations.map((r) => (
                  <tr key={r.id} className="text-gray-800">
                    <Td>{branchName(r.branch_id)}</Td>
                    <Td className="font-medium">{r.name}</Td>
                    <Td>{formatPhone(r.phone)}</Td>
                    <Td>{formatDate(r.visit_date)}</Td>
                    <Td className="text-gray-500">{formatDate(r.created_at)}</Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(r)}
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
        title="예약 삭제"
        message={
          deleteTarget
            ? `${deleteTarget.name}님의 예약을 삭제하시겠습니까?`
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

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 font-medium whitespace-nowrap">{children}</th>
  );
}
function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 whitespace-nowrap ${className}`}>{children}</td>
  );
}
function TableMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-16 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}
