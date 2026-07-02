"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

interface ChatFeedbackProps {
  messageId: string;
  query?: string;
  sources?: string[];
}

export function ChatFeedback({ messageId, query, sources }: ChatFeedbackProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (value: "up" | "down") => {
    if (rating || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value, messageId, query, sources }),
      });
      if (res.ok) setRating(value);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
      <span className="text-xs text-slate-400">도움이 되었나요?</span>
      <button
        type="button"
        onClick={() => submit("up")}
        disabled={!!rating || submitting}
        className={`p-1 rounded-md transition-colors ${
          rating === "up" ? "text-green-600" : "text-slate-400 hover:text-green-600"
        }`}
        aria-label="좋아요"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => submit("down")}
        disabled={!!rating || submitting}
        className={`p-1 rounded-md transition-colors ${
          rating === "down" ? "text-red-500" : "text-slate-400 hover:text-red-500"
        }`}
        aria-label="아쉬워요"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
      {rating && <span className="text-xs text-slate-400">감사합니다</span>}
    </div>
  );
}
