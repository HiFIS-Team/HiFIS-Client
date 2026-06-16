"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { ArrowDownTrayIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/providers/ToastProvider";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// 지점별 등록 QR 코드 미리보기 + PNG 다운로드.
// URL: <origin>/register?branch_id=<id>
//   → 회원이 스캔 → 진입 화면(회원가입/PT 선택) → 본인 폰에서 작성
export function QrDialog({
  branch,
  onClose,
}: {
  branch: { id: string; name: string };
  onClose: () => void;
}) {
  const toast = useToast();
  useEscapeKey(onClose);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 다이얼로그는 사용자 인터랙션 후에만 마운트되므로 window 접근 안전.
  // SSR/정적 빌드 시점에는 렌더되지 않음.
  const url =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/register?branch_id=${branch.id}`;

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 300,
      margin: 2,
      // 어두운 보라 → 인쇄 시 가독성 + 브랜드 톤
      color: { dark: "#1f1147", light: "#ffffff" },
    }).catch(() => undefined);
  }, [url]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `hifis-qr-${branch.name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL이 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-sm flex-col rounded-xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-line px-6 py-4 text-lg font-bold text-fg">
          {branch.name} 등록 QR
        </h2>

        <div className="flex flex-col items-center gap-4 px-6 py-6">
          {/* QR 자체가 흰 배경(light:#ffffff) 이라 컨테이너도 흰 유지 — 다크에서
              떠 보이지만 인쇄 톤 일관 + 스캔 인식률 우선. */}
          <div className="rounded-lg border border-line bg-white p-2">
            <canvas ref={canvasRef} className="block" />
          </div>
          <p className="break-all text-center text-xs text-muted">{url}</p>
          <p className="text-center text-sm text-fg">
            매장에 부착해두면 회원이 스캔 → 본인 폰에서 회원가입·PT 신청서를
            작성합니다.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-fg hover:bg-card-hover"
          >
            <ClipboardIcon className="size-4" />
            URL 복사
          </button>
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/25 shadow-lg shadow-primary/20 px-3 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/35 active:scale-[0.97]"
          >
            <ArrowDownTrayIcon className="size-4" />
            PNG 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
