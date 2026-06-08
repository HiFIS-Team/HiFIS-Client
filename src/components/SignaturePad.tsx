"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import SignaturePadCore from "signature_pad";

// 외부에서 호출 가능한 명령형 API — 부모(다이얼로그)가 ref 로 보유.
export interface SignaturePadHandle {
  clear(): void;
  isEmpty(): boolean;
  // PNG Blob 으로 추출 (서버 업로드용)
  toBlob(): Promise<Blob | null>;
}

interface SignaturePadProps {
  className?: string;
}

// 캔버스 기반 서명 패드 — signature_pad 라이브러리 래퍼.
// 터치/마우스/스타일러스 모두 지원, DPR 보정으로 선이 흐리지 않게.
// 종이 위 서명 느낌 — 흰 배경 + 옅은 baseline 가이드 + touch-none 으로 모바일 제스처 차단.
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const padRef = useRef<SignaturePadCore | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // baseline 가이드 — 종이 노트 줄처럼 캔버스 하단 1/3 지점에 옅은 선.
      // 사용자가 서명할 기준선 역할. 캔버스가 클리어/리사이즈될 때마다 다시 그림.
      function drawBaseline() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const y = h * 0.72;
        ctx.save();
        ctx.strokeStyle = "rgba(124, 58, 237, 0.18)"; // primary tinted
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(w * 0.05, y);
        ctx.lineTo(w * 0.95, y);
        ctx.stroke();
        ctx.restore();
      }

      // 캔버스 픽셀 크기 = CSS 크기 × devicePixelRatio.
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        const ctx = canvas.getContext("2d");
        ctx?.scale(dpr, dpr);
        padRef.current?.clear();
        drawBaseline();
      };
      resize();
      window.addEventListener("resize", resize);

      const pad = new SignaturePadCore(canvas, {
        penColor: "#111827", // gray-900
        backgroundColor: "rgba(0,0,0,0)", // 투명 — 외곽 박스 배경 보이게
        minWidth: 0.9,
        maxWidth: 2.6,
      });
      // 사용자가 그리기 시작하면 baseline 은 자연스럽게 묻힘. clear() 후 다시 그릴 때
      // baseline 도 같이 복원해야 첫 진입과 동일한 모습.
      pad.addEventListener("afterUpdateStroke" as never, () => {});
      padRef.current = pad;

      return () => {
        window.removeEventListener("resize", resize);
        pad.off();
        padRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          padRef.current?.clear();
          // 클리어 후 baseline 다시 그리기
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (!canvas || !ctx) return;
          const dpr = window.devicePixelRatio || 1;
          const w = canvas.width / dpr;
          const h = canvas.height / dpr;
          const y = h * 0.72;
          ctx.save();
          ctx.strokeStyle = "rgba(124, 58, 237, 0.18)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(w * 0.05, y);
          ctx.lineTo(w * 0.95, y);
          ctx.stroke();
          ctx.restore();
        },
        isEmpty: () => padRef.current?.isEmpty() ?? true,
        toBlob: () =>
          new Promise<Blob | null>((resolve) => {
            const c = canvasRef.current;
            if (!c) {
              resolve(null);
              return;
            }
            c.toBlob((b) => resolve(b), "image/png");
          }),
      }),
      [],
    );

    return (
      <canvas
        ref={canvasRef}
        className={`block touch-none ${className ?? ""}`}
      />
    );
  },
);
