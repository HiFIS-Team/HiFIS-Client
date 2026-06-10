"use client";

import { PageTitle } from "../PageTitle";
import { useEffect, useState } from "react";
import {
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
import { getEnums } from "@/lib/api/enums";
import { deleteMessage, enumLabel, getAdminMessages } from "@/lib/api/messages";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { Td, Th, TableMessage, TableSkeleton } from "@/components/Table";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 40;
import { formatDateTime, formatPhone } from "@/lib/format";
import type { Message } from "@/lib/api/types";
import { MessageDetailDialog } from "./MessageDetailDialog";

// 알림톡 발송 상태 배지 — SUCCESS(성공) / FAIL(실패)
function MsgStatusBadge({ status }: { status: string }) {
  const ok = status === "SUCCESS";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "성공" : "실패"}
    </span>
  );
}

export default function AdminMessagesPage() {
  const [viewTarget, setViewTarget] = useState<Message | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const toast = useToast();
  const qc = useQueryClient();

  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId, branches, isSuper } = useBranch();

  // 이력 한 건 삭제 — 발송 내용 자체가 사라지는 게 아니라 어드민에서 보는 기록만 정리.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => {
      toast.success("이력을 삭제했어요.");
      qc.invalidateQueries({ queryKey: ["admin", "messages"] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const triggerTypes = enumsQuery.data?.trigger_type;
  // 종류(trigger_type) 필터 ("" = 전체) — 데이터가 이미 로드돼 있어 화면에서 거름
  const [typeFilter, setTypeFilter] = useState("");
  // 수신자 전화번호 검색 (디바운스 300ms) — 백엔드가 숫자만 추출해 비교
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 페이지 — 필터/검색 변경 시 자동 1페이지로 (React 19: useEffect 안 setState 회피)
  const [page, setPage] = useState(1);
  const filterKey = `${branchId ?? ""}|${debouncedSearch}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const messagesQuery = useQuery({
    queryKey: [
      "admin",
      "messages",
      branchId ?? "all",
      debouncedSearch,
      page,
    ],
    queryFn: () =>
      getAdminMessages({
        branchId,
        phone: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    // 필터·페이지 변경 시 깜빡임 방지
    placeholderData: keepPreviousData,
  });

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name ?? "-";

  const messagesPage = messagesQuery.data;
  const messages = messagesPage?.items ?? [];
  // 종류 필터는 현재 페이지 안에서만 적용 (간단·MVP)
  const filteredMessages = typeFilter
    ? messages.filter((m) => m.trigger_type === typeFilter)
    : messages;

  return (
    <div>
      <PageTitle title="알림톡 이력" />
      <p className="mt-1 text-sm text-gray-500 lg:hidden">
        발송된 알림톡 기록입니다. (최신순)
      </p>

      {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 종류/검색 만. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
        <Select
          id="type-filter"
          label="종류"
          icon={TagIcon}
          options={[
            { value: "", label: "전체 종류" },
            ...(triggerTypes ?? []).map((o) => ({
              value: o.code,
              label: o.label,
            })),
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
        <TextField
          id="search"
          label="검색"
          icon={MagnifyingGlassIcon}
          type="search"
          placeholder="수신자 전화번호"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {messagesQuery.isLoading ? (
          <TableSkeleton />
        ) : messagesQuery.isError ? (
          <TableMessage variant="error">목록을 불러오지 못했습니다.</TableMessage>
        ) : filteredMessages.length === 0 ? (
          <TableMessage>발송된 알림톡이 없습니다.</TableMessage>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <ul className="space-y-3 lg:hidden">
              {filteredMessages.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {enumLabel(triggerTypes, m.trigger_type)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatPhone(m.recipient)}
                      </p>
                    </div>
                    <MsgStatusBadge status={m.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                    {m.content}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {/* 모바일은 좌측 메타를 두 줄(지점 / 시각)로 정돈해 우측 버튼 가로 공간 확보 */}
                    <div className="min-w-0 text-xs text-gray-400">
                      {isSuper && (
                        <p className="truncate">{branchName(m.branch_id)}</p>
                      )}
                      <p className={isSuper ? "mt-0.5" : ""}>
                        {formatDateTime(m.sent_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <RowActionButton
                        variant="neutral"
                        onClick={() => setViewTarget(m)}
                      >
                        보기
                      </RowActionButton>
                      <RowActionButton
                        variant="danger"
                        onClick={() => setDeleteTarget(m)}
                      >
                        삭제
                      </RowActionButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* 데스크탑: 기존 테이블 */}
            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 lg:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
                <tr>
                  <Th>발송 시각</Th>
                  <Th>지점</Th>
                  <Th>수신자</Th>
                  <Th>종류</Th>
                  <Th>상태</Th>
                  <Th>내용</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMessages.map((m) => (
                  <tr key={m.id} className="text-gray-800">
                    <Td className="text-gray-500">
                      {formatDateTime(m.sent_at)}
                    </Td>
                    <Td>{branchName(m.branch_id)}</Td>
                    <Td>{formatPhone(m.recipient)}</Td>
                    <Td>{enumLabel(triggerTypes, m.trigger_type)}</Td>
                    <Td>
                      <MsgStatusBadge status={m.status} />
                    </Td>
                    <Td>
                      <span className="block max-w-[12rem] truncate text-gray-600">
                        {m.content}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <RowActionButton
                          variant="neutral"
                          onClick={() => setViewTarget(m)}
                        >
                          보기
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
            {messagesPage && (
              <Pagination
                page={messagesPage.page}
                pageSize={messagesPage.page_size}
                total={messagesPage.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {viewTarget && (
        <MessageDetailDialog
          key={viewTarget.id}
          message={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        danger
        title="이력 삭제"
        message="이 이력을 삭제하시겠어요?"
        notice="발송된 알림톡이 회수되는 것은 아니며, 어드민의 발송 기록 한 줄만 사라져요."
        confirmLabel="삭제"
        requireText="삭제"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
