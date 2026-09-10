/**
 * 标题生成（移植自后端 summarize_conversation）
 *
 * 调用 DeepSeek API 根据对话内容自动生成简短标题。
 */

import * as localStore from "@/lib/local/conversationStore";

export async function generateTitle(
  conversationId: string,
  callback: (title: string) => void,
) {
  try {
    const conv = await localStore.getConversation(conversationId);
    if (!conv) return;
    const history = conv.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        content: (m.content || "").slice(0, 200),
        role: m.role,
      }));
    if (history.length === 0) return;

    const key = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || "";
    if (!key) return;

    const summaryPrompt = [
      {
        role: "system",
        content:
          "你是对话标题生成器。请根据以下对话内容，生成一个简短的标题。\n" +
          "要求：\n- 10个汉字以内\n- 概括对话的核心话题\n" +
          "- 不要加引号、标点符号\n- 直接输出标题文字，不要加任何前缀",
      },
      {
        role: "user",
        content: `对话内容：\n${JSON.stringify(history, null, 2)}`,
      },
    ];

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: summaryPrompt,
        temperature: 0.3,
        max_tokens: 20,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    let title = data?.choices?.[0]?.message?.content?.trim() || "";
    title = title
      .replace(/["'"「」]/g, "")
      .replace(/\n/g, " ")
      .trim();
    if (title.length > 20) title = title.slice(0, 20);
    if (title) callback(title);
  } catch {
    // 标题生成失败不影响主流程
  }
}
