"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// PC 헤더 좌측에 현재 페이지 제목을 띄우기 위해 페이지가 동적으로 등록.
// 페이지의 <PageTitle title=".." /> 가 mount 시 setTitle, unmount 시 비움.
// 모바일은 PageTitle 컴포넌트가 자기 자리에서 표시하므로 헤더는 무시.

interface PageTitleContextValue {
  title: string;
  setTitle: (t: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: "",
  setTitle: () => {},
});

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle(): PageTitleContextValue {
  return useContext(PageTitleContext);
}
