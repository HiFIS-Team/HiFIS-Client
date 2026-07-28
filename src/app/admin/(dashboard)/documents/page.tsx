"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronLeftIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import {
  deleteDocument,
  deleteFolder,
  downloadDocument,
  listDocuments,
  listFolders,
  type DocumentOut,
  type FolderOut,
} from "@/lib/api/v2/documents";
import { PageTitle } from "../PageTitle";
import { NewFolderDialog } from "./NewFolderDialog";
import { UploadDocumentDialog } from "./UploadDocumentDialog";

// 문서함 — GET /folders + GET /documents.
// workspace pill = space, 팀 탭 = scope. 둘 다 자유 문자열 (백엔드는 그대로 저장).
// 폴더 클릭 시 그 폴더의 문서만 표시 (breadcrumb 로 루트 복귀).

// ─────────────── 프리셋 (프론트 정의) ───────────────

interface WorkspacePreset {
  key: string; // "all" 또는 실제 space 값
  label: string;
  dotTone?: string;
  space?: string; // 백엔드로 보낼 space 값 (undefined = 필터 안 함)
}
const WORKSPACES: WorkspacePreset[] = [
  { key: "all", label: "전체 문서함" },
  {
    key: "renewal",
    label: "화순점 리뉴얼 TF",
    dotTone: "bg-primary",
    space: "화순점 리뉴얼 TF",
  },
  {
    key: "summer",
    label: "여름 프로모션 캠페인",
    dotTone: "bg-pink-400",
    space: "여름 프로모션 캠페인",
  },
  {
    key: "trainer",
    label: "트레이너 교육 · 매뉴얼",
    dotTone: "bg-amber-400",
    space: "트레이너 교육 · 매뉴얼",
  },
];

interface ScopeTab {
  key: string; // "all" 또는 실제 scope 값
  label: string;
  scope?: string;
}
const SCOPE_TABS: ScopeTab[] = [
  { key: "all", label: "전체" },
  { key: "team", label: "팀 공개", scope: "team" },
  { key: "personal", label: "개인", scope: "personal" },
  { key: "custom", label: "사용자지정", scope: "custom" },
];

// ─────────────── page ───────────────

