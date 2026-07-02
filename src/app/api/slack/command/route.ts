import crypto from "crypto";
import { NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings";
import { hybridSearch } from "@/lib/vector-store";
import { config } from "@/lib/config";
import { writeAuditLog } from "@/lib/audit";

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

/** Slack Slash Command: /corpbrain [질문] */
export async function POST(req: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Slack not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-slack-signature") ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";

  if (!verifySlackSignature(signingSecret, signature, timestamp, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(body);
  const query = params.get("text")?.trim();
  const userId = params.get("user_id") ?? "slack-user";
  const userName = params.get("user_name") ?? "slack";

  if (!query) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "사용법: `/corpbrain [질문]`\n예: `/corpbrain 휴가 규정 알려줘`",
    });
  }

  try {
    const embedding = await generateEmbedding(query);
    const docs = await hybridSearch(query, embedding, config.rag.topK, "general");
    const context = docs
      .map((d) => `[출처: ${d.metadata.fileName}]\n${d.text}`)
      .join("\n\n");

    await writeAuditLog({
      action: "chat.query",
      userId,
      userEmail: `${userName}@slack`,
      userRole: "general",
      detail: { query, source: "slack", sourcesFound: docs.length },
    });

    if (docs.length === 0) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "관련 사내 문서를 찾지 못했습니다.",
      });
    }

    const sources = [...new Set(docs.map((d) => d.metadata.fileName))].join(", ");

    return NextResponse.json({
      response_type: "in_channel",
      text: `*질문:* ${query}\n*참고 문서:* ${sources}\n\n검색된 내용을 바탕으로 웹 채팅에서 상세 답변을 확인하세요.\n_${context.slice(0, 500)}..._`,
    });
  } catch (err) {
    console.error("Slack command error:", err);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "처리 중 오류가 발생했습니다.",
    });
  }
}
