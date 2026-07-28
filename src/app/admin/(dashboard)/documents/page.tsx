"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpTrayIcon,
  ClockIcon,
  DocumentIcon,
  FolderIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";

// 문서함 페이지 — 워크스페이스 필터 · 팀 탭 · 폴더 그리드 · 문서 테이블.
// mock. 실제 업로드/폴더 관리 API 는 다음 스텝.

// ─────────────── mock ───────────────

interface Workspace {
  key: string;
  label: string;
  dotTone?: string; // 컬러 dot, 전체는 없음
}
const WORKSPACES: Workspace[] = [
  { key: "all", label: "전체 문서함" },
  { key: "hinest", label: "HiNest v2", dotTone: "bg-primary" },
  { key: "mkt", label: "마케팅 Q3 캠페인", dotTone: "bg-pink-400" },
  { key: "internal", label: "사내 자료 정리", dotTone: "bg-primary" },
];

type TeamTab = "all" | "product" | "personal" | "custom";
const TEAM_TABS: { key: TeamTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "product", label: "프로덕트팀" },
  { key: "personal", label: "개인" },
  { key: "custom", label: "사용자지정" },
];

interface Folder {
  id: string;
  name: string;
  updated: string;
}
const FOLDERS: Folder[] = [
  { id: "f1", name: "회사 운영", updated: "2026. 1. 29." },
  { id: "f2", name: "개발 자료", updated: "2026. 3. 30." },
  { id: "f3", name: "디자인 리소스", updated: "2026. 4. 29." },
  { id: "f4", name: "내 메모", updated: "2026. 6. 28." },
];

interface Document {
  id: string;
  title: string;
  subtitle: string;
  badge?: { label: string; tone: string }; // 팀 공개 · 개인 등
  tags: string[];
  author: { name: string; tone: string };
  updated: string;
}
const DOCUMENTS: Document[] = [
  {
    id: "d1",
    title: "복리후생 가이드 v3 — 2026 개정",
    subtitle:
      "연차 / 식대 / 교육비 / 자기계발 / 헬스 케어 / 경조사 정책 종합. 2026년 1월 개정안 반영본. 신규 입사자도 첫 주에 한 번 정독 권장.",
    tags: ["HR", "복리후생", "2026개정"],
    author: { name: "김데모", tone: "bg-primary" },
    updated: "2026. 7. 25.",
  },
  {
    id: "d2",
    title: "신규 입사자 온보딩 체크리스트 (1 ~ 2주차)",
    subtitle:
      "Day 1 환경 셋업 / Day 2~5 도메인 학습 / 2주차 첫 PR 머지 까지의 단계별 체크리스트. 메이트 매칭 가이드 포함.",
    tags: ["온보딩", "HR", "체크리스트"],
    author: { name: "김데모", tone: "bg-primary" },
    updated: "2026. 7. 18.",
  },
  {
    id: "d3",
    title: "API 컨벤션 — REST · 에러 · 페이지네이션",
    subtitle:
      "리소스 네이밍 / 동사 사용 / 에러 코드 (4xx / 5xx) / 페이지네이션 (cursor vs offset) / 버전 관리 정책. 전 백엔드 코드 리뷰 시 1차 기준.",
    badge: { label: "팀 공개 · 개발팀", tone: "bg-primary/15 text-primary" },
    tags: ["개발", "API", "컨벤션"],
    author: { name: "박그레이스", tone: "bg-violet-500" },
    updated: "2026. 7. 23.",
  },
  {
    id: "d4",
    title: "디자인 시스템 v2 — Figma 컬러 / 타이포 토큰",
    subtitle:
      "Light / Dark / Brand 3 모드 컬러 토큰. 본문 / 라벨 / 코드 블록 타이포 위계. CSS 변수 매핑표 동봉.",
    badge: { label: "팀 공개 · 디자인팀", tone: "bg-emerald-500/15 text-emerald-400" },
    tags: ["디자인", "토큰", "Figma"],
    author: { name: "이앨리스", tone: "bg-emerald-500" },
    updated: "2026. 7. 27.",
  },
  {
    id: "d5",
    title: "주간 업무 보고 템플릿 — 한 일 / 막힌 것 / 다음",
    subtitle:
      "매주 금요일 17시 까지 작성 / 공유. 한 일 (체크리스트), 막힌 것 (도움 요청), 다음 주 계획 3블록 구성.",
    tags: ["템플릿", "주간보고"],
    author: { name: "김데모", tone: "bg-primary" },
    updated: "2026. 7. 21.",
  },
  {
    id: "d6",
    title: "내 회고 노트 (주간 모음)",
    subtitle:
      "매주 금요일 작성하는 개인 회고. KPT 형식 (Keep / Problem / Try). 분기 말 OKR 회고 원본 데이터로 활용.",
    badge: { label: "개인", tone: "bg-pink-500/15 text-pink-400" },
    tags: ["회고", "KPT", "개인"],
    author: { name: "김데모", tone: "bg-primary" },
    updated: "2026. 7. 28.",
  },
];

