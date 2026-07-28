"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/v2/auth";
import { getBranches } from "@/lib/api/branches";
import type { Branch } from "@/lib/api/types";
import { useToast } from "@/providers/ToastProvider";
import { branchShortName } from "@/components/BranchPicker";

// 글로벌 지점 선택 — 모든 어드민 페이지가 이 한 지점을 기준으로 데이터를 보여준다.
// "전체 지점" 옵션은 없음 (대표 요청). SUPER_ADMIN 은 사이드바 셀렉터로 전환,
// FC 는 본인 지점에 고정.
// 선택 값은 localStorage 에 저장 — 새로고침/탭 재진입에도 유지.

const STORAGE_KEY = "hifis-selected-branch-id";

interface BranchContextValue {
  // 현재 선택된 지점 id. 데이터 로드 전엔 undefined.
  selectedBranchId: string | undefined;
  // 선택 변경 (SUPER_ADMIN 만 의미. FC 는 호출해도 무시).
  setSelectedBranchId: (id: string) => void;
  branches: Branch[];
  isSuper: boolean;
  // me / branches 로드 + 기본값 결정까지 완료됐는지.
  isReady: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch must be used inside <BranchProvider>");
  }
  return ctx;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  // v2: ADMIN=대표(구 SUPER_ADMIN 대응), MANAGER/MEMBER=점장/일반.
  const isSuper = meQuery.data?.role === "ADMIN";

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const branches = useMemo(
    () => branchesQuery.data ?? [],
    [branchesQuery.data],
  );

  // SUPER_ADMIN 선택값 (localStorage 보존).
  const [storedId, setStoredId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setStoredId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  // 기본 지점 — 화순 포함된 지점 우선, 없으면 첫 지점.
  const defaultBranch = useMemo(
    () => branches.find((b) => b.name.includes("화순")) ?? branches[0],
    [branches],
  );

  const fcBranchId = meQuery.data?.branchId ?? undefined;

  // 결정 우선순위:
  // - FC: 본인 지점 (고정)
  // - SUPER_ADMIN: localStorage 값 (유효한 지점일 때) → 화순점 → 첫 지점
  const selectedBranchId = isSuper
    ? storedId && branches.some((b) => b.id === storedId)
      ? storedId
      : defaultBranch?.id
    : fcBranchId;

  function setSelectedBranchId(id: string) {
    if (!isSuper) return;
    if (id === selectedBranchId) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    setStoredId(id);
    const next = branches.find((b) => b.id === id);
    if (next) {
      toast.success(`${branchShortName(next.name)}으로 변경했습니다`);
    }
  }

  const isReady =
    !!meQuery.data && !!branchesQuery.data && !!selectedBranchId;

  const value = useMemo<BranchContextValue>(
    () => ({
      selectedBranchId,
      setSelectedBranchId,
      branches,
      isSuper,
      isReady,
    }),
    // setSelectedBranchId 는 클로저 안에서 storedId 의존이라 deps 에 storedId 만 두면 충분.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedBranchId, branches, isSuper, isReady, storedId],
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}
