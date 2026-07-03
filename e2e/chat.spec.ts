import { test, expect } from "@playwright/test";
import { loginAs, seedAssistantMessage } from "./helpers/auth";

test.describe("채팅 UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("채팅 화면 기본 UI", async ({ page }) => {
    await expect(page.getByPlaceholder("사내 문서와 관련된 질문을 입력하세요")).toBeVisible();
    await expect(page.getByText("NovaPay Internal KB")).toBeVisible();
    await expect(page.getByRole("button", { name: "도움말" })).toBeVisible();
  });

  test("도움말 패널 열기", async ({ page }) => {
    await page.getByRole("button", { name: "도움말" }).click();
    await expect(page.getByRole("heading", { name: "사용 가이드" })).toBeVisible();
    await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
  });

  test("가이드 페이지 접근", async ({ page }) => {
    await page.goto("/guide");
    await expect(page.getByRole("heading", { name: "CorpBrain 사용 매뉴얼" })).toBeVisible();
  });

  test("Admin 대시보드 접근", async ({ page }) => {
    await page.getByRole("link", { name: "Admin" }).click();
    await page.waitForURL("/admin");
    await expect(page.getByText("Admin Dashboard")).toBeVisible();
  });

  test("마지막 답변에 후속 질문 칩이 표시된다", async ({ page }) => {
    await seedAssistantMessage(
      page,
      "연차는 입사 1년 이상 15일입니다. [출처: 연차휴가규정.md]"
    );
    await page.reload();
    await expect(page.getByText("이어서 물어보기")).toBeVisible();
    await expect(page.getByRole("button", { name: /3줄 요약/ })).toBeVisible();
  });
});
