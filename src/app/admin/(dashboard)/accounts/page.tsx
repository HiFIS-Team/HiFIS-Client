"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldExclamationIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import {
  deleteAccount,
  getAccountSecret,
  listAccounts,
  type AccountOut,
  type AccountScope,
} from "@/lib/api/v2/accounts";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import { PageTitle } from "../PageTitle";
import { NewAccountDialog } from "./NewAccountDialog";

// 팀 리소스 · 계정 관리 — GET /accounts.
// 비번은 응답에 없음. 눈 아이콘 → GET /accounts/{id}/secret 로 별도 로드 (접근 로그).
// 편집/삭제/비번 열람은 owner 또는 ADMIN.

// ─────────────── 카테고리 (프론트 정의, 백엔드에 문자열로 저장) ───────────────

interface CategoryMeta {
  key: string;
  label: string;
  emoji: string;
}
const CATEGORIES: CategoryMeta[] = [
  { key: "소셜", label: "소셜 미디어", emoji: "📱" },
  { key: "편집", label: "디자인 · 편집", emoji: "🎨" },
  { key: "광고", label: "광고", emoji: "📢" },
  { key: "예약", label: "예약 · CRM", emoji: "🗓️" },
];

const SCOPE_TABS: { key: "all" | AccountScope; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "전사", label: "전사" },
  { key: "팀", label: "팀" },
  { key: "프로젝트", label: "프로젝트" },
];

// ─────────────── page ───────────────

