"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import {
  createAccount,
  type AccountScope,
} from "@/lib/api/v2/accounts";

// 새 계정 추가 다이얼로그.
// UI 는 완전한 형태 (팀 chips · 프로젝트 select · 로고 · 사내/외부 담당자) 유지.
// 백엔드가 지원하는 필드만 저장 : name · cat · scope · loginId · password · url · memo · active.
// 미지원 필드 (teams · projects · logo · ownerInternal · ownerExternal) 는
// 서버에 보내지 않고 UI 로컬 상태로만. 백엔드 확장 시 mapping 만 추가하면 됨.

// ─────────────── 옵션 ───────────────

// 카테고리 key 는 프론트용, label 이 백엔드에 저장되는 값. 목록 페이지 그룹 라벨과 일치.
const CATEGORY_OPTIONS: {
  key: string;
  label: string;
  emoji: string;
}[] = [
  { key: "etc", label: "기타", emoji: "📦" },
  { key: "social", label: "소셜", emoji: "📱" },
  { key: "editing", label: "편집", emoji: "🎨" },
  { key: "ads", label: "광고", emoji: "📢" },
  { key: "booking", label: "예약", emoji: "🗓️" },
  { key: "cloud", label: "클라우드", emoji: "☁️" },
  { key: "hosting", label: "호스팅", emoji: "▲" },
];

type ScopeKey = "all" | "team" | "project";
const SCOPE_OPTIONS: {
  key: ScopeKey;
  scope: AccountScope; // 백엔드로 보낼 값
  label: string;
  hint: string;
}[] = [
  { key: "all", scope: "전사", label: "전사", hint: "모든 구성원이 봅니다" },
  { key: "team", scope: "팀", label: "팀", hint: "같은 팀만 봅니다" },
  {
    key: "project",
    scope: "프로젝트",
    label: "프로젝트",
    hint: "프로젝트 멤버만 봅니다",
  },
];

// TODO: 백엔드에서 팀/프로젝트 필드가 붙으면 실제 목록으로 교체.
const INTERNAL_OWNERS = ["김데모", "이앨리스", "박그레이스", "한이브"];
const PROJECT_OPTIONS = [
  "화순점 리뉴얼 TF",
  "여름 프로모션 캠페인",
  "트레이너 교육 · 매뉴얼",
];

type LogoShape = "rounded" | "circle";

// ─────────────── 컴포넌트 ───────────────

