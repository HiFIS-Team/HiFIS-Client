# HiFIS-Client

피트니스스타 회원·PT 신청 PWA. Next.js (App Router) + Tailwind v4 + TanStack Query.
정적 export (`output: "export"`) — `out/` 폴더를 정적 호스팅(nginx 등) 으로 서빙.

## 개발

```bash
cp .env.example .env.local       # 백엔드 URL 등 환경변수 셋업
npm install
npm run dev                       # http://localhost:3000
```

LAN 다른 기기(폰 등) 에서도 접근하려면 `.env.local` 의 `NEXT_PUBLIC_API_BASE_URL` 을
LAN IP (`http://192.168.x.x:8000`) 로.

## 운영 빌드

`NEXT_PUBLIC_*` 값은 빌드 시점에 번들로 인라인된다. 운영 환경은 `.env.local` 대신
**명령 인라인** 으로 환경변수 주입:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.hifis.app npm run build
# → out/ 폴더에 정적 파일 생성
```

## 배포 (정적 호스팅 — nginx)

`out/` 폴더를 nginx 의 `root` 로. 두 가지 포인트:

1. **SPA fallback** — 동적 라우트(`/admin/members/[id]` 등) 대응
2. **`/sw.js` 무캐시** — Service Worker 갱신 즉시 반영

```nginx
server {
  listen 443 ssl http2;
  server_name hifis.app;
  root /path/to/HiFIS-Client/out;

  location / {
    try_files $uri $uri.html $uri/ /index.html;
  }

  # Service Worker — 캐시 금지 (새 빌드 즉시 반영)
  location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    try_files $uri =404;
  }
}
```

배포 사이클 (코드 수정 → 재배포):

```bash
git pull
NEXT_PUBLIC_API_BASE_URL=https://api.hifis.app npm run build
# nginx 는 자동으로 새 out/ 서빙 (재시작 불필요)
```

## 아키텍처

- **`/`** → `/admin/login` redirect (PWA standalone 진입점)
- **`/admin/*`** — 관리자 대시보드 (로그인 필요)
- **`/register?branch_id=...`** — 회원·PT 신청 (매장 QR 진입)
- **`/reserve?branch_id=...`** — 예약 신청 (네이버 플레이스 링크 진입)
- API 호출은 `src/lib/api/client.ts` 의 `apiFetch` 단일 진입점
- 401 자동 refresh, 동시 호출도 1회만

## 백엔드

별도 레포: `HiFIS-Server` (FastAPI). API 계약 단일 진실원은 백엔드 `.claude/CLAUDE.md`.
