import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { checkRagE2EReady, type RagE2EStatus } from "./helpers/ollama";
import {
  clearChatSession,
  sendChatAndWaitForReply,
  expectCitationBadge,
} from "./helpers/chat";

test.describe.configure({ timeout: 180_000 });

test.describe("Ollama RAG E2E (실제 스트리밍)", () => {
  test.describe.configure({ mode: "serial" });
  let ragStatus: RagE2EStatus;

  test.beforeAll(async ({ baseURL }) => {
    ragStatus = await checkRagE2EReady(baseURL);
    if (!ragStatus.ready) {
      console.warn(`[rag-ollama] SKIP: ${ragStatus.reason}`);
    }
  });

  test.beforeEach(async ({}) => {
    test.skip(!ragStatus.ready, ragStatus.reason ?? "RAG E2E prerequisites not met");
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "general");
    await clearChatSession(page);
  });

  test("연차 질문 → 한국어 답변 + 출처 뱃지", async ({ page }) => {
    const bubble = await sendChatAndWaitForReply(page, "연차 휴가는 며칠인가요?");

    await expect(bubble).toContainText(/연차|휴가|15일|11일/i);
    await expectCitationBadge(page, /연차휴가|휴가/);
    await expect(page.getByLabel("좋아요")).toBeVisible();
  });

  test("실제 답변 출처 뱃지 → 원문 모달", async ({ page }) => {
    const bubble = await sendChatAndWaitForReply(page, "재택근무 정책 요약해줘");

    const citation = bubble.getByRole("button", { name: /재택근무정책 원문 보기/ }).first();
    await expect(citation).toBeVisible();
    await citation.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText("원문 불러오는 중")).not.toBeVisible({ timeout: 15_000 });
    await expect(dialog.locator(".prose p, pre").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("실제 답변에 👍 피드백 전송", async ({ page }) => {
    const bubble = await sendChatAndWaitForReply(page, "출장비 정산 기한이 언제야?");

    const feedbackReq = page.waitForResponse(
      (res) => res.url().includes("/api/chat/feedback") && res.request().method() === "POST"
    );
    await bubble.getByLabel("좋아요").click();
    const res = await feedbackReq;
    expect(res.ok()).toBeTruthy();
    await expect(page.getByText("감사합니다")).toBeVisible();
  });
});

test.describe("Ollama RAG API 스모크", () => {
  let ragStatus: RagE2EStatus;

  test.beforeAll(async ({ baseURL }) => {
    ragStatus = await checkRagE2EReady(baseURL);
  });

  test("인증된 /api/chat 스트리밍 200", async ({ page, baseURL }) => {
    test.skip(!ragStatus.ready, ragStatus.reason);

    await loginAs(page, "general");
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const res = await fetch(`${baseURL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "연차 규정 한 줄 요약" }] }],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("text/event-stream");

    const reader = res.body?.getReader();
    expect(reader).toBeTruthy();
    const { value } = await reader!.read();
    expect(value && value.length > 0).toBeTruthy();
    reader!.releaseLock();
  });
});
