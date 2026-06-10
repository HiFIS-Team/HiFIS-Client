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
// - title 은 짧게 (한 줄), description 은 문장 단위 배열 → 모달에서 줄바꿈으로 렌더
// - feature(새 기능) / improvement(개선) / fix(버그 수정) 세 가지 분류

export type ReleaseNoteType = "feature" | "improvement" | "fix";

export interface ReleaseNoteItem {
  type: ReleaseNoteType;
  title: string;
  // 문장 단위 배열 — 한 항목은 [문장1, 문장2, ...] 식으로. 모달에서 각 문장을 별도 단락으로 렌더.
  description: string[];
}

export interface ReleaseNote {
  version: string; // "1.1.0" 식 — package.json version 과 일치
  date: string; // "YYYY-MM-DD"
  items: ReleaseNoteItem[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.3.1",
    date: "2026-06-10",
    items: [
      // 개선 (PC 사용자만 체감, 모바일 변화 없음)
      {
        type: "improvement",
        title: "PC 화면 디자인 정돈",
        description: [
          "PC 에서 사이드바가 좌측 전체 높이를 차지하고 헤더는 콘텐츠 영역 위에만 자리잡도록 정돈했어요.",
          "헤더 좌측에 현재 페이지 이름이, 우측에 본인 프로필(이름·역할)이 함께 표시돼 어떤 페이지·어떤 계정으로 보고 있는지 한눈에 알 수 있어요.",
          "본문 배경을 옅은 회색으로 깔고 페이지 콘텐츠는 흰 카드처럼 떠보이게 톤을 통일했어요.",
        ],
      },
      // 버그 수정
      {
        type: "fix",
        title: "알림 패널이 화면 밖으로 튀어나가던 문제",
        description: [
          "PC 에서 알림 종을 누르면 패널이 오른쪽으로 펼쳐져 가로 스크롤이 생기던 문제를 고쳤어요.",
        ],
      },
      {
        type: "fix",
        title: "PC 지점 선택이 사이드바에 가리던 문제",
        description: [
          "PC 에서 지점 셀렉터를 열면 메뉴가 사이드바에 가려져 선택할 수 없던 문제를 고쳤어요.",
        ],
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-06-10",
    items: [
      // 새 기능
      {
        type: "feature",
        title: "알림톡 관리 페이지",
        description: [
          "어드민에서 알림톡 종류별로 본문을 직접 수정하고 발송을 켜고 끌 수 있어요.",
          "본문에 회원 이름·지점명 같은 변수를 칩 클릭으로 삽입할 수 있고, 자동으로 붙는 헤더·푸터 형태도 함께 확인할 수 있어요.",
          "본문을 고치면 실제 발송될 모습(헤더·푸터 포함)이 그대로 미리보기에 떠요.",
        ],
      },
      {
        type: "feature",
        title: "지점 선택 헤더 통합",
        description: [
          "페이지마다 따로 있던 지점 선택을 상단 헤더 한 곳으로 모았어요. 한 지점을 고르면 회원·PT·통계·상품 등 모든 페이지가 그 지점 기준으로 묶여서 보여요.",
          "FC 권한은 본인 지점 이름이 같은 위치에 표시돼 어떤 지점 기준으로 보고 있는지 한눈에 알 수 있어요.",
          "지점을 바꾸면 \"○○점으로 변경했습니다\" 라고 짧게 알려드려요.",
        ],
      },
      {
        type: "feature",
        title: "상품별 판매 매출 보기",
        description: [
          "상품 이름 옆 괄호에 정가가 같이 떠요.",
          "막대를 누르면 그 달 그 상품의 실제 결제 매출 합계가 펼쳐 보여요. (카드/현금 구분 없이 합산)",
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-06-09",
    items: [
      // 새 기능
      {
        type: "feature",
        title: "통계 메뉴 확장",
        description: [
          "기존 통계 한 페이지에 묶여 있던 내용을 네 페이지로 나눠 한눈에 보기 쉽게 정리했어요.",
          "유입·방문, 상품별 판매, 신규·재등록, 잔여 기간 네 가지로 따로 들어가 볼 수 있어요.",
        ],
      },
      {
        type: "feature",
        title: "월 단위로 통계 조회",
        description: [
          "유입·방문 통계에서 최근 12개월 중 원하는 달을 골라 볼 수 있어요.",
          "이전엔 이번 달 데이터만 보여줬어요.",
        ],
      },
      {
        type: "feature",
        title: "상품별 판매 통계",
        description: [
          "그 달 회원권·수강권·락커·운동복이 각각 몇 건씩 팔렸는지 상품별로 볼 수 있어요.",
          "회원권·수강권은 종류별로 어떤 상품이 많이 나갔는지까지 펼쳐서 보여드려요.",
        ],
      },
      {
        type: "feature",
        title: "신규·재등록 통계",
        description: [
          "그 달 회원·PT 신청 중 신규와 재등록 비율을 한눈에 비교할 수 있어요.",
        ],
      },
      {
        type: "feature",
        title: "회원권 잔여 기간 분포",
        description: [
          "지금 유효 회원들의 회원권이 얼마나 남아 있는지 개월 단위 분포로 보여드려요.",
          "만료 임박 회원이 얼마나 몰려 있는지 한눈에 파악할 수 있어요.",
        ],
      },
      {
        type: "feature",
        title: "이달의 우수사원 카드 정돈",
        description: [
          "대시보드 이달의 우수사원 카드를 지점별로 넘겨볼 수 있게 만들었어요.",
          "오른쪽 화살표를 누르거나 카드를 옆으로 쓸어 넘기면 다른 지점이 보여요.",
        ],
      },
      {
        type: "feature",
        title: "패치 노트 페이지",
        description: [
          "지금까지 올라온 모든 업데이트 내역을 계정 메뉴의 \"패치 노트\" 에서 다시 볼 수 있어요.",
        ],
      },

      // 개선
      {
        type: "improvement",
        title: "사이드바 메뉴 정돈",
        description: [
          "기존 \"분석\" 그룹을 \"통계\" 로 바꾸고 알림톡 이력은 별도 그룹으로 분리했어요.",
        ],
      },
      {
        type: "improvement",
        title: "탭 줄 모바일 정돈",
        description: [
          "상품 관리·상품별 판매의 회원권/수강권/락커/운동복 탭이 모바일에서도 한 줄에 들어가요.",
          "이전엔 좁은 화면에서 옆으로 스크롤해서 봐야 했어요.",
        ],
      },
      {
        type: "improvement",
        title: "지점 관리 모바일 헤더 정돈",
        description: [
          "지점/회원/PT/예약 합계 칩이 모바일에서 줄바꿈되며 차지하던 영역을 정리했어요.",
          "지점 카드 안에 같은 숫자가 있어 정보 손실 없이 화면이 가벼워졌어요.",
        ],
      },

      // 버그 수정 (운영 환경에서 어드민·회원이 마주칠 수 있던 것들)
      {
        type: "fix",
        title: "드롭다운 열 때 폼 스크롤 잠금",
        description: [
          "신청서 폼에서 성별·상품 같은 드롭다운을 열면 그 뒤 폼이 같이 멈춰 스크롤할 수 없던 문제를 고쳤어요.",
        ],
      },
      {
        type: "fix",
        title: "알림으로 본 상세가 다시 뜨던 문제",
        description: [
          "알림으로 회원·PT 상세를 본 뒤 다른 메뉴 갔다 돌아오면 상세가 또 떠 있던 문제를 한 번 더 다듬었어요.",
        ],
      },
      {
        type: "fix",
        title: "신청서 캡처 글자·서명 잘림",
        description: [
          "전자서명한 신청서 이미지가 운영 환경 모바일에서 글자·서명이 잘려 보이던 문제를 고쳤어요.",
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-06-08",
    items: [
      // 새 기능
      {
        type: "feature",
        title: "일·시간 단위 상품 등록",
        description: [
          "회원권·수강권을 등록할 때 개월뿐 아니라 일·시간 단위도 고를 수 있어요.",
          "시간이나 일 단위로 운영해야 하는 상품도 자연스럽게 담을 수 있어요.",
        ],
      },
      {
        type: "feature",
        title: "재등록 자동 안내",
        description: [
          "신청서 작성 중 같은 이름·전화번호로 이미 등록된 이력이 있으면 재등록 페이지로 이동할지 안내해요.",
        ],
      },
      {
        type: "feature",
        title: "첨단·동광주점 이용약관 분기",
        description: [
          "첨단·동광주점 회원가입·PT 신청서의 이용약관을 각 지점 운영 회칙에 맞게 별도로 적용했어요. (화순점은 기존 약관 그대로)",
        ],
      },
      {
        type: "feature",
        title: "첨단·동광주점 전자서명",
        description: [
          "첨단·동광주점 회원가입·PT 신청서에 약관 동의와 서명을 종이 신청서처럼 받아 통째로 저장해요.",
          "회원·PT 상세에서 저장된 신청서 이미지를 크게 볼 수 있어요.",
        ],
      },
      {
        type: "feature",
        title: "변경사항 안내",
        description: [
          "새 버전이 배포되면 어드민 첫 진입에서 변경된 내용을 안내해요.",
          "지금 보고 계신 이 모달이에요.",
        ],
      },

      // 개선
      {
        type: "improvement",
        title: "이번 달 가입 추이 그래프",
        description: [
          "대시보드의 이번 달 회원·PT 추이를 한눈에 볼 수 있도록 그래프를 새로 그렸어요.",
        ],
      },
      {
        type: "improvement",
        title: "PT 이용 기간 직접 입력",
        description: [
          "PT 신청 시 이용 기간을 직접 입력할 수 있어요.",
          "이전엔 회수에 따라 자동으로 계산했어요.",
        ],
      },
      {
        type: "improvement",
        title: "상품 정렬 정돈",
        description: [
          "수강권·회원권 등 상품 목록이 회수와 기간을 인식해 자연 순서로 정렬돼요. (예: 1회 → 2회 → 3회 → 10회 → 20회)",
        ],
      },

      // 버그 수정 (운영 환경에서 어드민·회원이 마주칠 수 있던 것들)
      {
        type: "fix",
        title: "가입 추이 막대 그래프 표시",
        description: [
          "대시보드 \"이번 달 가입 추이\" 막대가 보이지 않던 문제를 고쳤어요.",
        ],
      },
      {
        type: "fix",
        title: "모달 뒤 본문 스크롤 잠금",
        description: [
          "모달이 열려있을 때 손가락으로 뒤 페이지가 같이 스크롤되던 문제를 고쳤어요. (iOS Safari 포함)",
        ],
      },
      {
        type: "fix",
        title: "알림으로 진입한 상세 모달",
        description: [
          "알림을 누르고 회원/PT 상세를 본 뒤 다른 메뉴 갔다 돌아오면 상세가 다시 떠있던 문제를 고쳤어요.",
        ],
      },
      {
        type: "fix",
        title: "1일권 종료일",
        description: [
          "1일권의 시작일·종료일이 같은 날로 잡히도록 종료일 기준을 \"마지막 유효일(포함)\"으로 통일했어요.",
        ],
      },
      {
        type: "fix",
        title: "모바일 입력 동작",
        description: [
          "모바일에서 드롭다운이 위로 떴다 아래로 튀거나 날짜 입력의 달력 아이콘이 잘 안 눌리던 문제를 고쳤어요.",
        ],
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
