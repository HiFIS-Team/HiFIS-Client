"use client";

import { useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldExclamationIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";
import { NewAccountDialog } from "./NewAccountDialog";

// 팀 리소스 · 계정 관리 — 공용으로 쓰는 서비스 계정(SNS · 편집툴 · 광고 등) 을 한 곳에서 공유.
// 직원 페이지 톤 : 카드 하나에 헤더 → 뷰 토글 → 검색 → 필터 → 리스트.
// 기본 뷰는 필드 4개, 상세 뷰는 비밀번호 · 메모까지 노출.

// ─────────────── mock ───────────────

type Scope = "전사" | "팀" | "프로젝트";
type Category = "소셜" | "편집" | "광고" | "예약";

interface CategoryMeta {
  key: Category;
  label: string;
  emoji: string;
}
const CATEGORIES: CategoryMeta[] = [
  { key: "소셜", label: "소셜 미디어", emoji: "📱" },
  { key: "편집", label: "디자인 · 편집", emoji: "🎨" },
  { key: "광고", label: "광고", emoji: "📢" },
  { key: "예약", label: "예약 · CRM", emoji: "🗓️" },
];

interface Account {
  id: string;
  service: string;
  serviceInitial: string;
  serviceTone: string;
  category: Category;
  scope: Scope;
  loginId: string;
  password: string;
  url?: string;
  owner: { name: string; tone: string };
  memo?: string;
  active: boolean;
}

const ACCOUNTS: Account[] = [
  {
    id: "a1",
    service: "Instagram",
    serviceInitial: "I",
    serviceTone: "bg-gradient-to-br from-pink-500 to-orange-400 text-white",
    category: "소셜",
    scope: "전사",
    loginId: "@fitness_star_official",
    password: "insta-pw-example",
    url: "https://instagram.com",
    owner: { name: "이앨리스", tone: "bg-emerald-500" },
    memo: "본사 공식 계정. 릴스 업로드 · DM 응대. 2차 인증은 이앨리스 폰.",
    active: true,
  },
  {
    id: "a2",
    service: "유튜브",
    serviceInitial: "Y",
    serviceTone: "bg-red-500 text-white",
    category: "소셜",
    scope: "전사",
    loginId: "official@fitnessstar.kr",
    password: "yt-pw-example",
    url: "https://youtube.com",
    owner: { name: "이앨리스", tone: "bg-emerald-500" },
    memo: "센터 소개 영상 · 트레이너 인터뷰 채널. 업로드 후 알림 필수.",
    active: true,
  },
  {
    id: "a3",
    service: "카카오채널",
    serviceInitial: "K",
    serviceTone: "bg-amber-400 text-neutral-900",
    category: "소셜",
    scope: "전사",
    loginId: "fitnessstar_official",
    password: "kakao-pw-example",
    url: "https://center-pf.kakao.com",
    owner: { name: "김데모", tone: "bg-primary" },
    memo: "회원 상담 · 예약 문의 응답. 자동응답 워딩은 문서함 > 회원 관리 참고.",
    active: true,
  },
  {
    id: "a4",
    service: "Canva",
    serviceInitial: "C",
    serviceTone: "bg-sky-500 text-white",
    category: "편집",
    scope: "팀",
    loginId: "design@fitnessstar.kr",
    password: "canva-pw-example",
    url: "https://canva.com",
    owner: { name: "박그레이스", tone: "bg-violet-500" },
    memo: "썸네일 · 카드뉴스 제작. Pro 플랜(연 결제). 팀 폴더 구조는 브랜드 가이드 참고.",
    active: true,
  },
  {
    id: "a5",
    service: "CapCut",
    serviceInitial: "V",
    serviceTone: "bg-neutral-800 text-white",
    category: "편집",
    scope: "팀",
    loginId: "video@fitnessstar.kr",
    password: "capcut-pw-example",
    url: "https://capcut.com",
    owner: { name: "박그레이스", tone: "bg-violet-500" },
    memo: "릴스 · 쇼츠 편집. Pro 플랜(월 결제). 프로젝트 파일은 팀 드라이브에.",
    active: true,
  },
  {
    id: "a6",
    service: "네이버 광고",
    serviceInitial: "N",
    serviceTone: "bg-emerald-500 text-white",
    category: "광고",
    scope: "전사",
    loginId: "ads@fitnessstar.kr",
    password: "nads-pw-example",
    url: "https://searchad.naver.com",
    owner: { name: "김데모", tone: "bg-primary" },
    memo: "검색광고 · 파워링크 · 브랜드검색. 월 예산·소진 리포트는 매주 금요일 공유.",
    active: false,
  },
  {
    id: "a7",
    service: "네이버 예약",
    serviceInitial: "N",
    serviceTone: "bg-emerald-500 text-white",
    category: "예약",
    scope: "전사",
    loginId: "reserve@fitnessstar.kr",
    password: "naver-reserve-pw",
    url: "https://booking.naver.com",
    owner: { name: "한이브", tone: "bg-violet-500" },
    memo: "플레이스 예약 관리. 상담 신청 → 카카오채널로 이관.",
    active: true,
  },
];

const SCOPE_TABS: { key: "all" | Scope; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "전사", label: "전사" },
  { key: "팀", label: "팀" },
  { key: "프로젝트", label: "프로젝트" },
];

