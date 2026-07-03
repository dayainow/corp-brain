import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

async function waitForDocumentTree(page: import("@playwright/test").Page) {
  await expect(page.getByRole("searchbox", { name: "문서 검색" })).toBeVisible();
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
    const search = page.getByRole("searchbox", { name: "문서 검색" });
    await search.fill("연차");
    await expect(page.getByText(/\d+건 일치/)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /연차휴가규정/ })
    ).toBeVisible();
  });

  test("일치 항목이 없으면 안내를 표시한다", async ({ page }) => {
    await page.getByRole("searchbox", { name: "문서 검색" }).fill("zzznomatch123");
    await expect(page.getByText("일치하는 문서 없음")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
  });

  test("검색어 지우기로 전체 트리를 복원한다", async ({ page }) => {
    const search = page.getByRole("searchbox", { name: "문서 검색" });
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

    await page.getByRole("searchbox", { name: "문서 검색" }).fill("표준nda");
    await expect(page.getByText("일치하는 문서 없음")).toBeVisible({ timeout: 10_000 });
  });

  test("manager는 manager 문서를 볼 수 있다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, "manager");
    await waitForDocumentTree(page);

    await page.getByRole("searchbox", { name: "문서 검색" }).fill("분기실적");
    await expect(
      page.getByRole("button", { name: /분기실적보고/ })
    ).toBeVisible();
  });
});
