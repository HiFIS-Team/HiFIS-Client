"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { SCOPE_OPTIONS, type Scope, ScopePicker } from "./scope";

// 문서 업로드 다이얼로그 — 파일 다중 선택 · 제목 · 설명 · 태그 · 공개 범위.
// 폴더 업로드 모드 (mode="folder") : webkitdirectory 로 폴더 째 선택,
// 제목 필드는 폴더명 자동 채움, 파일 목록에 상대경로 표시.

interface UploadDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  mode?: "file" | "folder";
}

export function UploadDocumentDialog({
  open,
  onClose,
  mode = "file",
}: UploadDocumentDialogProps) {
  useEscapeKey(onClose, open);

  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // 열릴 때 초기화.
  useEffect(() => {
    if (open) {
      setFiles([]);
      setTitle("");
      setDesc("");
      setTags("");
      setScope("all");
      setDragOver(false);
    }
  }, [open]);

  // 폴더 모드로 열리면 자동으로 폴더 피커 트리거.
  useEffect(() => {
    if (open && mode === "folder" && inputRef.current) {
      inputRef.current.click();
    }
  }, [open, mode]);

  if (!open) return null;

  // 폴더 이름 추출 — webkitRelativePath 의 첫 세그먼트.
  function detectFolderName(list: File[]): string | null {
    const first = list[0];
    const rel: string | undefined = first?.webkitRelativePath;
    if (!rel) return null;
    return rel.split("/")[0] || null;
  }

  function acceptFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    setFiles(arr);
    // 폴더 모드이면 제목 미입력 시 폴더명으로 자동 채움.
    if (mode === "folder" && !title.trim()) {
      const folderName = detectFolderName(arr);
      if (folderName) setTitle(folderName);
    }
    // 파일 모드이고 하나만 선택되면 제목 미입력 시 파일명(확장자 뺀) 자동 채움.
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

  const canSubmit = files.length > 0 && title.trim().length > 0;
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  function submit() {
    // TODO: v2 문서 업로드 API 연동 (multipart, file 당 1 요청 or bulk endpoint).
    onClose();
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
        {/* 슬림 헤더 */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-fg">{kicker}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-fg"
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
              {mode === "folder" ? "폴더 선택 (최대 2GB)" : "파일 선택 (최대 2GB)"}
            </p>
            <p className="text-xs text-muted">
              {mode === "folder"
                ? "폴더 안 파일이 모두 업로드돼요"
                : "여러 개 선택 가능 · 링크만 있는 문서도 OK"}
            </p>
          </button>

          {/* 폴더 모드에서만 webkitdirectory 속성 부여 */}
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple={mode === "file"}
            onChange={(e) => acceptFiles(e.target.files)}
            {...(mode === "folder"
              ? // webkitdirectory / directory — 브라우저 확장 속성, JSX 타입엔 없어도 렌더 시 그대로 attribute 로 나감.
                ({ webkitdirectory: "true", directory: "true" } as Record<
                  string,
                  string
                >)
              : {})}
          />

          {/* 선택된 파일 목록 */}
          {files.length > 0 && (
            <div className="rounded-md border border-line bg-card-hover px-3 py-2">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs font-semibold text-fg">
                  선택된 {files.length}개 · {formatBytes(totalBytes)}
                </p>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs text-muted hover:text-fg"
                >
                  전체 지우기
                </button>
              </div>
              <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-line pt-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">
                      {f.webkitRelativePath || f.name} ·{" "}
                      <span className="tabular-nums">{formatBytes(f.size)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label="제외"
                      className="rounded p-0.5 text-muted hover:bg-card hover:text-red-400"
                    >
                      <XMarkIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 제목 */}
          <div>
            <label className="block text-sm font-semibold text-fg">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>

          {/* 설명 */}
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

          {/* 태그 */}
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

          {/* 공개 범위 */}
          <div>
            <label className="block text-sm font-semibold text-fg">공개 범위</label>
            <div className="mt-2">
              <ScopePicker value={scope} onChange={setScope} options={SCOPE_OPTIONS} />
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            등록
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
