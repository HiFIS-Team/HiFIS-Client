// 버전별 릴리스 노트 — 새 버전 배포 시 모달로 어드민에게 변경사항 안내.
// 새 버전 머지 직전(npm version <minor|patch> 후) 여기 한 항목 추가.
//
// 표시 규칙:
// - 첫 진입(localStorage hifis-last-seen-version 없음) → 모달 안 띄우고 현재 버전 저장
// - 이후 진입 시 lastSeen < 현재 → lastSeen 보다 큰 버전의 노트 전부 모아서 모달
// - 닫기 누르면 현재 버전을 lastSeen 으로 저장
//
// 작성 원칙:
// - 어드민·회원이 실제로 체감하는 변경만 (개발 중 잡은 버그 등은 제외)
// - title 은 짧게 (한 줄), description 으로 풀어 설명
// - feature(새 기능) / improvement(개선) / fix(버그 수정) 세 가지 분류

export type ReleaseNoteType = "feature" | "improvement" | "fix";

export interface ReleaseNoteItem {
  type: ReleaseNoteType;
  title: string;
  description: string;
}

export interface ReleaseNote {
  version: string; // "1.1.0" 식 — package.json version 과 일치
  date: string; // "YYYY-MM-DD"
  items: ReleaseNoteItem[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.1.0",
    date: "2026-06-08",
    items: [
      // 새 기능
      {
        type: "feature",
        title: "일·시간 단위 상품 등록",
        description:
          "회원권·수강권을 개월뿐 아니라 일·시간 단위로도 등록할 수 있어요. 시간이나 일 수로 운영해야 하는 상품도 그대로 표현됩니다.",
      },
      {
        type: "feature",
        title: "재등록 자동 안내",
        description:
          "신청서 작성 중 같은 이름·전화번호로 이미 등록된 이력이 있으면 재등록 페이지로 이동할지 안내해요.",
      },
      {
        type: "feature",
        title: "첨단·동광주점 전자서명",
        description:
          "첨단·동광주점 회원가입·PT 신청서에 약관 동의와 서명을 종이 신청서처럼 받아 통째로 저장합니다. 회원·PT 상세에서 저장된 신청서 이미지를 크게 확인할 수 있어요.",
      },
      {
        type: "feature",
        title: "변경사항 안내",
        description:
          "새 버전이 배포되면 어드민 첫 진입에서 변경된 내용을 안내해요. 지금 보고 계신 이 모달이에요.",
      },

      // 개선
      {
        type: "improvement",
        title: "이번 달 가입 추이 그래프",
        description:
          "대시보드의 이번 달 회원·PT 추이를 한눈에 볼 수 있도록 그래프를 새로 그렸어요.",
      },
      {
        type: "improvement",
        title: "PT 이용 기간 직접 입력",
        description:
          "PT 신청 시 이용 기간을 회수 기반 자동 계산 대신 직접 입력할 수 있어요.",
      },
      {
        type: "improvement",
        title: "상품 정렬 정돈",
        description:
          "수강권·회원권 등 상품 목록이 회수와 기간을 인식해 자연 순서로 정렬돼요. (예: 1회 → 2회 → 3회 → 10회 → 20회)",
      },

      // 버그 수정 (운영 환경에서 어드민·회원이 마주칠 수 있던 것들)
      {
        type: "fix",
        title: "가입 추이 막대 그래프 표시",
        description:
          "대시보드 \"이번 달 가입 추이\" 막대가 보이지 않던 문제를 고쳤어요.",
      },
      {
        type: "fix",
        title: "모달 뒤 본문 스크롤 잠금",
        description:
          "모달이 열려있을 때 손가락으로 뒤 페이지가 같이 스크롤되던 문제를 고쳤어요. (iOS Safari 포함)",
      },
      {
        type: "fix",
        title: "알림으로 진입한 상세 모달",
        description:
          "알림을 누르고 회원/PT 상세를 본 뒤 다른 메뉴 갔다 돌아오면 상세가 다시 떠있던 문제를 고쳤어요.",
      },
      {
        type: "fix",
        title: "1일권 종료일",
        description:
          "1일권의 시작일·종료일이 같은 날로 잡히도록 종료일 기준을 \"마지막 유효일(포함)\"으로 통일했어요.",
      },
      {
        type: "fix",
        title: "모바일 입력 동작",
        description:
          "모바일에서 드롭다운이 위로 떴다 아래로 튀거나 날짜 입력의 달력 아이콘이 잘 안 눌리던 문제를 고쳤어요.",
      },
    ],
  },
];

// 단순 SemVer 비교 — "1.10.0" > "1.9.0" 같은 케이스 처리 (문자열 비교론 안 됨).
// 두 인자 모두 "x.y.z" 가정. 부족하면 0 으로 패딩.
export function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}
