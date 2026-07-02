import { test, expect } from "@playwright/test";

test.describe("채팅 UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("name@novapay.kr").fill("lee.minho@novapay.kr");
    await page.locator('input[type="password"]').fill("novapay2026");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.waitForURL("/");
  });

  test("채팅 화면 기본 UI", async ({ page }) => {
    await expect(page.getByPlaceholder("사내 문서와 관련된 질문을 입력하세요")).toBeVisible();
    await expect(page.getByText("NovaPay Internal KB")).toBeVisible();
  });

  test("Admin 대시보드 접근", async ({ page }) => {
    await page.getByRole("link", { name: "Admin" }).click();
    await page.waitForURL("/admin");
    await expect(page.getByText("Admin Dashboard")).toBeVisible();
  });
});