export default function AccountsPage() {
  const [scopeTab, setScopeTab] = useState<"all" | AccountScope>("all");
  const [category, setCategory] = useState<"all" | string>("all");
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["v2", "accounts"] as const,
    queryFn: () => listAccounts({}),
  });
  const accounts = accountsQuery.data ?? [];

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (scopeTab !== "all" && a.scope !== scopeTab) return false;
      if (category !== "all" && a.cat !== category) return false;
      if (!q) return true;
      const ownerName = employeeLookup.get(a.ownerId)?.name ?? "";
      return (
        a.name.toLowerCase().includes(q) ||
        a.loginId.toLowerCase().includes(q) ||
        ownerName.toLowerCase().includes(q) ||
        (a.memo ?? "").toLowerCase().includes(q)
      );
    });
  }, [accounts, scopeTab, category, query, employeeLookup]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((c) => ({
      meta: c,
      items: filtered.filter((a) => a.cat === c.key),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  // 기타 (프론트 4카테고리에 안 잡히는 것들)
  const others = useMemo(
    () =>
      filtered.filter(
        (a) => !CATEGORIES.some((c) => c.key === a.cat),
      ),
    [filtered],
  );

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["v2", "accounts"] });
  }

  return (
    <div>
      <PageTitle title="계정 관리" />

      {/* 상단 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">팀 리소스</p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-fg">
            계정 관리
          </h1>
          <p className="mt-1 text-sm text-muted">
            인스타 · 편집 툴 · 광고 등 팀이{" "}
            <b className="text-fg">공용으로 쓰는</b> 서비스 계정을 한 곳에서
            관리해요. ⚠️ 개인 계정은 저장하지 마세요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon
              className={`size-4 ${accountsQuery.isFetching ? "animate-spin" : ""}`}
            />
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

      {/* 보안 안내 배너 */}
      <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-400">
          <LockClosedIcon className="size-4" />
          비밀번호는 암호화해서 저장돼요 (AES-256-GCM).
        </p>
        <p className="mt-1 pl-6 text-xs text-muted">
          공용 계정의 비밀번호만 여기에 기록하고, 개인 비번·루트 키·2차 인증 백업
          코드는 1Password / Bitwarden 같은 전용 도구를 쓰세요. 비번 열람은
          작성자와 관리자만 가능하며 접근 로그가 남습니다.
        </p>
      </div>

      {/* 스코프 탭 (underline) */}
      <div className="mt-5 flex items-center gap-1 border-b border-line">
        {SCOPE_TABS.map((t) => {
          const active = scopeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setScopeTab(t.key)}
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

      {/* 검색 + 카테고리 필터 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="서비스 이름·로그인 ID·담당자·메모 검색"
            className="w-full rounded-md border border-line bg-card-hover py-2.5 pr-3 pl-9 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none rounded-md border border-line bg-card-hover px-3 py-2.5 pr-8 text-sm text-fg focus:border-primary focus:outline-none"
          >
            <option value="all">전체 카테고리</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {/* 리스트 */}
      {accountsQuery.isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : accountsQuery.isError ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-line bg-card p-8 text-center">
          <ExclamationTriangleIcon className="size-8 text-red-400" />
          <p className="text-sm text-fg">
            {getV2ErrorMessage(accountsQuery.error)}
          </p>
          <button
            type="button"
            onClick={() => accountsQuery.refetch()}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-card-hover"
          >
            다시 시도
          </button>
        </div>
      ) : grouped.length === 0 && others.length === 0 ? (
        <div className="mt-8 flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-card p-8 text-center">
          <ShieldExclamationIcon className="size-8 text-muted/70" />
          <p className="text-sm text-muted">조건에 맞는 계정이 없어요.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map((g) => (
            <section key={g.meta.key}>
              <h2 className="flex items-center gap-2 text-sm font-bold text-muted">
                <span>{g.meta.emoji}</span>
                <span>{g.meta.label}</span>
                <span className="text-muted/70 tabular-nums">
                  · {g.items.length}
                </span>
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {g.items.map((a) => (
                  <AccountCard
                    key={a.id}
                    account={a}
                    ownerName={
                      employeeLookup.get(a.ownerId)?.name ?? "알 수 없음"
                    }
                    ownerColor={employeeLookup.get(a.ownerId)?.avatarColor}
                    canManage={isAdmin || a.ownerId === meId}
                    onChanged={refresh}
                  />
                ))}
              </div>
            </section>
          ))}

          {others.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-muted">
                <span>📦</span>
                <span>기타</span>
                <span className="text-muted/70 tabular-nums">
                  · {others.length}
                </span>
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {others.map((a) => (
                  <AccountCard
                    key={a.id}
                    account={a}
                    ownerName={
                      employeeLookup.get(a.ownerId)?.name ?? "알 수 없음"
                    }
                    ownerColor={employeeLookup.get(a.ownerId)?.avatarColor}
                    canManage={isAdmin || a.ownerId === meId}
                    onChanged={refresh}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <NewAccountDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          refresh();
          setNewOpen(false);
        }}
      />
    </div>
  );
}

// ─────────────── AccountCard ───────────────

// 카테고리 → 아이콘 톤 (서비스 아이콘 배경). 서비스별 색은 이름 첫자 해시.
function serviceTone(cat: string): string {
  if (cat === "소셜") return "bg-pink-500";
  if (cat === "편집") return "bg-sky-500";
  if (cat === "광고") return "bg-emerald-500";
  if (cat === "예약") return "bg-amber-500";
  return "bg-primary";
}

function AccountCard({
  account,
  ownerName,
  ownerColor,
  canManage,
  onChanged,
}: {
  account: AccountOut;
  ownerName: string;
  ownerColor: string | undefined;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState<string | null>(null);
  const [secretError, setSecretError] = useState<string | null>(null);

  const secretMutation = useMutation({
    mutationFn: () => getAccountSecret(account.id),
    onSuccess: (data) => {
      setPw(data.password);
      setShowPw(true);
      setSecretError(null);
    },
    onError: (e) => {
      setSecretError(getV2ErrorMessage(e));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(account.id),
    onSuccess: () => onChanged(),
  });

  function togglePw() {
    if (showPw) {
      setShowPw(false);
      return;
    }
    if (pw != null) {
      setShowPw(true);
      return;
    }
    // 접근 로그가 남는다는 경고를 한 번만.
    if (
      !confirm(
        "비밀번호를 조회하면 접근 로그가 남습니다. 진행할까요?",
      )
    ) {
      return;
    }
    secretMutation.mutate();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 실제 앱에선 toast.
    }
  }

  async function copyPassword() {
    if (pw != null) {
      await copy(pw);
      return;
    }
    if (
      !confirm(
        "비밀번호를 복사하면 접근 로그가 남습니다. 진행할까요?",
      )
    ) {
      return;
    }
    try {
      const s = await getAccountSecret(account.id);
      setPw(s.password);
      await copy(s.password);
    } catch (e) {
      setSecretError(getV2ErrorMessage(e));
    }
  }

  function del() {
    if (!confirm(`"${account.name}" 계정을 삭제할까요? 되돌릴 수 없어요.`))
      return;
    deleteMutation.mutate();
  }

  return (
    <article className="rounded-lg border border-line bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-md text-base font-black text-white ${serviceTone(account.cat)}`}
            aria-hidden
          >
            {account.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-fg">
              {account.name}
              {!account.active && (
                <span className="ml-2 text-xs font-normal text-muted">
                  비활성
                </span>
              )}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <span>{account.cat}</span>
              <ScopeChip scope={account.scope} />
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canManage && (
            <>
              <button
                type="button"
                aria-label="편집"
                className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-fg transition-colors hover:bg-card-hover disabled:opacity-40"
                title="편집 (준비 중)"
                disabled
              >
                <PencilSquareIcon className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="삭제"
                onClick={del}
                disabled={deleteMutation.isPending}
                className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TrashIcon className="size-3.5" aria-hidden />
              </button>
            </>
          )}
        </div>
      </header>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="로그인">
          <span className="min-w-0 flex-1 truncate font-mono text-fg">
            {account.loginId}
          </span>
          <CopyChip onClick={() => copy(account.loginId)} />
        </Row>
        <Row label="비밀번호">
          {canManage ? (
            <>
              <span className="min-w-0 flex-1 truncate font-mono text-fg tracking-widest">
                {secretMutation.isPending && !pw
                  ? "로딩 중…"
                  : showPw && pw
                    ? pw
                    : "•••••••"}
              </span>
              <button
                type="button"
                onClick={togglePw}
                aria-label={showPw ? "가리기" : "보기"}
                disabled={secretMutation.isPending}
                className="rounded-md border border-line px-1.5 py-1 text-xs font-semibold text-muted transition-colors hover:bg-card-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              >
                {showPw ? (
                  <EyeSlashIcon className="size-3.5" />
                ) : (
                  <EyeIcon className="size-3.5" />
                )}
              </button>
              <CopyChip onClick={copyPassword} />
            </>
          ) : (
            <span className="text-xs text-muted">작성자·관리자만 열람</span>
          )}
        </Row>
        {account.url && (
          <Row label="URL">
            <a
              href={account.url}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 flex-1 truncate text-primary hover:underline"
            >
              {account.url.replace(/^https?:\/\//, "")}
            </a>
          </Row>
        )}
        <Row label="담당자">
          <span className="flex items-center gap-1.5">
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarTone(ownerColor)}`}
              aria-hidden
            >
              {ownerName.charAt(0)}
            </span>
            <span className="text-fg">{ownerName}</span>
          </span>
        </Row>
      </dl>

      {account.memo && (
        <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">
          {account.memo}
        </p>
      )}

      {secretError && (
        <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {secretError}
        </p>
      )}
      {deleteMutation.isError && (
        <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {getV2ErrorMessage(deleteMutation.error)}
        </p>
      )}
    </article>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-16 shrink-0 text-xs text-muted">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-1.5">{children}</dd>
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

function ScopeChip({ scope }: { scope: AccountScope }) {
  const tone =
    scope === "전사"
      ? "bg-primary/15 text-primary"
      : scope === "팀"
        ? "bg-emerald-500/15 text-emerald-400"
        : "bg-pink-500/15 text-pink-400";
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}
    >
      {scope}
    </span>
  );
}

function SkeletonCard() {
  return (
    <article className="animate-pulse rounded-lg border border-line bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-md bg-card-hover" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded bg-card-hover" />
          <div className="h-3 w-1/3 rounded bg-card-hover" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 rounded bg-card-hover" />
        <div className="h-3 rounded bg-card-hover" />
      </div>
    </article>
  );
}