export default function DocumentsPage() {
  const [workspaceKey, setWorkspaceKey] = useState("all");
  const [scopeKey, setScopeKey] = useState("all");
  const [query, setQuery] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "folder">("file");

  const queryClient = useQueryClient();

  const workspace = WORKSPACES.find((w) => w.key === workspaceKey);
  const scopeTab = SCOPE_TABS.find((s) => s.key === scopeKey);

  // 폴더 · 문서 리스트 : workspace/scope 를 서버 파라미터로.
  const foldersQuery = useQuery({
    queryKey: [
      "v2",
      "folders",
      { space: workspace?.space, scope: scopeTab?.scope },
    ] as const,
    queryFn: () =>
      listFolders({
        space: workspace?.space,
        scope: scopeTab?.scope,
      }),
  });
  const folders = foldersQuery.data ?? [];

  const documentsQuery = useQuery({
    queryKey: [
      "v2",
      "documents",
      {
        space: workspace?.space,
        scope: scopeTab?.scope,
        folderId,
      },
    ] as const,
    queryFn: () =>
      listDocuments({
        space: workspace?.space,
        scope: scopeTab?.scope,
        folderId: folderId ?? undefined,
      }),
  });
  const documents = documentsQuery.data ?? [];

  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
  const employeeLookup = useMemo(() => {
    const map = new Map<
      string,
      { name: string; avatarColor: string | undefined }
    >();
    for (const e of employeesQuery.data ?? []) {
      map.set(e.id, { name: e.name, avatarColor: e.avatarColor });
    }
    return map;
  }, [employeesQuery.data]);

  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const meId = meQuery.data?.id ?? null;
  const isAdmin = meQuery.data?.role === "SUPER_ADMIN";

  const currentFolder = folderId
    ? folders.find((f) => f.id === folderId) ?? null
    : null;

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.desc ?? "").toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [documents, query]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["v2", "folders"] });
    queryClient.invalidateQueries({ queryKey: ["v2", "documents"] });
  }

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
            onClick={() => setNewFolderOpen(true)}
            className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm font-semibold text-fg transition-colors hover:bg-card-hover"
          >
            <PlusIcon className="size-4" />새 폴더
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode("folder");
              setUploadOpen(true);
            }}
            className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm font-semibold text-fg transition-colors hover:bg-card-hover"
          >
            <FolderPlusIcon className="size-4" />폴더 업로드
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode("file");
              setUploadOpen(true);
            }}
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <ArrowUpTrayIcon className="size-4" />문서 업로드
          </button>
        </div>
      </div>

      {/* 워크스페이스 필터 pill */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {WORKSPACES.map((w) => {
          const active = workspaceKey === w.key;
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => {
                setWorkspaceKey(w.key);
                setFolderId(null);
              }}
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
        {SCOPE_TABS.map((t) => {
          const active = scopeKey === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setScopeKey(t.key);
                setFolderId(null);
              }}
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
          {currentFolder ? (
            <>
              <button
                type="button"
                onClick={() => setFolderId(null)}
                className="inline-flex items-center gap-1 text-muted transition-colors hover:text-fg"
              >
                <ChevronLeftIcon className="size-4" />
                루트
              </button>
              <span className="text-muted">/</span>
              <span className="flex items-center gap-1.5 font-semibold">
                <FolderIcon className="size-4 text-amber-400" />
                {currentFolder.name}
              </span>
            </>
          ) : (
            <>
              <FolderIcon className="size-4 text-amber-400" />
              <span className="font-semibold">루트</span>
            </>
          )}
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

      {/* 에러 배너 */}
      {(foldersQuery.isError || documentsQuery.isError) && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span>
            {getV2ErrorMessage(
              foldersQuery.error ?? documentsQuery.error,
            )}
          </span>
        </div>
      )}

      {/* 폴더 섹션 — 루트일 때만 표시 (폴더 안에서는 하위 폴더 개념 미구현) */}
      {!currentFolder && (
        <>
          <p className="mt-6 text-xs font-semibold text-muted">
            폴더 <span className="tabular-nums">{folders.length}</span>
          </p>
          {foldersQuery.isLoading ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[68px] animate-pulse rounded-lg border border-line bg-card"
                />
              ))}
            </div>
          ) : folders.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-line bg-card px-5 py-8 text-center text-sm text-muted">
              아직 폴더가 없어요. 상단 &ldquo;새 폴더&rdquo; 로 만들어 보세요.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {folders.map((f) => (
                <FolderTile
                  key={f.id}
                  folder={f}
                  onOpen={() => setFolderId(f.id)}
                  canDelete={isAdmin || f.createdById === meId}
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </>
      )}

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
          <span>업로더</span>
          <span>크기</span>
          <span />
        </div>

        {documentsQuery.isLoading ? (
          <ul className="divide-y divide-line">
            {[0, 1, 2].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-4 w-1/2 rounded bg-card-hover" />
                <div className="mt-2 h-3 w-1/3 rounded bg-card-hover" />
              </li>
            ))}
          </ul>
        ) : filteredDocs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {query.trim()
              ? "검색 결과가 없어요."
              : "이 위치에 업로드된 문서가 없어요."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filteredDocs.map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                uploader={employeeLookup.get(d.uploaderId)}
                canDelete={isAdmin || d.uploaderId === meId}
                onChanged={refresh}
              />
            ))}
          </ul>
        )}
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        defaultSpace={workspace?.space ?? ""}
        onCreated={() => {
          refresh();
          setNewFolderOpen(false);
        }}
      />
      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        mode={uploadMode}
        defaultSpace={workspace?.space ?? ""}
        folderId={folderId}
        onUploaded={() => {
          refresh();
          setUploadOpen(false);
        }}
      />
    </div>
  );
}

// ─────────────── FolderTile ───────────────

