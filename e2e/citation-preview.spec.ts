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

  test("RAG 청크가 있으면 원문 모달에 검색 구간이 하이라이트된다", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "chat-session",
        JSON.stringify([
          {
            id: "e2e-user-hl",
            role: "user",
            parts: [{ type: "text", text: "연차 규정" }],
          },
          {
            id: "e2e-assistant-hl",
            role: "assistant",
            parts: [
              {
                type: "data-rag-sources",
                data: {
                  sources: [
                    {
                      fileName: "연차휴가규정.md",
                      displayName: "연차휴가규정",
                      snippet: "입사 후 1년 이상",
                      chunkText:
                        "입사 후 1년 이상이 된 직원은 15일의 기본 연차가 발생하며",
                    },
                  ],
                },
              },
              {
                type: "text",
                text: "연차는 15일입니다. [출처: 연차휴가규정.md]",
              },
            ],
          },
        ])
      );
    });
    await page.reload();
    await page.getByRole("button", { name: "연차휴가규정 원문 보기" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("검색된 구간")).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText("15일의 기본 연차")).toBeVisible();
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
