import crypto from "crypto";
import { NextResponse } from "next/server";
import { resolveSlackUserRole } from "@/lib/auth/slack-mapping";
import { retrieveRagContext, generateRagAnswer } from "@/lib/chat/rag";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, denyRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

const MAX_QUERY_LENGTH = 1_000;
const SLACK_REPLAY_WINDOW_SEC = 60 * 5;
const SLACK_TEXT_LIMIT = 2_800;

function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const base = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(`v0=${hmac}`),
    Buffer.from(signature)
  );
}

function isFreshSlackTimestamp(timestamp: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(Date.now() / 1000 - ts) <= SLACK_REPLAY_WINDOW_SEC;
}

/** Slack Slash Command: /corpbrain [질문] */
export async function POST(req: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Slack not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-slack-signature") ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";

  if (!isFreshSlackTimestamp(timestamp)) {
    return NextResponse.json({ error: "Stale request" }, { status: 401 });
  }

  if (!verifySlackSignature(signingSecret, signature, timestamp, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(body);
  const query = params.get("text")?.trim();
  const userId = params.get("user_id") ?? "slack-user";
  const userName = params.get("user_name") ?? "slack";

  const slackRate = await checkRateLimit(`slack:${userId}`, {
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!slackRate.allowed) {
    return denyRateLimit(slackRate.resetAt);
  }

  if (!query) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "사용법: `/corpbrain [질문]`\n예: `/corpbrain 휴가 규정 알려줘`",
    });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "질문이 너무 깁니다. 1000자 이하로 입력해 주세요.",
    });
  }

  try {
    const { role, email } = resolveSlackUserRole(userId, userName);
    const rag = await retrieveRagContext(query, query, role);

    await writeAuditLog({
      action: "chat.query",
      userId,
      userEmail: email,
      userRole: role,
      detail: { query, source: "slack", sourcesFound: rag.relevantDocs.length, sources: rag.sources },
    });

    if (rag.relevantDocs.length === 0) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "관련 사내 문서를 찾지 못했습니다.",
      });
    }

    let answer: string;
    try {
      answer = await generateRagAnswer(rag.systemPrompt, query);
    } catch {
      answer = `관련 문서를 찾았습니다: ${rag.sources.join(", ")}\n웹 채팅에서 상세 답변을 확인해 주세요.`;
    }

    const text = `*질문:* ${query}\n*참고 문서:* ${rag.sources.join(", ")}\n\n${answer}`.slice(
      0,
      SLACK_TEXT_LIMIT
    );

    return NextResponse.json({
      response_type: "in_channel",
      text,
    });
  } catch (err) {
    logError("slack.command", { err, path: "/api/slack/command" });
    return NextResponse.json({
      response_type: "ephemeral",
      text: "처리 중 오류가 발생했습니다.",
    });
  }
}
