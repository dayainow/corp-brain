import type { Page } from "@playwright/test";

type LoginRole = "general" | "manager" | "admin";

const CREDENTIALS: Record<LoginRole, { email: string; password: string }> = {
  general: { email: "kim.junho@novapay.kr", password: "novapay2026" },
  manager: { email: "park.suyeon@novapay.kr", password: "novapay2026" },
  admin: { email: "lee.minho@novapay.kr", password: "novapay2026" },
};

export async function loginAs(page: Page, role: LoginRole) {
  const { email, password } = CREDENTIALS[role];
  const treeRequest = page.waitForResponse(
    (res) => res.url().includes("/api/documents/tree") && res.ok(),
    { timeout: 15_000 }
  );
  await page.goto("/login");
  await page.getByPlaceholder("name@novapay.kr").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL("/", { timeout: 15_000 });
  await treeRequest;
}

export async function seedAssistantMessage(
  page: Page,
  text: string
) {
  await page.evaluate((content) => {
    localStorage.setItem(
      "chat-session",
      JSON.stringify([
        {
          id: "e2e-user-1",
          role: "user",
          parts: [{ type: "text", text: "테스트 질문" }],
        },
        {
          id: "e2e-assistant-1",
          role: "assistant",
          parts: [{ type: "text", text: content }],
        },
      ])
    );
  }, text);
}
