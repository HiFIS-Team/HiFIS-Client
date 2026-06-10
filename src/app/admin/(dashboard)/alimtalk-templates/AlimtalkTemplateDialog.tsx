"use client";

import { useEffect, useRef, useState } from "react";
import {
  previewAlimtalkTemplate,
  type AlimtalkTemplate,
} from "@/lib/api/alimtalkTemplates";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useBranch } from "@/providers/BranchProvider";

// 알림톡 본문 보기/수정 다이얼로그.
// - mode="view": textarea readOnly, 변수는 표시만, 닫기 버튼만
// - mode="edit": textarea 편집 가능, 변수 칩 클릭 시 cursor 위치에 {key} 삽입,
//   디폴트 복원 / 취소 / 저장
// 저장 시 본문이 디폴트와 동일하거나 빈 문자열이면 null 로 보내 백엔드가 디폴트 복원.
export function AlimtalkTemplateDialog({
  open,
  mode,
  template,
  triggerLabel,
  saving,
  onSave,
  onClose,
}: {
  open: boolean;
  mode: "view" | "edit";
  template: AlimtalkTemplate;
  triggerLabel: string;
  saving?: boolean;
  onSave?: (body: string | null) => void;
  onClose: () => void;
}) {
  // 현재 본문 (수정 모드 입력 상태). 없으면 default_body 로 시작 — 사장님이
  // 무엇이 디폴트인지 바로 보고 편집할 수 있음. 저장 시 default 와 같으면 null.
  const initialBody = template.body ?? template.default_body;
  const [body, setBody] = useState(initialBody);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 미리보기에 헤더("안녕하세요 OO점입니다") 를 현재 선택 지점 기준으로 조립.
  const { selectedBranchId } = useBranch();

  // 다이얼로그가 다른 템플릿으로 열릴 때 body 리셋
  useEffect(() => {
    setBody(template.body ?? template.default_body);
  }, [template.id, template.body, template.default_body]);

  useEscapeKey(onClose, open);

  // 미리보기 — 본문 변경 300ms 후 백엔드에 헤더+본문+푸터 조립된 전체 메시지 요청.
  // 백엔드가 더미값(이름 "홍길동" 등) 채워서 실제 발송될 형태 그대로 보여줌.
  const [debouncedBody, setDebouncedBody] = useState(body);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBody(body), 300);
    return () => clearTimeout(t);
  }, [body]);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewing(true);
    previewAlimtalkTemplate(template.id, {
      body: debouncedBody,
      branch_id: selectedBranchId,
    })
      .then((res) => {
        if (!cancelled) setPreview(res.preview);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, template.id, debouncedBody, selectedBranchId]);

  const isEdit = mode === "edit";
  const isDirty = body !== initialBody;

  // 변수 칩 클릭 → cursor 위치에 {key} 삽입
  function insertVariable(key: string) {
    if (!isEdit) return;
    const ta = textareaRef.current;
    const insert = `{${key}}`;
    if (!ta) {
      setBody((prev) => prev + insert);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + insert + body.slice(end);
    setBody(next);
    // 다음 tick 에서 cursor 를 삽입 뒤로
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleRestoreDefault() {
    setBody(template.default_body);
  }

  function handleSave() {
    if (!onSave) return;
    const trimmed = body.trim();
    // 빈 문자열 또는 디폴트와 같으면 null 로 보내 백엔드가 디폴트 사용 상태로 복원
    const payload =
      trimmed === "" || trimmed === template.default_body.trim()
        ? null
        : body;
    onSave(payload);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{triggerLabel}</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {isEdit ? "본문 수정" : "본문 보기"}
            {template.body === null && (
              <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                디폴트 본문
              </span>
            )}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto px-6 py-5">
          {/* 본문 */}
          <div>
            <label
              htmlFor="alimtalk-body"
              className="block text-sm font-medium text-gray-900"
            >
              본문
            </label>
            <textarea
              id="alimtalk-body"
              ref={textareaRef}
              readOnly={!isEdit}
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`mt-2 block w-full resize-y rounded-md border-0 px-3 py-2.5 text-sm outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 ${
                isEdit
                  ? "bg-white text-gray-900 outline-gray-300 focus:outline-primary"
                  : "bg-gray-50 text-gray-700 outline-gray-200"
              }`}
            />
          </div>

          {/* 미리보기 — 헤더+본문+푸터 조립된 실제 발송 형태. 본문 변경 300ms 후 갱신. */}
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-gray-900">미리보기</p>
              {previewing && (
                <span className="text-xs text-gray-400">불러오는 중…</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              실제 발송될 형태 (헤더·푸터 포함, 더미값으로 미리 채워짐).
            </p>
            <div className="mt-2 min-h-[6rem] rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm whitespace-pre-wrap text-gray-700">
              {preview ?? (previewing ? "" : "—")}
            </div>
          </div>

          {/* 변수 칩 — 수정 모드에선 클릭으로 삽입 */}
          {template.variables.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900">
                사용 가능한 변수
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {isEdit
                  ? "칩을 누르면 본문 커서 위치에 삽입돼요."
                  : "이 트리거에서 본문에 쓸 수 있는 변수 목록이에요."}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {template.variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    disabled={!isEdit}
                    onClick={() => insertVariable(v.key)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      isEdit
                        ? "cursor-pointer border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                        : "cursor-default border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                    title={v.label}
                  >
                    <span className="font-mono">{`{${v.key}}`}</span>
                    <span className="text-gray-500">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-6 py-4">
          {isEdit ? (
            <>
              <button
                type="button"
                onClick={handleRestoreDefault}
                disabled={saving || body === template.default_body}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                디폴트 복원
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
