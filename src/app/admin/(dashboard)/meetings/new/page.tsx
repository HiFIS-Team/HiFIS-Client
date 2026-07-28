"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  GlobeAltIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../../PageTitle";
import { MeetingEditor } from "./MeetingEditor";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { createMeeting, type MeetingScope } from "@/lib/api/v2/meetings";

// 새 회의록 작성 페이지.
// 저장 시 POST /meetings — tiptap JSON blocks 를 그대로 보냄.
// meetingAt 은 현재 시각을 기본값 (지금 시점의 회의로 간주). 향후 날짜 피커 붙일 수 있음.

const SCOPES: {
  key: MeetingScope;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { key: "COMPANY", label: "전사 공개", icon: GlobeAltIcon },
  { key: "PROJECT", label: "프로젝트", icon: FolderIcon },
  { key: "PEOPLE", label: "특정 인원", icon: UserGroupIcon },
];

export default function NewMeetingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<MeetingScope>("COMPANY");
  const [blocks, setBlocks] = useState<unknown[]>([]);

  const mutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "meetings"] });
      router.push(`/admin/meetings/detail?id=${created.id}`);
    },
  });

  const canSave = title.trim().length > 0 && !mutation.isPending;

  function save() {
    if (!canSave) return;
    mutation.mutate({
      title: title.trim(),
      blocks,
      scope,
      attendeeIds: [],
      projectId: null,
      meetingAt: new Date().toISOString(),
    });
  }

  return (
    <div>
      <PageTitle title="새 회의록" />

      {/* 상단 : 뒤로가기 · 공개 범위 · 저장 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/meetings"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-fg"
        >
          <ChevronLeftIcon className="size-4" />
          회의록 목록
        </Link>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-line p-0.5">
            {SCOPES.map((s) => {
              const active = scope === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScope(s.key)}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-card-hover text-fg"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {mutation.isError && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          {getV2ErrorMessage(mutation.error)}
        </div>
      )}

      {/* 편집 카드 */}
      <div className="mt-6 rounded-lg border border-line bg-card px-6 py-8 sm:px-10 sm:py-10">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="무제"
          className="w-full bg-transparent text-4xl font-black tracking-tighter text-fg placeholder-muted/60 focus:outline-none"
        />
        <div className="mt-6">
          <MeetingEditor onChange={setBlocks} />
        </div>
      </div>
    </div>
  );
}
