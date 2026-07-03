import { useEffect } from "react";

/** 모바일 가상 키보드·브라우저 UI에 맞춰 --app-height CSS 변수 갱신 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      document.documentElement.style.setProperty("--app-height", `${vv.height}px`);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);
}
