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
// touch-none 으로 모바일 스크롤·줌 제스처 차단해 그리기만 받음.
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const padRef = useRef<SignaturePadCore | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // 캔버스 픽셀 크기 = CSS 크기 × devicePixelRatio.
      // CSS 크기는 외곽 박스가 정함. 리사이즈 시 캔버스 비워짐(픽셀 손실).
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        const ctx = canvas.getContext("2d");
        ctx?.scale(dpr, dpr);
        padRef.current?.clear();
      };
      resize();
      window.addEventListener("resize", resize);

      const pad = new SignaturePadCore(canvas, {
        penColor: "#111827", // gray-900
        backgroundColor: "rgba(0,0,0,0)", // 투명 — 외곽 박스 배경 그대로 보이게
        minWidth: 0.8,
        maxWidth: 2.5,
      });
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
        clear: () => padRef.current?.clear(),
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
