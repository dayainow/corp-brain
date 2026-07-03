import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("RBAC 로그인 (파일럿 A8)", () => {
  test("manager 계정 로그인", async ({ page }) => {
    await loginAs(page, "manager");
    await expect(page.getByText("박수연", { exact: true })).toBeVisible();
    await expect(page.getByText("팀장", { exact: true })).toBeVisible();
  });

  test("admin 계정 로그인", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page.getByText("이민호", { exact: true })).toBeVisible();
    await expect(page.getByText("관리자", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  });

  test("general은 Admin 링크가 없다", async ({ page }) => {
    await loginAs(page, "general");
    await expect(page.getByText("김준호", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();
  });
});

test.describe("샘플 질문 (파일럿 A9)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "general");
    await page.evaluate(() => localStorage.removeItem("chat-session"));
    await page.reload();
  });

  test("예시 질문 클릭 시 사용자 메시지가 전송된다", async ({ page }) => {
    const prompt = page.getByRole("button", { name: /연차|휴가/ }).first();
    await expect(prompt).toBeVisible();
    const label = (await prompt.textContent()) ?? "";
    await prompt.click();
    await expect(page.getByText(label, { exact: false })).toBeVisible();
  });
});
