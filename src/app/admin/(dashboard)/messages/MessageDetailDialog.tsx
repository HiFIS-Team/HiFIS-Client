"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import { enumLabel } from "@/lib/api/messages";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { Message } from "@/lib/api/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5 text-sm">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="flex-1 text-fg">{children}</dd>
    </div>
  );
}

function MsgStatusBadge({ status }: { status: string }) {
  const ok = status === "SUCCESS";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"
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
  useEscapeKey(onClose);
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const branchName =
    branchesQuery.data?.find((b) => b.id === message.branch_id)?.name ?? "-";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col rounded-xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-line px-6 py-4 text-lg font-bold text-fg">
          알림톡 상세
        </h2>

        <dl className="divide-y divide-line overflow-y-auto px-6 py-3">
          <Row label="발송 시각">{formatDateTime(message.sent_at)}</Row>
          <Row label="지점">{branchName}</Row>
          <Row label="수신자">{formatPhone(message.recipient)}</Row>
          <Row label="종류">
            {enumLabel(enumsQuery.data?.trigger_type, message.trigger_type)}
          </Row>
          <Row label="발생 출처">
            {enumLabel(enumsQuery.data?.source_type, message.source_type)}
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

        <div className="flex justify-end border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-primary bg-primary/15 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/25"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
