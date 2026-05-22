"use client";

// 약관 한 묶음 — 제목(선택) + 본문 문단들 (번호·불릿 항목이면 "1. "·"• " 형태로 그대로 넣는다)
export interface TermsSection {
  heading?: string;
  body: string[];
}

// 약관 전문 (운영 회칙·유의사항 등)
export interface TermsContent {
  title: string;
  sections: TermsSection[];
  // 맨 끝 서약·동의 문구 (선택)
  footer?: { heading: string; body: string };
}

// 약관 전문을 보여주는 모달 — 키오스크용이라 글씨를 크게.
export function TermsDialog({
  content,
  onClose,
}: {
  content: TermsContent;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-200 px-6 py-4 text-xl font-bold text-gray-900">
          {content.title}
        </h2>

        <div className="space-y-6 overflow-y-auto px-6 py-6">
          {content.sections.map((s, si) => (
            <section key={si}>
              {s.heading && (
                <h3 className="text-base font-bold text-gray-900">
                  {s.heading}
                </h3>
              )}
              <div className={`space-y-2 ${s.heading ? "mt-2" : ""}`}>
                {s.body.map((p, i) => (
                  <p key={i} className="text-base/7 text-gray-700">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
          {content.footer && (
            <section className="border-t border-gray-200 pt-5">
              <h3 className="text-base font-bold text-gray-900">
                {content.footer.heading}
              </h3>
              <p className="mt-2 text-base/7 text-gray-700">
                {content.footer.body}
              </p>
            </section>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-5 py-3 text-base font-semibold text-white hover:bg-primary-hover"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
