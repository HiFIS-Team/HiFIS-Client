"use client";

import { useCallback, useEffect, useState } from "react";

// 앱 가이드 (풀스크린 오버레이).
// 첫 로그인 시 자동 표시(layout 에서 flag 체크) + 사이드바 "앱 가이드" 로 언제든 다시 볼 수 있음.
// 슬라이드 진입 시 아이콘이 살짝 튀며 회전 (animate-guide-icon @ globals.css).

const STORAGE_KEY = "hifis-guide-seen";

// 이 flag 를 켜두면 layout 이 자동 노출 스킵 → 다시 안 뜸.
export function markGuideSeen(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "1");
}
export function hasSeenGuide(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

interface Slide {
  kicker: string;
  emoji: string;
  title: string;
  body: string;
  bullets?: string[];
}

const SLIDES: Slide[] = [
  {
    kicker: "WELCOME",
    emoji: "👋",
    title: "피트니스스타 워크스페이스에 오신 걸 환영해요",
    body: "회의록 · 결재 · 근태 · 문서 · 채팅까지 사내 협업에 필요한 모든 흐름을 한 곳에서 처리해요. 잠깐만 둘러보고 시작해볼까요?",
  },
  {
    kicker: "NAVIGATION",
    emoji: "🧭",
    title: "왼쪽 사이드바로 페이지 이동",
    body: "워크스페이스에는 일정 · 회의록 · 결재 · 근태 · 문서 등 자주 쓰는 메뉴가 모여있어요. 대기 항목이 있으면 옆에 빨간 카운트로 표시됩니다.",
    bullets: [
      "홈 — 출근 · 오늘 일정 · 공지 한눈에",
      "회의록 — 노션 스타일 리치 에디터",
      "전자결재 — 출장 · 외근 · 지출 · 구매",
    ],
  },
  {
    kicker: "COMMUNICATION",
    emoji: "💬",
    title: "우측 하단 채팅으로 팀과 소통",
    body: "1:1 DM 부터 팀방, 전사 공지방까지 사내톡으로 처리해요. 이모지 반응 · 이미지 공유 · 파일 첨부 모두 지원합니다.",
  },
  {
    kicker: "GET STARTED",
    emoji: "🚀",
    title: "이제 시작해볼까요?",
    body: "궁금한 게 생기면 사이드바 > 앱 가이드 에서 언제든 다시 볼 수 있어요. 데모 데이터로 자유롭게 눌러보세요.",
  },
];

export function AppGuide({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  // 아이콘 애니메이션 재트리거용 key — 슬라이드 바뀔 때마다 이모지 element 리마운트.
  const [iconKey, setIconKey] = useState(0);

  // 가이드가 뜰 때 SW / cache storage 자동 초기화 (세션당 1회) →
  // 새 빌드 배포 후 옛 CSS 캐시로 그라데이션·크기가 안 먹히는 문제 방지.
  // sessionStorage flag 로 무한 리로드 방지 (탭 세션 안에서만 유효).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const CLEARED_KEY = "hifis-guide-cache-cleared";
    if (window.sessionStorage.getItem(CLEARED_KEY)) return;

    let aborted = false;
    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
      } catch {
        // 캐시 API 실패 (구형 브라우저 등) — 조용히 무시하고 다음 단계로.
      }
      if (aborted) return;
      window.sessionStorage.setItem(CLEARED_KEY, "1");
      // 최신 자산으로 hard reload — bypass HTTP 캐시.
      window.location.reload();
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const isLast = index === SLIDES.length - 1;

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
    setIconKey((k) => k + 1);
  }, []);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
    setIconKey((k) => k + 1);
  }, []);
  const finish = useCallback(() => {
    markGuideSeen();
    onClose();
  }, [onClose]);

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isLast) finish();
        else next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isLast) finish();
        else next();
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isLast, next, prev, finish]);

  const slide = SLIDES[index];

  return (
    <div
      data-theme="dark"
      role="dialog"
      aria-modal="true"
      aria-label="앱 가이드"
      // gradient 는 inline — 화면 전체가 확실히 primary 톤으로 보이도록 3-stop 유지
      // 어두운 끝(black) 대신 violet-800 로 마무리해서 코너까지 컬러 유지.
      style={{
        background:
          "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)",
      }}
      className="animate-fade-in fixed inset-0 z-[60] flex flex-col overflow-hidden text-fg"
    >
      {/* 은은한 조명 blob (그라데이션 위에 살짝 씌워 깊이감) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 size-[36rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 size-[32rem] rounded-full bg-pink-500/20 blur-3xl" />
      </div>

      {/* 상단 바 */}
      <header className="relative flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-white/15 text-xs font-black text-white backdrop-blur-sm">
            H
          </span>
          <p className="text-sm font-semibold text-white">
            HiFIS <span className="text-white/60">· 앱 가이드</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-white/70 tabular-nums">
            {String(index + 1).padStart(2, "0")}{" "}
            <span className="text-white/30">/</span>{" "}
            {String(SLIDES.length).padStart(2, "0")}
          </p>
          <button
            type="button"
            onClick={finish}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            건너뛰기{" "}
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
              ESC
            </kbd>
          </button>
        </div>
      </header>

      {/* 중앙 — 슬라이드 콘텐츠 */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-black tracking-[0.35em] text-white/80 uppercase">
          {slide.kicker}
        </p>
        <div
          key={iconKey}
          // font-size 는 inline — arbitrary value 컴파일 이슈 회피
          style={{ fontSize: "10rem", lineHeight: 1 }}
          className="animate-guide-icon mt-6 select-none drop-shadow-2xl"
          aria-hidden
        >
          {slide.emoji}
        </div>
        <h2 className="mt-8 max-w-2xl text-3xl font-black tracking-tighter text-white">
          {slide.title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
          {slide.body}
        </p>
        {slide.bullets && (
          <ul className="mt-6 space-y-2 text-left text-sm">
            {slide.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-white">
                <span className="size-1.5 shrink-0 rounded-full bg-white/80" />
                {b}
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* 하단 — 진행 바 + 이동 버튼 + 키보드 힌트 */}
      <footer className="relative flex flex-col items-center gap-4 px-6 pb-8">
        {/* Progress bar */}
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-0.5 w-16 rounded-full transition-colors ${
                i <= index ? "bg-white" : "bg-white/25"
              }`}
            />
          ))}
        </div>

        {/* Nav buttons — 그라데이션 위 대비를 위해 backdrop-blur + 강한 명도 */}
        <div className="flex gap-2">
          {index > 0 && (
            <button
              type="button"
              onClick={prev}
              className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              ← 이전
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? finish : next}
            // 흰 배경 · 검은 글자 — inline 으로 확실히 강제 (data-theme dark 셀렉터 상속 방지)
            style={{ backgroundColor: "#fff", color: "#171717" }}
            className="flex items-center gap-1 rounded-full px-6 py-2.5 text-sm font-bold shadow-lg shadow-black/30 transition-transform hover:scale-[1.03]"
          >
            {isLast ? "시작하기" : "다음"} →
          </button>
        </div>

        {/* 키보드 힌트 */}
        <p className="flex items-center gap-2 text-xs text-white/70">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              ←
            </kbd>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              →
            </kbd>
            이동
          </span>
          <span className="text-white/30">·</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Enter
            </kbd>
            {isLast ? "시작" : "다음"}
          </span>
        </p>
      </footer>
    </div>
  );
}
