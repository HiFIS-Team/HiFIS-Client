"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createBranch, type BranchInput } from "@/lib/api/branches";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { MobileSubPage } from "../MobileSubPage";
import { BranchForm } from "./BranchForm";
import { BranchFormDialog } from "./BranchFormDialog";

// SUPER_ADMIN 전용 헤더 인라인 지점 등록 버튼.
// 글로벌 BranchPicker 옆에 두어 어디서든 빠르게 새 지점 추가.
// 모바일 : 프로필 / 메시지처럼 우측에서 슬라이드 인하는 MobileSubPage 패턴.
// PC     : 가운데 모달 (BranchFormDialog) — 헤더 +가 PC 에서도 보이는데
//          페이지 본문을 폼으로 채우면 어색하므로 모달 유지.
// 상위에서 isSuper 가드 후 mount — 컴포넌트 자체는 권한 체크 안 함.
export function BranchRegisterButton() {
  const toast = useToast();
  const queryClient = useQueryClient();
  // null=닫힘, "panel"=모바일 슬라이드, "modal"=PC 모달.
  // 클릭 시점에 matchMedia 로 1회 결정 — 도중 회전·resize 까지 따라가진 않음.
  const [mode, setMode] = useState<"panel" | "modal" | null>(null);

  // Portal mount 가드 — 첫 렌더 시 document 없을 수 있음 (정적 빌드).
  // mount 후 true 되면 createPortal 호출 안전.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function openForm() {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    setMode(isDesktop ? "modal" : "panel");
  }
  function closeForm() {
    setMode(null);
  }

  const createMutation = useMutation({
    mutationFn: (v: BranchInput) => createBranch(v),
    onSuccess: () => {
      toast.success("지점이 등록되었습니다.");
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        aria-label="지점 등록"
        title="지점 등록"
        className="rounded-md p-1.5 text-primary transition-colors hover:bg-primary/15"
      >
        <PlusIcon className="size-5" />
      </button>
      {mode === "panel" &&
        mounted &&
        createPortal(
          // data-theme="dark" — portal 은 document.body 직속이라 어드민 outer
          // 트리 밖. 그 안에서 dark: 변형 (TextField/Select 등) 이 다시 적용
          // 되도록 wrapper 에 다시 부착.
          <div data-theme="dark">
            <MobileSubPage title="지점 등록" onClose={closeForm}>
              <BranchForm
                variant="panel"
                loading={createMutation.isPending}
                onSubmit={(values) => createMutation.mutate(values)}
                onCancel={closeForm}
              />
            </MobileSubPage>
          </div>,
          document.body,
        )}
      <BranchFormDialog
        open={mode === "modal"}
        title="지점 등록"
        loading={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
        onCancel={closeForm}
      />
    </>
  );
}
