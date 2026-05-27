import type { MetadataRoute } from "next";

// 정적 export(output: export)에서 메타데이터 라우트는 정적 생성이 필수
export const dynamic = "force-static";

// PWA manifest — 태블릿 키오스크 전체화면(standalone) 운영용.
// 색상·아이콘은 디자인 확정 시 교체 (현재 placeholder).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HiFIS",
    short_name: "HiFIS",
    description: "피트니스스타 회원가입·PT 신청·예약 관리",
    // PWA 시작 — 루트로 두고, 디바이스별 분기는 page.tsx 에서 처리.
    // 키오스크 태블릿: localStorage 의 kiosk_branch_id 가 있으면 /kiosk 로.
    // 관리자 폰: 없으면 /admin/login 으로.
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko",
    icons: [
      // 둥근 모서리 PNG — iOS·Android·브라우저 탭 모두 same image 사용.
      // maskable purpose 는 제거 (Android 가 시스템 마스크 한 번 더 씌워 모서리가 깎이는 것 방지).
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
