import json
from typing import Generator

from openai import OpenAI

from app.config import settings


class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
        self.model = settings.deepseek_model

    def stream_chat(self, messages: list[dict]) -> Generator[str, None, None]:
        """
        Call DeepSeek API with streaming enabled.
        Yields content chunks as they arrive.
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
            temperature=0.7,
        )
        for chunk in response:
            delta = chunk.choices[0].delta
            if delta.content is not None:
                yield delta.content

    def chat(self, messages: list[dict]) -> str:
        """Non-streaming fallback."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
        )
        return response.choices[0].message.content

    def summarize_conversation(self, messages: list[dict]) -> str:
        """
        Generate a short summary (10 chars max) of the conversation as the title.
        Uses a dedicated prompt with low temperature for consistency.
        """
        # Truncate long messages to avoid token waste
        truncated = []
        for msg in messages:
            content = msg["content"]
            if len(content) > 200:
                content = content[:200] + "..."
            truncated.append({"role": msg["role"], "content": content})

        summary_prompt = [
            {
                "role": "system",
                "content": (
                    "你是对话标题生成器。请根据以下对话内容，生成一个简短的标题。\n"
                    "要求：\n"
                    "- 10个汉字以内\n"
                    "- 概括对话的核心话题\n"
                    "- 不要加引号、标点符号\n"
                    "- 直接输出标题文字，不要加任何前缀"
                ),
            },
            {
                "role": "user",
                "content": f"对话内容：\n{json.dumps(truncated, ensure_ascii=False)}",
            },
        ]
        response = self.client.chat.completions.create(
            model=self.model,
            messages=summary_prompt,
            temperature=0.3,
            max_tokens=20,
        )
        title = response.choices[0].message.content.strip()
        # Cleanup: remove quotes, newlines, colons
        title = title.strip("\"'""「」""").replace("\n", " ").strip()
        if len(title) > 20:
            title = title[:20]
        return title
