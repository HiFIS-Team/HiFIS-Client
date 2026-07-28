import type { MeetingBlock } from "./page";

// 회의록 상세 mock — id → 데이터.
// 실제 API 붙기 전 화면 스타일 검증용.

export interface MeetingDetail {
  id: string;
  title: string;
  author: string;
  authorTone: string;
  date: string;
  scope: "전사" | "프로젝트" | "특정 인원";
  body: MeetingBlock[];
}

export const MEETINGS_DETAIL: Record<string, MeetingDetail> = {
  "1": {
    id: "1",
    title: "프로덕트 정기 회의 (5/8)",
    author: "이앨리스",
    authorTone: "bg-emerald-500",
    date: "2026년 7월 26일",
    scope: "전사",
    body: [
      { type: "h2", text: "프로덕트 정기 회의 — 5월 8일" },
      { type: "meta", label: "일시", value: "5월 8일 (목) 14:00 ~ 15:30  ·  회의실 B" },
      {
        type: "attendees",
        label: "참석",
        names: ["이앨리스", "박그레이스", "최마틴", "김데모"],
      },
      { type: "divider" },
      { type: "h3", emoji: "📋", text: "안건" },
      {
        type: "list",
        ordered: true,
        items: [
          [{ kind: "text", text: "지난 주 마일스톤 회고" }],
          [{ kind: "text", text: "v2 베타 피드백 정리" }],
          [{ kind: "text", text: "다음 스프린트 우선순위 조정" }],
          [{ kind: "text", text: "Q3 OKR 초안 검토" }],
        ],
      },
      { type: "h3", emoji: "✅", text: "결정 사항" },
      {
        type: "list",
        items: [
          [
            { kind: "text", text: "베타 사용자 " },
            { kind: "highlight", text: "80명 우선 초대" },
            { kind: "text", text: " — 이번 주 안에 시작" },
          ],
          [
            { kind: "bold", text: "v2 정식 런칭" },
            { kind: "text", text: "은 " },
            { kind: "italic", text: "6월 2주차" },
            { kind: "text", text: " 로 확정" },
          ],
          [
            {
              kind: "text",
              text: "디자인 시스템 마이그레이션을 v2.1 로 미루기로 합의",
            },
          ],
        ],
      },
      {
        type: "quote",
        text: "\"속도보다는 첫 인상이 중요하다\" — 베타 피드백 키워드 정리에서 가장 많이 나온 의견.",
      },
    ],
  },
  "2": {
    id: "2",
    title: "신규 기능 스펙 정리",
    author: "박그레이스",
    authorTone: "bg-violet-500",
    date: "2026년 7월 25일",
    scope: "프로젝트",
    body: [
      { type: "h2", text: "신규 기능 스펙 — 프로젝트 문서함" },
      {
        type: "meta",
        label: "일시",
        value: "7월 25일 (금) 10:00 ~ 11:30  ·  온라인",
      },
      {
        type: "attendees",
        label: "참석",
        names: ["박그레이스", "정프로", "테스트매니저"],
      },
      { type: "divider" },
      { type: "h3", emoji: "🎯", text: "목표" },
      {
        type: "list",
        items: [
          [{ kind: "text", text: "팀별 문서 공유 · 접근 권한 관리 흐름 정리" }],
          [
            { kind: "text", text: "폴더 업로드 지원 → " },
            { kind: "bold", text: "webkitdirectory" },
            { kind: "text", text: " 로 브라우저 대응" },
          ],
        ],
      },
      { type: "h3", emoji: "📝", text: "액션 아이템" },
      {
        type: "list",
        ordered: true,
        items: [
          [
            { kind: "bold", text: "박그레이스" },
            { kind: "text", text: " — 스펙 초안 문서 작성 (~7/28)" },
          ],
          [
            { kind: "bold", text: "정프로" },
            { kind: "text", text: " — 컴포넌트 톤 통일 (~7/30)" },
          ],
        ],
      },
    ],
  },
  "3": {
    id: "3",
    title: "5월 캠페인 브레인스토밍",
    author: "최마틴",
    authorTone: "bg-amber-500",
    date: "2026년 7월 23일",
    scope: "전사",
    body: [
      { type: "h2", text: "5월 캠페인 브레인스토밍" },
      {
        type: "meta",
        label: "일시",
        value: "7월 23일 (수) 15:00 ~ 16:00  ·  회의실 A",
      },
      {
        type: "attendees",
        label: "참석",
        names: ["최마틴", "이하나", "김도현", "정유진"],
      },
      { type: "divider" },
      { type: "h3", emoji: "💡", text: "아이디어" },
      {
        type: "list",
        items: [
          [{ kind: "text", text: "회원 초청 이벤트 (친구 초대 → PT 1회 무료)" }],
          [{ kind: "text", text: "SNS 챌린지 — 30일 인증 시 락커 1개월 무료" }],
          [
            { kind: "highlight", text: "여름 프로모션" },
            { kind: "text", text: " : 6월 · 7월 회원권 얼리버드 20% 할인" },
          ],
        ],
      },
      {
        type: "quote",
        text: "\"기존 회원에게도 혜택이 돌아가야 이탈이 줄어든다\" — 최마틴",
      },
    ],
  },
};
