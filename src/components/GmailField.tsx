"use client";

interface GmailFieldProps {
  label: string;
  // 항상 "local@gmail.com" 형태 또는 빈 문자열. 빈 로컬 파트면 빈 문자열을 emit.
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  autoComplete?: string;
}

const SUFFIX = "@gmail.com";

// Gmail 전용 이메일 입력 — 로컬 파트만 입력, 우측에 "@gmail.com" 고정 표시.
// 인증번호를 gmail SMTP 로만 발송하므로 관리자 인증 화면에서 사용.
// 외부 value 는 전체 이메일("xxx@gmail.com") 또는 "" 로 일관 → 호출부 검증·제출 로직 그대로 사용.
export function GmailField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  id,
  autoComplete,
}: GmailFieldProps) {
  // value 에서 로컬 파트 추출 (suffix 가 붙어있으면 떼어내고 표시)
  const localPart = value.endsWith(SUFFIX)
    ? value.slice(0, -SUFFIX.length)
    : value;

  function handleChange(raw: string) {
    // 사용자가 실수로 @gmail.com 까지 적어도 앞부분만 사용. 공백 제거.
    const clean = raw.replace(/@.*$/, "").trim();
    onChange({ target: { value: clean ? `${clean}${SUFFIX}` : "" } });
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm/6 font-medium text-gray-900"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div
        className={`mt-2 flex w-full items-center rounded-md bg-white outline-1 -outline-offset-1 focus-within:outline-2 focus-within:-outline-offset-2 ${
          error
            ? "outline-red-500 focus-within:outline-red-500"
            : "outline-gray-300 focus-within:outline-primary"
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="email"
          required={required}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          value={localPart}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="아이디"
          className="block min-h-11 w-full appearance-none rounded-md bg-transparent py-2.5 pr-1 pl-3 text-base text-gray-900 outline-none placeholder:text-gray-400"
        />
        <span className="pr-3 text-base text-gray-500 select-none">
          {SUFFIX}
        </span>
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
