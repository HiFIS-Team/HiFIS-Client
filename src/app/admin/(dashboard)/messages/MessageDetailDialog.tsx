"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/branches";
import { SOURCE_TYPE_LABELS, TRIGGER_LABELS } from "@/lib/api/messages";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { Message } from "@/lib/api/types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5 text-sm">
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd className="flex-1 text-gray-900">{children}</dd>
    </div>
  );
}

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

// 알림톡 상세 정보 모달 (읽기 전용) — 내용 전문 포함.
export function MessageDetailDialog({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const branchName =
    branchesQuery.data?.find((b) => b.id === message.branch_id)?.name ?? "-";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-200 px-6 py-4 text-lg font-bold text-gray-900">
          알림톡 상세
        </h2>

        <dl className="divide-y divide-gray-100 overflow-y-auto px-6 py-3">
          <Row label="발송 시각">{formatDateTime(message.sent_at)}</Row>
          <Row label="지점">{branchName}</Row>
          <Row label="수신자">{formatPhone(message.recipient)}</Row>
          <Row label="종류">
            {TRIGGER_LABELS[message.trigger_type] ?? message.trigger_type}
          </Row>
          <Row label="발생 출처">
            {SOURCE_TYPE_LABELS[message.source_type] ?? message.source_type}
          </Row>
          <Row label="상태">
            <MsgStatusBadge status={message.status} />
          </Row>
          <Row label="내용">
            <p className="whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </Row>
        </dl>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
