import { test, expect } from "@playwright/test";
import { loginAs, seedAssistantMessage } from "./helpers/auth";

test.describe("출처 원문 보기", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await seedAssistantMessage(
      page,
      "연차는 입사 1년 미만 11일, 1년 이상 15일입니다. [출처: 연차휴가규정.md]"
    );
    await page.reload();
    await expect(
      page.getByRole("button", { name: "연차휴가규정 원문 보기" })
    ).toBeVisible();
  });

  test("출처 뱃지 클릭 시 원문 모달이 열린다", async ({ page }) => {
    await page.getByRole("button", { name: "연차휴가규정 원문 보기" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("heading", { name: "연차휴가규정" })).toBeVisible();
    await expect(dialog.getByText("연차휴가규정.md")).toBeVisible();
    await expect(dialog.getByText("원문 불러오는 중")).not.toBeVisible({ timeout: 15_000 });
    await expect(dialog.locator(".prose p, pre").first()).toBeVisible();
  });

  test("Escape로 원문 모달을 닫을 수 있다", async ({ page }) => {
    await page.getByRole("button", { name: "연차휴가규정 원문 보기" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("출처 API RBAC", () => {
  test("general은 admin 문서 원문 API를 거부한다", async ({ page }) => {
    await loginAs(page, "general");
    const res = await page.request.get(
      "/api/documents/content?fileName=" + encodeURIComponent("표준nda.md")
    );
    expect(res.status()).toBe(404);
  });

  test("admin은 admin 문서 원문 API를 허용한다", async ({ page }) => {
    await loginAs(page, "admin");
    const res = await page.request.get(
      "/api/documents/content?fileName=" + encodeURIComponent("표준nda.md")
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.fileName).toBe("표준nda.md");
    expect(body.content.length).toBeGreaterThan(10);
  });
});
