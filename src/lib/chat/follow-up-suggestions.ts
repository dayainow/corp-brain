import { displaySourceName } from "@/lib/chat/ui-message";

const MAX_FOLLOW_UPS = 3;

/** 답변·출처 기반 후속 질문 제안 (클라이언트 휴리스틱) */
export function suggestFollowUpQuestions(
  userQuery: string | undefined,
  answerText: string,
  sourceFileNames: string[]
): string[] {
  const out: string[] = [];
  const used = new Set<string>();

  const add = (question: string) => {
    const q = question.trim();
    if (!q || used.has(q) || out.length >= MAX_FOLLOW_UPS) return;
    used.add(q);
    out.push(q);
  };

  const uniqueSources = [...new Set(sourceFileNames.filter(Boolean))];
  const primary = uniqueSources[0];
  const secondary = uniqueSources[1];

  if (secondary) {
    add(
      `「${displaySourceName(primary)}」와 「${displaySourceName(secondary)}」 문서를 비교해서 알려줘`
    );
  } else if (primary) {
    add(`「${displaySourceName(primary)}」 문서에서 신청·절차 관련 내용도 알려줘`);
  }

  if (/예외|주의|금지/.test(answerText)) {
    add("예외 상황이나 주의할 점을 더 자세히 알려줘");
  } else if (userQuery && /어떻게|방법|절차|신청/.test(userQuery)) {
    add("관련해서 예외나 주의할 점도 알려줘");
  } else {
    add("방금 답변과 관련된 다른 규정도 있으면 알려줘");
  }

  add("방금 답변을 업무용으로 3줄 요약해줘");

  return out.slice(0, MAX_FOLLOW_UPS);
}
