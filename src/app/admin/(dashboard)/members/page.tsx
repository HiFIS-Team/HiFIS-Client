"use client";

import { PageTitle } from "../PageTitle";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BuildingOffice2Icon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { deleteMember, getAdminMember, getAdminMembers } from "@/lib/api/members";
import { cancelHold } from "@/lib/api/holds";
import { getMembershipPasses } from "@/lib/api/passes";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { useBranch } from "@/providers/BranchProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { StatusBadge, STATUS_FILTERS } from "@/components/StatusBadge";
import { CATEGORY_FILTERS } from "@/components/CategoryBadge";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { Td, Th, TableMessage, TableSkeleton } from "@/components/Table";
import { Pagination } from "@/components/Pagination";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { Member } from "@/lib/api/types";

const PAGE_SIZE = 40;
import { HoldDialog } from "../HoldDialog";
import { MemberDetailDialog } from "./MemberDetailDialog";
import { MemberEditDialog } from "./MemberEditDialog";

export default function AdminMembersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 푸시 알림 클릭 → /admin/members?detail=<id> 로 진입한 경우 단건 fetch → 상세 다이얼로그 자동 오픈
  const detailId = searchParams.get("detail");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [viewTarget, setViewTarget] = useState<Member | null>(null);
  const [holdTarget, setHoldTarget] = useState<Member | null>(null);
  const [cancelHoldTarget, setCancelHoldTarget] = useState<Member | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "members", "detail", detailId],
    queryFn: () => getAdminMember(detailId!),
    enabled: !!detailId,
    retry: false,
  });
  // detail fetch 성공 → viewTarget 으로 다이얼로그 자동 오픈.
  // 추가로 sessionStorage 에 "이번 탭 세션에서 소비한 detail id" 를 기록 → 어떤 이유로든
  // URL 에 ?detail 이 남아있거나 다른 페이지 다녀와도 다시 자동 오픈되지 않게 함.
  // (router.replace 만으로 안 풀리던 케이스 대비)
  useEffect(() => {
    if (!detailQuery.data || detailQuery.data.id !== detailId) return;
    const consumedKey = `admin-detail-consumed:member:${detailId}`;
    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(consumedKey)
    ) {
      // 이미 소비된 ID — URL 만 정리하고 종료
      router.replace(pathname);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewTarget(detailQuery.data);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(consumedKey, "1");
    }
    router.replace(pathname);
  }, [detailQuery.data, detailId, router, pathname]);
  // 실패 (404·권한 등) → 안내 + URL 정리
  useEffect(() => {
    if (detailQuery.isError && detailId) {
      toast.error("해당 회원을 찾을 수 없습니다.");
      router.replace(pathname);
    }
  }, [detailQuery.isError, detailId, toast, router, pathname]);

  // 상세 다이얼로그 닫기 — URL 의 ?detail 정리.
  // consumedKey 는 일부러 제거하지 않음 (탭 세션 동안 유지) :
  // 알림 → 다이얼로그 자동 오픈 → 닫음 → 다른 메뉴 갔다가 회원 페이지로 돌아왔을 때
  // 어떤 경로로든 URL 에 ?detail=ABC 가 다시 들어오는 케이스(router.replace 가 안 먹는 케이스,
  // 캐시된 RSC URL, 브라우저 뒤로가기 등) 에서 또 자동 오픈되던 문제가 있었음.
  // 같은 알림을 다시 보고 싶으면 사용자가 직접 회원 페이지에서 찾으면 됨.
  function closeView() {
    setViewTarget(null);
    if (detailId) router.replace(pathname);
  }

  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId, branches, isSuper } = useBranch();

  // 회원권명 표시용 — 현재 선택 지점의 회원권 목록만 받음 (전체 지점 의미 없음).
  const passesQuery = useQuery({
    queryKey: ["membership-passes", branchId ?? "none"],
    queryFn: () => getMembershipPasses(branchId!),
    enabled: !!branchId,
  });
  function membershipPassName(id: string): string {
    return passesQuery.data?.find((p) => p.id === id)?.name ?? "-";
  }
  // 상태 필터 ("" = 전체) — 현재 페이지 내에서만 client-side로 거름 (간단·MVP).
  // 정확한 상태별 카운트는 대시보드 summary 참조.
  const [statusFilter, setStatusFilter] = useState("");
  // 구분 필터 — NEW(신규)/EXISTING(기존) 또는 "" (전체). 상태 필터와 동일하게 client-side.
  const [categoryFilter, setCategoryFilter] = useState("");
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

  // 페이지 — 필터/검색 변경 시 자동 1페이지로 (React 19: useEffect 안 setState 회피)
  const [page, setPage] = useState(1);
  const filterKey = `${branchId ?? ""}|${searchName}|${searchPhone}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const membersQuery = useQuery({
    queryKey: [
      "admin",
      "members",
      branchId ?? "all",
      searchName ?? "",
      searchPhone ?? "",
      page,
    ],
    queryFn: () =>
      getAdminMembers({
        branchId,
        name: searchName,
        phone: searchPhone,
        page,
        pageSize: PAGE_SIZE,
      }),
    // 필터·페이지 변경 시 깜빡임 방지 — 새 데이터 도착할 때까지 이전 페이지 유지
    placeholderData: keepPreviousData,
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

  // 카드·테이블에 지점명 노출 — 글로벌 셀렉터 도입 후엔 항상 같은 지점이라
  // 사실상 단일 값이지만 모바일 카드 메타에 그대로 표시.
  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name ?? "-";

  const membersPage = membersQuery.data;
  const members = membersPage?.items ?? [];
  // 상태·구분 필터는 현재 페이지 안에서만 적용 (페이지네이션과 동시 적용은 백엔드 필터 필요 — 우선 client-side)
  const visibleMembers = members.filter(
    (m) =>
      (!statusFilter || m.status === statusFilter) &&
      (!categoryFilter || m.category === categoryFilter),
  );

  return (
    <div>
      <PageTitle title="회원 조회" />
      <p className="hidden">
        회원가입 신청서로 접수된 회원입니다.
      </p>

      {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 상태/구분/검색 만. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
        <Select
          id="status-filter"
          label="상태"
          icon={FunnelIcon}
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          id="category-filter"
          label="구분"
          icon={FunnelIcon}
          options={CATEGORY_FILTERS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
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

      <div className="mt-6">
        {membersQuery.isLoading ? (
          <TableSkeleton />
        ) : membersQuery.isError ? (
          <TableMessage variant="error">목록을 불러오지 못했습니다.</TableMessage>
        ) : visibleMembers.length === 0 ? (
          <TableMessage>등록된 회원이 없습니다.</TableMessage>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <ul className="space-y-3 lg:hidden">
              {visibleMembers.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {m.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatPhone(m.phone)}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-sm">
                    <p className="text-gray-700">
                      <span className="text-gray-400">회원권 </span>
                      {membershipPassName(m.membership_pass_id)}
                      <span className="ml-2 text-gray-400">·</span>
                      <span className="ml-2">{formatWon(m.final_price)}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {isSuper && (
                        <>
                          {branchName(m.branch_id)}
                          <span className="mx-1.5">·</span>
                        </>
                      )}
                      신청일 {formatDate(m.created_at)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                </li>
              ))}
            </ul>

            {/* 데스크탑: 기존 테이블 */}
            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 lg:block">
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
            {membersPage && (
              <Pagination
                page={membersPage.page}
                pageSize={membersPage.page_size}
                total={membersPage.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {viewTarget && (
        <MemberDetailDialog
          key={viewTarget.id}
          member={viewTarget}
          onClose={closeView}
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
        requireText="삭제"
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
