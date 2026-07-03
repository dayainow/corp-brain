import { expect, type Page } from "@playwright/test";

export async function clearChatSession(page: Page) {
  await page.evaluate(() => localStorage.removeItem("chat-session"));
  await page.reload();
  await page.waitForURL("/");
}

/** 질문 전송 후 Ollama 스트리밍 답변이 완료될 때까지 대기 */
export async function sendChatAndWaitForReply(
  page: Page,
  question: string,
  options?: { timeoutMs?: number }
) {
  const timeout = options?.timeoutMs ?? 120_000;

  const chatPost = page.waitForResponse(
    (res) => res.url().includes("/api/chat") && res.request().method() === "POST",
    { timeout }
  );

  const input = page.getByPlaceholder("사내 문서와 관련된 질문을 입력하세요");
  await input.fill(question);
  await page.locator("footer form button[type='submit']").click();

  const response = await chatPost;
  expect(response.ok()).toBeTruthy();

  await expect(page.getByText("답변을 생성하고 있습니다...")).not.toBeVisible({ timeout });

  await expect(
    page.getByPlaceholder("사내 문서와 관련된 질문을 입력하세요")
  ).toBeEnabled({ timeout: 10_000 });

  const assistantBubble = page
    .locator("main .justify-start .rounded-2xl")
    .filter({ hasNot: page.getByText("답변을 생성하고 있습니다...") })
    .last();

  await expect(assistantBubble).toBeVisible({ timeout: 10_000 });
  return assistantBubble;
}

/** 출처 뱃지(원문 보기 버튼) — main 채팅 영역만 */
export async function expectCitationBadge(page: Page, namePattern?: RegExp | string) {
  const badges = page.locator("main").getByRole("button", { name: /원문 보기/ });
  await expect(badges.first()).toBeVisible({ timeout: 5_000 });
  if (namePattern) {
    await expect(
      page.locator("main").getByRole("button", { name: namePattern }).first()
    ).toBeVisible();
  }
}
