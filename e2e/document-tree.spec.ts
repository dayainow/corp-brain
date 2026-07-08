import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

async function waitForDocumentTree(page: import("@playwright/test").Page) {
    await expect(page.getByRole("searchbox", { name: "문서 이름 검색" })).toBeVisible();
  await page.waitForResponse(
    (res) => res.url().includes("/api/documents/tree") && res.ok(),
    { timeout: 15_000 }
  );
  await expect(page.getByText("열람 가능")).toBeVisible();
}

test.describe("문서 트리 검색", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, "admin");
    await waitForDocumentTree(page);
  });

  test("제목·파일명으로 문서를 필터한다", async ({ page }) => {
    const search = page.getByRole("searchbox", { name: "문서 이름 검색" });
    await search.fill("연차");
    await expect(page.getByText(/\d+건 일치/)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /연차 휴가 규정로 질문/ })
    ).toBeVisible();
  });

  test("일치 항목이 없으면 안내를 표시한다", async ({ page }) => {
    await page.getByRole("searchbox", { name: "문서 이름 검색" }).fill("zzznomatch123");
    await expect(page.getByText("일치하는 문서 없음")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
  });

  test("검색어 지우기로 전체 트리를 복원한다", async ({ page }) => {
    const search = page.getByRole("searchbox", { name: "문서 이름 검색" });
    await search.fill("연차");
    await page.getByRole("button", { name: "검색어 지우기" }).click();
    await expect(search).toHaveValue("");
    await expect(page.getByText("열람 가능")).toBeVisible();
  });
});

test.describe("문서 트리 RBAC", () => {
  test("general은 admin 전용 문서를 트리에서 볼 수 없다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, "general");
    await waitForDocumentTree(page);

    await page.getByRole("searchbox", { name: "문서 이름 검색" }).fill("표준nda");
    await expect(page.getByText("일치하는 문서 없음")).toBeVisible({ timeout: 10_000 });
  });

  test("manager는 manager 문서를 볼 수 있다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, "manager");
    await waitForDocumentTree(page);

    await page.getByRole("searchbox", { name: "문서 이름 검색" }).fill("분기실적보고");
    await expect(page.getByText(/\d+건 일치/)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('button[aria-label$="로 질문"]').first()
    ).toBeVisible();
  });
});

test.describe("문서 트리 액션", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, "admin");
    await waitForDocumentTree(page);
  });

  test("보기 버튼으로 원문 모달을 연다", async ({ page }) => {
    await page.getByRole("searchbox", { name: "문서 이름 검색" }).fill("연차");
    await page.getByRole("button", { name: /연차 휴가 규정 원문 보기/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "연차휴가규정" })).toBeVisible();
  });

  test("질문 버튼으로 해당 문서 질문을 전송한다", async ({ page }) => {
    await page.getByRole("searchbox", { name: "문서 이름 검색" }).fill("연차");
    await page.getByRole("button", { name: /연차 휴가 규정로 질문/ }).click();
    await expect(
      page.getByText("「연차 휴가 규정」 문서의 주요 내용을 알려줘")
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("문서 트리 모바일", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("드로어 열기·검색 포커스·Escape 닫기", async ({ page }) => {
    await loginAs(page, "general");
    await page.getByRole("button", { name: "사내 문서 목록" }).click();
    const drawer = page.getByRole("dialog", { name: "사내 문서 목록" });
    await expect(drawer).toBeVisible();
    await page.waitForResponse(
      (res) => res.url().includes("/api/documents/tree") && res.ok(),
      { timeout: 15_000 }
    );
    await expect(drawer.getByRole("searchbox", { name: "문서 검색" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });

  test("모바일에서 질문 입력창이 보인다", async ({ page }) => {
    await loginAs(page, "general");
    await expect(
      page.getByPlaceholder("사내 문서와 관련된 질문을 입력하세요")
    ).toBeVisible();
  });
});