type ViewMode = "basic" | "detail";

// ─────────────── page ───────────────

export default function AccountsPage() {
  const [scopeTab, setScopeTab] = useState<"all" | Scope>("all");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("basic");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACCOUNTS.filter((a) => {
      if (scopeTab !== "all" && a.scope !== scopeTab) return false;
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      return (
        a.service.toLowerCase().includes(q) ||
        a.loginId.toLowerCase().includes(q) ||
        a.owner.name.toLowerCase().includes(q) ||
        (a.memo?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [scopeTab, category, query]);

  // 헤더 메타 · 스코프 탭 카운트 — 전체 기준.
  const stats = useMemo(() => {
    const activeN = ACCOUNTS.filter((a) => a.active).length;
    const categoryN = new Set(ACCOUNTS.map((a) => a.category)).size;
    const scopeN = new Set(ACCOUNTS.map((a) => a.scope)).size;
    return { total: ACCOUNTS.length, activeN, categoryN, scopeN };
  }, []);
  const scopeCount = (key: "all" | Scope): number =>
    key === "all"
      ? ACCOUNTS.length
      : ACCOUNTS.filter((a) => a.scope === key).length;

  return (
    <div>
      <PageTitle title="계정 관리" />

      {/* 헤더 : 제목 + 메타 stats · 우측 액션 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-fg">
            계정 관리
          </h1>
          <p className="mt-1 text-sm text-muted">
            <b className="text-fg">계정 {stats.total}</b>
            <span className="mx-1.5">·</span>
            활성 {stats.activeN}
            <span className="mx-1.5">·</span>
            카테고리 {stats.categoryN}
            <span className="mx-1.5">·</span>
            공개범위 {stats.scopeN}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />계정 추가
          </button>
        </div>
      </div>

      {/* 보안 안내 배너 (한 줄) */}
      <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300/90">
        <LockClosedIcon className="size-4 shrink-0" />
        <span>
          비밀번호는 AES-256-GCM 으로 암호화돼요. 개인 비번 · 2차 인증 백업 코드는
          저장하지 마세요.
        </span>
      </div>

      {/* 리스트 카드 */}
      <div className="mt-5 overflow-hidden rounded-lg border border-line bg-card">
        {/* 카드 헤더 : 제목 · 카운트 · 뷰 토글 */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="flex items-baseline gap-2 text-base font-black tracking-tight text-fg">
            계정 목록
            <span className="text-sm font-semibold text-muted tabular-nums">
              {filtered.length}
            </span>
          </h2>
          <ViewToggle value={view} onChange={setView} />
        </div>

        {/* 검색 + 필터 */}
        <div className="space-y-3 border-b border-line px-5 py-4">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="서비스 이름 · 로그인 ID · 담당자 · 메모 검색"
              className="w-full rounded-md border border-line bg-card-hover py-2.5 pr-3 pl-9 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as "all" | Category)}
                className="appearance-none rounded-md border border-line bg-card-hover px-3 py-2 pr-8 text-sm text-fg focus:border-primary focus:outline-none"
              >
                <option value="all">모든 카테고리</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
            </div>
            <div className="flex flex-wrap gap-1 rounded-md border border-line p-0.5">
              {SCOPE_TABS.map((t) => {
                const active = scopeTab === t.key;
                const n = scopeCount(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setScopeTab(t.key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-primary/20 text-primary"
                        : "text-muted hover:bg-card-hover hover:text-fg"
                    }`}
                  >
                    {t.label}{" "}
                    <span className="ml-0.5 tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 리스트 */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
            <ShieldExclamationIcon className="size-8 text-muted/70" />
            <p className="text-sm text-muted">조건에 맞는 계정이 없어요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((a) => (
              <AccountRow key={a.id} account={a} view={view} />
            ))}
          </ul>
        )}
      </div>

      <NewAccountDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

// ─────────────── ViewToggle ───────────────

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-line p-0.5">
      {(
        [
          { key: "basic", label: "기본" },
          { key: "detail", label: "상세" },
        ] as { key: ViewMode; label: string }[]
      ).map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`rounded-sm px-4 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-primary/20 text-primary"
                : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────── AccountRow ───────────────

function AccountRow({
  account,
  view,
}: {
  account: Account;
  view: ViewMode;
}) {
  const [active, setActive] = useState(account.active);
  const [showPw, setShowPw] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 실패 조용히 — 실제 앱에선 toast.
    }
  }

  return (
    <li className="px-5 py-5">
      {/* 상단 : 서비스 아이콘 + 이름 · 로그인 · 우측 상태 · 액션 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-black ${account.serviceTone}`}
            aria-hidden
          >
            {account.serviceInitial}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-fg">
              {account.service}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted">
              {account.loginId}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-sm font-semibold ${
              active ? "text-emerald-400" : "text-muted"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                active ? "bg-emerald-400" : "bg-muted"
              }`}
              aria-hidden
            />
            {active ? "활성" : "비활성"}
          </span>
          <Switch checked={active} onChange={setActive} />
          <button
            type="button"
            aria-label="편집"
            className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <PencilSquareIcon className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="삭제"
            className="rounded-md border border-line px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          >
            <TrashIcon className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* 필드 그리드 */}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
        <Field label="카테고리">
          <span className="text-fg">{categoryLabel(account.category)}</span>
        </Field>
        <Field label="공개범위">
          <ScopeChip scope={account.scope} />
        </Field>
        <Field label="담당자">
          <span className="flex items-center gap-1.5">
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${account.owner.tone}`}
              aria-hidden
            >
              {account.owner.name.charAt(0)}
            </span>
            <span className="text-fg">{account.owner.name}</span>
          </span>
        </Field>
        <Field label="URL">
          {account.url ? (
            <a
              href={account.url}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 truncate text-primary hover:underline"
            >
              {account.url.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <span className="text-muted">-</span>
          )}
        </Field>

        {/* 상세 뷰 전용 : 비밀번호 · 메모 (full-width row) */}
        {view === "detail" && (
          <>
            <Field label="비밀번호" className="col-span-2 sm:col-span-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-fg tracking-widest">
                  {showPw ? account.password : "•••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "가리기" : "보기"}
                  className="rounded-md border border-line px-1.5 py-1 text-xs text-muted transition-colors hover:bg-card-hover hover:text-fg"
                >
                  {showPw ? (
                    <EyeSlashIcon className="size-3.5" />
                  ) : (
                    <EyeIcon className="size-3.5" />
                  )}
                </button>
                <CopyChip onClick={() => copy(account.password)} />
              </div>
            </Field>
            {account.memo && (
              <Field label="메모" className="col-span-2 sm:col-span-4">
                <p className="text-sm leading-6 text-fg">{account.memo}</p>
              </Field>
            )}
          </>
        )}
      </dl>
    </li>
  );
}

// ─────────────── bits ───────────────

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 min-w-0 truncate text-sm font-semibold">
        {children}
      </dd>
    </div>
  );
}

function CopyChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1 rounded-md border border-line px-1.5 py-1 text-xs font-semibold text-muted transition-colors hover:bg-card-hover hover:text-fg"
    >
      <ClipboardDocumentIcon className="size-3.5" aria-hidden />
      복사
    </button>
  );
}

function ScopeChip({ scope }: { scope: Scope }) {
  const tone =
    scope === "전사"
      ? "bg-primary/15 text-primary"
      : scope === "팀"
        ? "bg-emerald-500/15 text-emerald-400"
        : "bg-pink-500/15 text-pink-400";
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${tone}`}>
      {scope}
    </span>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-line"
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function categoryLabel(k: Category): string {
  return CATEGORIES.find((c) => c.key === k)?.label ?? k;
}