function FolderTile({
  folder,
  onOpen,
  canDelete,
  onChanged,
}: {
  folder: FolderOut;
  onOpen: () => void;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => deleteFolder(folder.id),
    onSuccess: () => onChanged(),
  });

  function del(e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !confirm(
        `"${folder.name}" 폴더를 삭제할까요? 안에 든 문서도 함께 삭제됩니다.`,
      )
    )
      return;
    mutation.mutate();
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-4 text-left transition-colors hover:bg-card-hover"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
          <FolderIcon className="size-6 text-amber-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{folder.name}</p>
          <p className="mt-0.5 text-xs text-muted">{folder.scope}</p>
        </div>
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={del}
          aria-label="폴더 삭제"
          disabled={mutation.isPending}
          className="absolute top-2 right-2 rounded-md p-1.5 text-muted opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-40"
        >
          <TrashIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

// ─────────────── DocumentRow ───────────────

function DocumentRow({
  doc,
  uploader,
  canDelete,
  onChanged,
}: {
  doc: DocumentOut;
  uploader: { name: string; avatarColor: string | undefined } | undefined;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(doc.id),
    onSuccess: () => onChanged(),
    onError: (e) => setRowError(getV2ErrorMessage(e)),
  });

  async function download() {
    setRowError(null);
    setDownloading(true);
    try {
      await downloadDocument(doc);
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "다운로드 실패");
    } finally {
      setDownloading(false);
    }
  }

  function del() {
    if (!confirm(`"${doc.name}" 문서를 삭제할까요?`)) return;
    deleteMutation.mutate();
  }

  return (
    <li className="grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-card-hover lg:grid-cols-[minmax(0,1fr)_220px_60px_140px_120px_80px] lg:gap-4">
      {/* 제목 */}
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-card-hover text-[10px] font-black tracking-tight text-muted uppercase">
          {doc.ext || "FILE"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-fg">
              {doc.name}
            </span>
            {doc.scope && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${scopeToneClass(doc.scope)}`}
              >
                {scopeLabel(doc.scope)}
              </span>
            )}
          </div>
          {doc.desc && (
            <p className="mt-1 line-clamp-1 text-xs text-muted">{doc.desc}</p>
          )}
          {rowError && (
            <p className="mt-1 text-xs text-red-400">{rowError}</p>
          )}
        </div>
      </div>

      {/* 태그 */}
      <div className="flex flex-wrap gap-1">
        {doc.tags.length === 0 ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          doc.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
            >
              #{t}
            </span>
          ))
        )}
      </div>

      {/* 파일 아이콘 */}
      <div className="hidden text-sm text-muted lg:flex lg:items-center lg:gap-1.5">
        <DocumentIcon className="size-4 text-muted/70" aria-hidden="true" />
        <span className="text-muted">{doc.ext || "-"}</span>
      </div>

      {/* 업로더 */}
      <div className="flex items-center gap-2">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${avatarTone(uploader?.avatarColor)}`}
          aria-hidden
        >
          {(uploader?.name ?? "?").charAt(0)}
        </span>
        <span className="truncate text-sm text-fg">
          {uploader?.name ?? "알 수 없음"}
        </span>
      </div>

      {/* 크기 */}
      <p className="text-sm text-muted tabular-nums">
        {formatBytes(doc.sizeBytes)}
      </p>

      {/* 액션 */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label="다운로드"
          onClick={download}
          disabled={downloading}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-card hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDownTrayIcon className="size-4" />
        </button>
        {canDelete && (
          <button
            type="button"
            aria-label="삭제"
            onClick={del}
            disabled={deleteMutation.isPending}
            className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TrashIcon className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}

// ─────────────── helpers ───────────────

function scopeLabel(scope: string): string {
  if (scope === "all") return "전체 공개";
  if (scope === "team") return "팀 공개";
  if (scope === "personal") return "개인";
  if (scope === "custom") return "사용자지정";
  return scope;
}

function scopeToneClass(scope: string): string {
  if (scope === "team") return "bg-primary/15 text-primary";
  if (scope === "personal") return "bg-pink-500/15 text-pink-400";
  if (scope === "custom") return "bg-amber-500/15 text-amber-400";
  return "bg-emerald-500/15 text-emerald-400";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
