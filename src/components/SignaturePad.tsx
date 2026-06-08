"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import SignaturePadCore from "signature_pad";

// 외부에서 호출 가능한 명령형 API — 부모(다이얼로그)가 ref 로 보유.
export interface SignaturePadHandle {
  clear(): void;
  isEmpty(): boolean;
  // PNG Blob 으로 추출 (서버 업로드용)
  toBlob(): Promise<Blob | null>;
  // 입력 잠금/해제 — false 면 그리기 비활성, true 면 다시 그릴 수 있음.
  // signature_pad 내부의 dom 리스너만 제어, 우리가 등록한 endStroke 등은 유지.
  setEnabled(enabled: boolean): void;
}

interface SignaturePadProps {
  className?: string;
  // 한 획이 끝날 때마다 호출 — 부모가 hasDrawn 상태 추적에 사용.
  onStrokeEnd?: () => void;
}

// 캔버스 기반 서명 패드 — signature_pad 라이브러리 래퍼.
// 터치/마우스/스타일러스 모두 지원, DPR 보정으로 선이 흐리지 않게.
// 종이 위 서명 느낌 — 흰 배경 + 옅은 baseline 가이드 + touch-none 으로 모바일 제스처 차단.
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ className, onStrokeEnd }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const padRef = useRef<SignaturePadCore | null>(null);
    // onStrokeEnd 가 매 렌더 함수 새로 만들어져도 useEffect 가 다시 안 돌게 ref 로 보관.
    const onStrokeEndRef = useRef(onStrokeEnd);
    useEffect(() => {
      onStrokeEndRef.current = onStrokeEnd;
    }, [onStrokeEnd]);

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

      // 캔버스 픽셀 크기 ↔ CSS 크기 동기화.
      // 다이얼로그 열림 애니메이션·창 크기 변경·반응형 레이아웃 등으로
      // CSS 크기가 변하면 내부 좌표계가 깨져 마우스 작은 움직임이 큰 선으로 그려진다.
      // ResizeObserver 로 매번 따라가며, 기존 서명은 fromData 로 복원.
      function syncCanvasSize() {
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const newW = Math.floor(rect.width * dpr);
        const newH = Math.floor(rect.height * dpr);
        if (canvas.width === newW && canvas.height === newH) return;

        // 기존 서명 데이터 백업 → 캔버스 리사이즈 → 복원.
        const data = padRef.current?.toData() ?? [];
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext("2d");
        ctx?.scale(dpr, dpr);
        if (data.length && padRef.current) {
          // signature_pad 가 fromData 시 clear + replay 하므로 baseline 위로 덮어쓰는 충돌 없음.
          padRef.current.fromData(data);
        } else {
          // 빈 캔버스에만 가이드 라인. 서명이 있으면 가이드가 사인을 가로지르지 않게 생략.
          drawBaseline();
        }
      }

      syncCanvasSize();

      const pad = new SignaturePadCore(canvas, {
        penColor: "#111827", // gray-900
        backgroundColor: "rgba(0,0,0,0)", // 투명 — 외곽 박스 배경 보이게
        minWidth: 0.9,
        maxWidth: 2.6,
      });
      pad.addEventListener("endStroke" as never, () => {
        onStrokeEndRef.current?.();
      });
      padRef.current = pad;

      // CSS 크기 변화 추적 — window resize 뿐 아니라 다이얼로그 애니메이션·반응형도 잡힘.
      const ro = new ResizeObserver(() => syncCanvasSize());
      ro.observe(canvas);

      return () => {
        ro.disconnect();
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
        setEnabled: (enabled: boolean) => {
          // signature_pad 의 dom 리스너 on/off — endStroke 등 custom listener 는 유지됨.
          if (enabled) padRef.current?.on();
          else padRef.current?.off();
        },
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
