import type { MetadataRoute } from "next";

// 정적 export(output: export)에서 메타데이터 라우트는 정적 생성이 필수
export const dynamic = "force-static";

// PWA manifest — 태블릿 키오스크 전체화면(standalone) 운영용.
// 색상·아이콘은 디자인 확정 시 교체 (현재 placeholder).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "피트니스스타 신청",
    short_name: "피트니스스타",
    description: "피트니스스타 회원가입·PT 신청 키오스크",
    // 설치된 PWA는 키오스크 화면으로 시작
    start_url: "/kiosk",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko",
    icons: [
      {
        // TODO: 실제 브랜드 아이콘(PNG 192/512)으로 교체
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
