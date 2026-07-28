"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { uploadDocument } from "@/lib/api/v2/documents";
import { SCOPE_OPTIONS, type Scope, ScopePicker } from "./scope";

// 문서 업로드 다이얼로그 — 파일 다중 선택 · 제목 · 설명 · 태그 · 공개 범위.
// 파일 여러 개면 순차로 POST /documents (multipart) — 하나씩 진행률 추적.
// 폴더 모드 (mode="folder") : webkitdirectory 로 폴더 째 선택, 상대경로 표시.

interface UploadDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  mode?: "file" | "folder";
  defaultSpace: string;
  folderId: string | null;
  onUploaded: () => void;
}

interface FileState {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function UploadDocumentDialog({
  open,
  onClose,
  mode = "file",
  defaultSpace,
  folderId,
  onUploaded,
}: UploadDocumentDialogProps) {
  useEscapeKey(onClose, open);

  const [files, setFiles] = useState<FileState[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setFiles([]);
      setTitle("");
      setDesc("");
      setTags("");
      setScope("all");
      setDragOver(false);
      setUploading(false);
      setOverallError(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && mode === "folder" && inputRef.current) {
      inputRef.current.click();
    }
  }, [open, mode]);

  if (!open) return null;

  function detectFolderName(list: File[]): string | null {
    const first = list[0];
    const rel: string | undefined = first?.webkitRelativePath;
    if (!rel) return null;
    return rel.split("/")[0] || null;
  }

  function acceptFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    setFiles(arr.map((f) => ({ file: f, status: "pending" })));
    if (mode === "folder" && !title.trim()) {
      const folderName = detectFolderName(arr);
      if (folderName) setTitle(folderName);
    }
    if (mode === "file" && arr.length === 1 && !title.trim()) {
      const n = arr[0].name.replace(/\.[^.]+$/, "");
      setTitle(n);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    acceptFiles(e.dataTransfer.files);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSubmit = files.length > 0 && title.trim().length > 0 && !uploading;
  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0);
  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  async function submit() {
    if (!canSubmit) return;
    setUploading(true);
    setOverallError(null);
    let allOk = true;
    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, j) => (j === i ? { ...f, status: "uploading" } : f)),
      );
      try {
        await uploadDocument({
          file: files[i].file,
          scope,
          space: defaultSpace,
          folderId: folderId ?? undefined,
          // 여러 파일이면 서버가 filename 씀. 단일 파일일 때만 사용자 지정 title 사용.
          name: files.length === 1 ? title.trim() : undefined,
          desc: desc.trim() || undefined,
          tags: tagList.length > 0 ? tagList : undefined,
        });
        setFiles((prev) =>
          prev.map((f, j) => (j === i ? { ...f, status: "done" } : f)),
        );
      } catch (e) {
        allOk = false;
        const msg = getV2ErrorMessage(e);
        setFiles((prev) =>
          prev.map((f, j) =>
            j === i ? { ...f, status: "error", error: msg } : f,
          ),
        );
      }
    }
    setUploading(false);
    if (allOk) {
      onUploaded();
    } else {
      setOverallError("일부 파일이 업로드되지 않았어요. 실패 항목을 확인하세요.");
    }
  }

  const kicker = mode === "folder" ? "폴더 업로드" : "문서 업로드";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-fg">{kicker}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            disabled={uploading}
            className="rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* 드롭존 */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/10"
                : "border-line bg-card-hover hover:border-primary/60 hover:bg-primary/5"
            }`}
          >
            <ArrowUpTrayIcon className="size-6 text-muted" />
            <p className="text-sm font-semibold text-fg">
              {mode === "folder"
                ? "폴더 선택 (최대 2GB)"
                : "파일 선택 (최대 2GB)"}
            </p>
            <p className="text-xs text-muted">
              {mode === "folder"
                ? "폴더 안 파일이 모두 업로드돼요"
                : "여러 개 선택 가능"}
            </p>
          </button>

          <input
            ref={inputRef}
            type="file"
            hidden
            multiple={mode === "file"}
            onChange={(e) => acceptFiles(e.target.files)}
            {...(mode === "folder"
              ? ({ webkitdirectory: "true", directory: "true" } as Record<
                  string,
                  string
                >)
              : {})}
          />

          {/* 선택된 파일 목록 + 진행상태 */}
          {files.length > 0 && (
            <div className="rounded-md border border-line bg-card-hover px-3 py-2">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs font-semibold text-fg">
                  선택된 {files.length}개 · {formatBytes(totalBytes)}
                </p>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="text-xs text-muted hover:text-fg"
                  >
                    전체 지우기
                  </button>
                )}
              </div>
              <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-line pt-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.file.name}-${i}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs">
                      <span
                        className={
                          f.status === "error"
                            ? "text-red-400"
                            : f.status === "done"
                              ? "text-emerald-400"
                              : "text-muted"
                        }
                      >
                        {f.status === "done"
                          ? "✓"
                          : f.status === "error"
                            ? "✗"
                            : f.status === "uploading"
                              ? "…"
                              : ""}
                      </span>{" "}
                      {f.file.webkitRelativePath || f.file.name} ·{" "}
                      <span className="tabular-nums">
                        {formatBytes(f.file.size)}
                      </span>
                      {f.error && (
                        <span className="ml-2 text-red-400">— {f.error}</span>
                      )}
                    </span>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label="제외"
                        className="rounded p-0.5 text-muted hover:bg-card hover:text-red-400"
                      >
                        <XMarkIcon className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-fg">
              제목{" "}
              {files.length > 1 && (
                <span className="text-xs font-normal text-muted">
                  (여러 파일이라 각 파일명이 사용돼요)
                </span>
              )}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={files.length > 1}
              className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-fg">설명</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              maxLength={500}
              className="mt-2 w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-fg">
              태그 <span className="text-muted">(쉼표로 구분)</span>
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: 규정, 인사, 양식"
              className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-fg">
              공개 범위
            </label>
            <div className="mt-2">
              <ScopePicker
                value={scope}
                onChange={setScope}
                options={SCOPE_OPTIONS}
              />
            </div>
          </div>

          {defaultSpace && (
            <p className="text-xs text-muted">
              워크스페이스:{" "}
              <span className="font-semibold text-fg">{defaultSpace}</span>
              {folderId && (
                <>
                  {" "}
                  · 폴더 안에 업로드
                </>
              )}
            </p>
          )}

          {overallError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{overallError}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? "업로드 중…" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
