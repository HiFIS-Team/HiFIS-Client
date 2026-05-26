"use client";

import { PageTitle } from "../PageTitle";
import { useEffect, useState } from "react";
import {
  BuildingOffice2Icon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import { deleteMember, getAdminMembers } from "@/lib/api/members";
import { cancelHold } from "@/lib/api/holds";
import { getMembershipPasses } from "@/lib/api/passes";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { StatusBadge, STATUS_FILTERS } from "@/components/StatusBadge";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { Td, Th, TableMessage } from "@/components/Table";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { Member } from "@/lib/api/types";
import { HoldDialog } from "../HoldDialog";
import { MemberDetailDialog } from "./MemberDetailDialog";
import { MemberEditDialog } from "./MemberEditDialog";

export default function AdminMembersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [viewTarget, setViewTarget] = useState<Member | null>(null);
  const [holdTarget, setHoldTarget] = useState<Member | null>(null);
  const [cancelHoldTarget, setCancelHoldTarget] = useState<Member | null>(null);

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

  // 이용 기간 대신 회원권명을 표시 — 지점별 회원권 목록을 모아 id→이름 맵 구성
  const passQueries = useQueries({
    queries: (branchesQuery.data ?? []).map((b) => ({
      queryKey: ["membership-passes", b.id],
      queryFn: () => getMembershipPasses(b.id),
    })),
  });
  function membershipPassName(id: string): string {
    for (const q of passQueries) {
      const hit = q.data?.find((p) => p.id === id);
      if (hit) return hit.name;
    }
    return "-";
  }

  // SUPER_ADMIN 지점 필터 ("" = 전체). FC는 토큰 기준 자동 분기.
  const [branchFilter, setBranchFilter] = useState("");
  const branchId = isSuper ? branchFilter || undefined : undefined;
  // 상태 필터 ("" = 전체) — 데이터가 이미 로드돼 있어 화면에서 거름
  const [statusFilter, setStatusFilter] = useState("");
  // 검색 — 입력이 숫자(전화번호)면 phone=, 이름이면 name= 으로 백엔드 검색 (디바운스 300ms)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const isPhoneSearch = /^[\d-]+$/.test(debouncedSearch);
  const searchName =
    debouncedSearch && !isPhoneSearch ? debouncedSearch : undefined;
  const searchPhone =
    debouncedSearch && isPhoneSearch ? debouncedSearch : undefined;

  const membersQuery = useQuery({
    queryKey: [
      "admin",
      "members",
      branchId ?? "all",
      searchName ?? "",
      searchPhone ?? "",
    ],
    queryFn: () => getAdminMembers(branchId, searchName, searchPhone),
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

  const cancelHoldMutation = useMutation({
    mutationFn: (id: string) =>
      cancelHold({ source_type: "MEMBER", source_id: id }),
    onSuccess: () => {
      toast.success("홀딩이 취소되었습니다.");
      setCancelHoldTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // 행의 [홀딩] 클릭 — 상태에 따라 분기 (만료: 안내 / 홀딩: 취소 / 유효: 등록)
  function handleHoldClick(m: Member) {
    if (m.status === "EXPIRED") {
      toast.error("만료자입니다.");
      return;
    }
    if (m.status === "HELD") {
      setCancelHoldTarget(m);
      return;
    }
    setHoldTarget(m);
  }

  const branchName = (id: string) =>
    branchesQuery.data?.find((b) => b.id === id)?.name ?? "-";

  const members = membersQuery.data ?? [];
  const visibleMembers = statusFilter
    ? members.filter((m) => m.status === statusFilter)
    : members;

  return (
    <div>
      <PageTitle title="회원 조회" />
      <p className="mt-1 text-sm text-gray-500">
        키오스크 회원가입 신청서로 접수된 회원입니다.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {isSuper && (
          <div className="w-48">
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
        )}
        <div className="w-48">
          <Select
            id="status-filter"
            label="상태"
            icon={FunnelIcon}
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="w-64">
          <TextField
            id="search"
            label="검색"
            icon={MagnifyingGlassIcon}
            type="search"
            placeholder="이름 또는 전화번호"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        {membersQuery.isLoading ? (
          <TableMessage variant="loading">불러오는 중…</TableMessage>
        ) : membersQuery.isError ? (
          <TableMessage variant="error">목록을 불러오지 못했습니다.</TableMessage>
        ) : visibleMembers.length === 0 ? (
          <TableMessage>등록된 회원이 없습니다.</TableMessage>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              총{" "}
              <span className="font-semibold text-gray-700">
                {visibleMembers.length}
              </span>
              건
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
                <tr>
                  <Th>지점</Th>
                  <Th>이름</Th>
                  <Th>전화번호</Th>
                  <Th>상태</Th>
                  <Th>회원권</Th>
                  <Th>결제 금액</Th>
                  <Th>신청일</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleMembers.map((m) => (
                  <tr key={m.id} className="text-gray-800">
                    <Td>{branchName(m.branch_id)}</Td>
                    <Td className="font-medium">{m.name}</Td>
                    <Td>{formatPhone(m.phone)}</Td>
                    <Td>
                      <StatusBadge status={m.status} />
                    </Td>
                    <Td>{membershipPassName(m.membership_pass_id)}</Td>
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
                        <RowActionButton onClick={() => handleHoldClick(m)}>
                          홀딩
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
          </>
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

      {holdTarget && (
        <HoldDialog
          key={holdTarget.id}
          sourceType="MEMBER"
          sourceId={holdTarget.id}
          name={holdTarget.name}
          phone={holdTarget.phone}
          onClose={() => setHoldTarget(null)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["admin", "members"] })
          }
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

      <ConfirmDialog
        open={cancelHoldTarget !== null}
        title="홀딩 취소"
        message={
          cancelHoldTarget
            ? `${cancelHoldTarget.name}님의 홀딩을 취소하시겠습니까?`
            : ""
        }
        confirmLabel="홀딩 취소"
        loading={cancelHoldMutation.isPending}
        onConfirm={() => {
          if (cancelHoldTarget) cancelHoldMutation.mutate(cancelHoldTarget.id);
        }}
        onCancel={() => setCancelHoldTarget(null)}
      />
    </div>
  );
}
