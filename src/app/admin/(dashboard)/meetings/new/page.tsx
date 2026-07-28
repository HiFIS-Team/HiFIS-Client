"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  FolderIcon,
  GlobeAltIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../../PageTitle";
import { MeetingEditor } from "./MeetingEditor";

// 새 회의록 작성 페이지.
// 상단 : 뒤로가기 · 공개 범위 셀렉트 · 저장.
// 본문 : 큰 제목 input + Tiptap 에디터 (노션 톤).
// 저장 로직은 API 붙는 시점에 (지금은 alert / placeholder).

type Scope = "company" | "project" | "custom";
const SCOPES: { key: Scope; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { key: "company", label: "전사 공개", icon: GlobeAltIcon },
  { key: "project", label: "프로젝트", icon: FolderIcon },
  { key: "custom", label: "특정 인원", icon: UserGroupIcon },
];

export default function NewMeetingPage() {
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<Scope>("company");

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
          {/* 공개 범위 — 3 옵션 세그먼트 */}
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
            className="rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            저장
          </button>
        </div>
      </div>

      {/* 편집 카드 */}
      <div className="mt-6 rounded-lg border border-line bg-card px-6 py-8 sm:px-10 sm:py-10">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="무제"
          className="w-full bg-transparent text-4xl font-black tracking-tighter text-fg placeholder-muted/60 focus:outline-none"
        />
        <div className="mt-6">
          <MeetingEditor />
        </div>
      </div>
    </div>
  );
}
