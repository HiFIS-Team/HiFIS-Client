"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import { getAdminMessages, TRIGGER_LABELS } from "@/lib/api/messages";
import { RowActionButton } from "@/components/RowActionButton";
import { Select } from "@/components/Select";
import { Td, Th, TableMessage } from "@/components/Table";
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

  const messagesQuery = useQuery({
    queryKey: ["admin", "messages", branchId ?? "all"],
    queryFn: () => getAdminMessages(branchId),
  });

  const branchName = (id: string) =>
    branchesQuery.data?.find((b) => b.id === id)?.name ?? "-";

  const messages = messagesQuery.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">알림톡 이력</h1>
      <p className="mt-1 text-sm text-gray-500">
        발송된 알림톡 기록입니다. (최신순)
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
        {messagesQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : messagesQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : messages.length === 0 ? (
          <TableMessage>발송된 알림톡이 없습니다.</TableMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
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
                {messages.map((m) => (
                  <tr key={m.id} className="text-gray-800">
                    <Td className="text-gray-500">
                      {formatDateTime(m.sent_at)}
                    </Td>
                    <Td>{branchName(m.branch_id)}</Td>
                    <Td>{formatPhone(m.recipient)}</Td>
                    <Td>{TRIGGER_LABELS[m.trigger_type] ?? m.trigger_type}</Td>
                    <Td>
                      <MsgStatusBadge status={m.status} />
                    </Td>
                    <Td>
                      <span className="block max-w-sm truncate text-gray-600">
                        {m.content}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <RowActionButton
                          variant="neutral"
                          onClick={() => setViewTarget(m)}
                        >
                          보기
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
        <MessageDetailDialog
          key={viewTarget.id}
          message={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
