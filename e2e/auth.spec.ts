import { test, expect } from "@playwright/test";

test.describe("로그인", () => {
  test("로그인 페이지 렌더링", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "CorpBrain" })).toBeVisible();
    await expect(page.getByPlaceholder("name@novapay.kr")).toBeVisible();
    await expect(page.getByText("처음이신가요? 사용 안내")).toBeVisible();
  });

  test("시드 계정 로그인 성공", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("name@novapay.kr").fill("kim.junho@novapay.kr");
    await page.locator('input[type="password"]').fill("novapay2026");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "CorpBrain" })).toBeVisible();
  });

  test("잘못된 비밀번호 거부", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("name@novapay.kr").fill("kim.junho@novapay.kr");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다")).toBeVisible();
  });
});

test.describe("인증 보호", () => {
  test("비로그인 시 로그인 페이지로 리다이렉트", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("Health API", () => {
  test("헬스체크 공개 접근", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.checks).toBeDefined();
  });
});
