import type { MetadataRoute } from "next";

// 정적 export(output: export)에서 메타데이터 라우트는 정적 생성이 필수
export const dynamic = "force-static";

// PWA manifest — 관리자 대시보드용 (홈 화면 추가 시 사용).
// 회원/PT 신청은 매장 QR, 예약은 네이버 플레이스 링크로 진입하므로
// PWA standalone 은 사실상 관리자만 쓴다 → start_url = 로그인 화면.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HiFIS",
    short_name: "HiFIS",
    description: "피트니스스타 회원가입·PT 신청·예약 관리",
    start_url: "/admin/login",
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