interface NewAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewAccountDialog({
  open,
  onClose,
  onCreated,
}: NewAccountDialogProps) {
  useEscapeKey(onClose, open);

  const [service, setService] = useState("");
  const [category, setCategory] = useState("etc");
  const [scope, setScope] = useState<ScopeKey>("all");
  const [teams, setTeams] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState("");
  const [projects, setProjects] = useState<string[]>([]);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [url, setUrl] = useState("");
  const [logoShape, setLogoShape] = useState<LogoShape>("rounded");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [ownerInternal, setOwnerInternal] = useState("");
  const [ownerExternal, setOwnerExternal] = useState("");
  const [memo, setMemo] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => onCreated(),
  });

  // 열릴 때마다 초기화.
  useEffect(() => {
    if (!open) return;
    setService("");
    setCategory("etc");
    setScope("all");
    setTeams([]);
    setTeamInput("");
    setProjects([]);
    setLoginId("");
    setPassword("");
    setShowPw(false);
    setUrl("");
    setLogoShape("rounded");
    setLogoFile(null);
    setOwnerInternal("");
    setOwnerExternal("");
    setMemo("");
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSubmit =
    service.trim().length > 0 &&
    loginId.trim().length > 0 &&
    password.length > 0 &&
    !mutation.isPending;

  function addTeam() {
    const v = teamInput.trim();
    if (!v || teams.includes(v)) return;
    setTeams((prev) => [...prev, v]);
    setTeamInput("");
  }
  function removeTeam(t: string) {
    setTeams((prev) => prev.filter((x) => x !== t));
  }

  function addProject(name: string) {
    if (!name || projects.includes(name)) return;
    setProjects((prev) => [...prev, name]);
  }
  function removeProject(p: string) {
    setProjects((prev) => prev.filter((x) => x !== p));
  }

  function submit() {
    if (!canSubmit) return;
    const catLabel =
      CATEGORY_OPTIONS.find((c) => c.key === category)?.label ?? "기타";
    const scopeVal =
      SCOPE_OPTIONS.find((s) => s.key === scope)?.scope ?? "전사";
    mutation.mutate({
      name: service.trim(),
      cat: catLabel,
      scope: scopeVal,
      loginId: loginId.trim(),
      password,
      url: url.trim() || null,
      memo: memo.trim() || null,
      active: true,
    });
  }

  const categoryMeta =
    CATEGORY_OPTIONS.find((c) => c.key === category) ?? CATEGORY_OPTIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 슬림 헤더 */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-fg">새 계정 추가</h2>
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
          {/* 서비스 이름 + 카테고리 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="서비스 이름" required>
              <input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder={'예: "Instagram", "Canva"'}
                maxLength={60}
                className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="카테고리">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-md border border-line bg-card-hover px-3 py-2.5 pr-8 text-sm text-fg focus:border-primary focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
              </div>
            </Field>
          </div>

          {/* 공개 범위 — 3 카드 */}
          <Field label="공개 범위">
            <div className="grid grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map((s) => {
                const active = scope === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setScope(s.key)}
                    className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/15"
                        : "border-line bg-card-hover hover:bg-card"
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${active ? "text-primary" : "text-fg"}`}
                    >
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
                  </button>
                );
              })}
            </div>

            {/* 팀 chips + 추가 입력 — UI 만 (백엔드 미지원, 저장 X) */}
            {scope === "team" && (
              <div className="mt-3 space-y-2">
                {teams.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {teams.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTeam(t)}
                          aria-label="제외"
                          className="rounded p-0.5 text-primary/70 hover:text-primary"
                        >
                          <XMarkIcon className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTeam();
                      }
                    }}
                    placeholder="예: 마케팅팀"
                    className="flex-1 rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addTeam}
                    className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
                  >
                    <PlusIcon className="size-3.5" />
                    추가
                  </button>
                </div>
              </div>
            )}

            {/* 프로젝트 chips + select 추가 — UI 만 */}
            {scope === "project" && (
              <div className="mt-3 space-y-2">
                {projects.length === 0 ? (
                  <p className="text-xs text-muted">
                    아직 선택된 프로젝트가 없어요.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {projects.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
                      >
                        {p}
                        <button
                          type="button"
                          onClick={() => removeProject(p)}
                          aria-label="제외"
                          className="rounded p-0.5 text-primary/70 hover:text-primary"
                        >
                          <XMarkIcon className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => addProject(e.target.value)}
                    className="w-full appearance-none rounded-md border border-line bg-card-hover px-3 py-2.5 pr-8 text-sm text-fg focus:border-primary focus:outline-none"
                  >
                    <option value="" disabled>
                      + 프로젝트 추가...
                    </option>
                    {PROJECT_OPTIONS.filter((p) => !projects.includes(p)).map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ),
                    )}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
                </div>
              </div>
            )}
          </Field>

          {/* 로그인 ID */}
          <Field label="로그인 ID / 이메일" required>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="예: ops@fitnessstar.kr"
              autoComplete="off"
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-fg">
              비밀번호 <span className="ml-1 text-red-400">*</span>
              <span className="ml-1 text-xs font-semibold text-red-400">
                (암호화 저장)
              </span>
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2 focus-within:border-primary">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="공용 계정 비밀번호"
                autoComplete="new-password"
                className="min-w-0 flex-1 bg-transparent py-1 text-sm text-fg placeholder-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="shrink-0 text-xs font-semibold text-muted hover:text-fg"
              >
                {showPw ? "가리기" : "보기"}
              </button>
            </div>
            <p className="mt-2 flex items-start gap-1 text-xs text-amber-400">
              <ExclamationTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                공용 크레덴셜만 — 개인 비번·2차 인증 백업 코드·root 키는
                1Password 같은 전용 도구를 쓰세요.
              </span>
            </p>
          </div>

          {/* 콘솔 URL */}
          <Field label="콘솔 URL">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://console.aws.amazon.com"
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 로고 — UI 만 (백엔드 미지원) */}
          <Field label="로고">
            <div className="flex items-start gap-3">
              <LogoPreview shape={logoShape} file={logoFile} />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs text-muted">
                  URL/서비스 이름으로 자동 추측 (실패 시 이모지)
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <ShapeRadio
                    label="둥근 사각"
                    icon="rounded"
                    checked={logoShape === "rounded"}
                    onSelect={() => setLogoShape("rounded")}
                  />
                  <ShapeRadio
                    label="원형"
                    icon="circle"
                    checked={logoShape === "circle"}
                    onSelect={() => setLogoShape("circle")}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-card-hover"
                  >
                    <PhotoIcon className="size-3.5" />
                    이미지 업로드
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setLogoFile(f);
                    }}
                  />
                </div>
              </div>
            </div>
          </Field>

          {/* 담당자 사내 + 외부 — UI 만 (백엔드는 owner_id 를 현재 사용자로 자동 설정) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="담당자 (사내)">
              <div className="relative">
                <select
                  value={ownerInternal}
                  onChange={(e) => setOwnerInternal(e.target.value)}
                  className="w-full appearance-none rounded-md border border-line bg-card-hover px-3 py-2.5 pr-8 text-sm text-fg focus:border-primary focus:outline-none"
                >
                  <option value="">선택 안 함</option>
                  {INTERNAL_OWNERS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
              </div>
            </Field>
            <Field label="담당자 (외부)">
              <input
                value={ownerExternal}
                onChange={(e) => setOwnerExternal(e.target.value)}
                placeholder="사내 유저가 아닐 때 수기 입력"
                className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
              />
            </Field>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-semibold text-fg">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="접근 방법, MFA 장치, 요금제 등 자유 메모"
              className="mt-2 w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
            <p className="mt-2 flex items-start gap-1 text-xs text-amber-400">
              <ExclamationTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                메모 칸은 암호화되지 않아요. 비밀번호는 위 &ldquo;비밀번호&rdquo;
                입력란에, 액세스키·API 토큰은 1Password 등 전용 도구에 두세요.
              </span>
            </p>
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}

          {/* categoryMeta 는 향후 로고 자동 emoji 폴백에 사용 예정 — 지금은 렌더 X */}
          <input type="hidden" value={categoryMeta.emoji} readOnly />
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
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
            {mutation.isPending ? "추가 중…" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── 하위 컴포넌트 ───────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-fg">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function LogoPreview({
  shape,
  file,
}: {
  shape: LogoShape;
  file: File | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const rounding = shape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <div
      className={`flex size-14 shrink-0 items-center justify-center border border-line bg-card-hover text-xl ${rounding}`}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className={`size-full object-cover ${rounding}`}
        />
      ) : (
        <span aria-hidden>📦</span>
      )}
    </div>
  );
}

function ShapeRadio({
  label,
  icon,
  checked,
  onSelect,
}: {
  label: string;
  icon: LogoShape;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        checked
          ? "border-primary bg-primary/15 text-primary"
          : "border-line text-fg hover:bg-card-hover"
      }`}
    >
      {icon === "rounded" ? (
        <span
          aria-hidden
          className={`inline-block size-3.5 rounded-[3px] border-2 ${checked ? "border-primary" : "border-fg"}`}
        />
      ) : (
        <span
          aria-hidden
          className={`inline-block size-3.5 rounded-full border-2 ${checked ? "border-primary" : "border-fg"}`}
        />
      )}
      {label}
    </button>
  );
}
