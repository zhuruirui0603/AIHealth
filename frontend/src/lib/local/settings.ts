/**
 * 设置模块：API key 存取
 *
 * - localStorage key: `nutrihealth_api_key`
 * - 构建时默认值：`NEXT_PUBLIC_DEEPSEEK_API_KEY`（会打进产物，仅限内部 demo）
 */

const KEY_STORAGE = "nutrihealth_api_key";

/** 读取 API key（优先 localStorage，其次构建时默认值） */
export function getApiKey(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || "";
  }
  return (
    localStorage.getItem(KEY_STORAGE) ||
    process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ||
    ""
  );
}

/** 保存 API key 到 localStorage */
export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(KEY_STORAGE, trimmed);
  } else {
    localStorage.removeItem(KEY_STORAGE);
  }
}

/** 清除 API key */
export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_STORAGE);
}

/** 是否已配置 API key */
export function hasApiKey(): boolean {
  return !!getApiKey();
}