// ─────────────── page ───────────────

export default function DocumentsPage() {
  const [workspace, setWorkspace] = useState<string>("all");
  const [teamTab, setTeamTab] = useState<TeamTab>("all");
  const [query, setQuery] = useState("");

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOCUMENTS;
    return DOCUMENTS.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.subtitle.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div>
      <PageTitle title="문서함" />

      {/* 상단 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">자료</p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-fg">
            문서함
          </h1>
          <p className="mt-1 text-sm text-muted">
            회사 규정·양식·매뉴얼 등을 보관하고 공유합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm font-semibold text-fg transition-colors hover:bg-card-hover"
          >
            <PlusIcon className="size-4" />새 폴더
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm font-semibold text-fg transition-colors hover:bg-card-hover"
          >
            <FolderPlusIcon className="size-4" />폴더 업로드
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <ArrowUpTrayIcon className="size-4" />문서 업로드
          </button>
        </div>
      </div>

      {/* 워크스페이스 필터 pill */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {WORKSPACES.map((w) => {
          const active = workspace === w.key;
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => setWorkspace(w.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary/25 text-primary"
                  : "border-line text-fg hover:bg-card-hover"
              }`}
            >
              {w.dotTone && (
                <span className={`size-1.5 rounded-full ${w.dotTone}`} />
              )}
              {w.label}
            </button>
          );
        })}
      </div>

      {/* 팀 탭 (underline) */}
      <div className="mt-5 flex items-center gap-1 border-b border-line">
        {TEAM_TABS.map((t) => {
          const active = teamTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTeamTab(t.key)}
              className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? "text-primary" : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* 브레드크럼 + 검색 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-fg">
          <FolderIcon className="size-4 text-amber-400" />
          <span className="font-semibold">루트</span>
        </div>
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="문서 검색"
            className="w-full rounded-md border border-line bg-card-hover py-2 pr-3 pl-9 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* 폴더 섹션 */}
      <p className="mt-6 text-xs font-semibold text-muted">
        폴더 <span className="tabular-nums">{FOLDERS.length}</span>
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="flex items-center gap-3 rounded-lg border border-line bg-card p-4 text-left transition-colors hover:bg-card-hover"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
              <FolderIcon className="size-6 text-amber-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-fg">{f.name}</p>
              <p className="mt-0.5 text-xs text-muted tabular-nums">
                {f.updated}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* 문서 섹션 */}
      <p className="mt-8 text-xs font-semibold text-muted">
        문서 <span className="tabular-nums">{filteredDocs.length}</span>
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-line bg-card">
        {/* 헤더 (PC 전용) */}
        <div className="hidden grid-cols-[minmax(0,1fr)_220px_60px_140px_120px_80px] items-center gap-4 border-b border-line px-5 py-3 text-xs font-semibold text-muted lg:grid">
          <span>제목</span>
          <span>태그</span>
          <span>파일</span>
          <span>작성자</span>
          <span>수정</span>
          <span />
        </div>

        {filteredDocs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            검색 결과가 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filteredDocs.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─────────────── DocumentRow ───────────────

function DocumentRow({ doc }: { doc: Document }) {
  return (
    <li className="grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-card-hover lg:grid-cols-[minmax(0,1fr)_220px_60px_140px_120px_80px] lg:gap-4">
      {/* 제목 */}
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-card-hover text-[10px] font-black tracking-tight text-muted">
          FILE
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-fg">
              {doc.title}
            </span>
            {doc.badge && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${doc.badge.tone}`}
              >
                {doc.badge.label}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted">{doc.subtitle}</p>
        </div>
      </div>

      {/* 태그 */}
      <div className="flex flex-wrap gap-1">
        {doc.tags.map((t) => (
          <span
            key={t}
            className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
          >
            #{t}
          </span>
        ))}
      </div>

      {/* 파일 */}
      <div className="hidden text-sm text-muted lg:flex lg:items-center lg:gap-1.5">
        <DocumentIcon className="size-4 text-muted/70" aria-hidden="true" />
        <span className="text-muted">—</span>
      </div>

      {/* 작성자 */}
      <div className="flex items-center gap-2">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${doc.author.tone}`}
          aria-hidden
        >
          {doc.author.name.charAt(0)}
        </span>
        <span className="truncate text-sm text-fg">{doc.author.name}</span>
      </div>

      {/* 수정일 */}
      <p className="text-sm text-muted tabular-nums">{doc.updated}</p>

      {/* 액션 */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label="이력"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-card hover:text-fg"
        >
          <ClockIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="삭제"
          className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
    </li>
  );
}
