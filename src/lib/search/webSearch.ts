/**
 * 联网搜索（Tavily）—— 本地知识库 BM25 检索的补充
 *
 * 触发策略（仅知识库不足时兜底，节省 API 额度、降低延迟）：
 *   1. 查询与营养健康相关（isHealthRelated）
 *   2. 且本地 BM25 检索为空、或 top1 分数低于阈值
 *
 * 无 API key 时自动降级为纯知识库检索（返回空数组）。
 * 结果转为 KnowledgeSource 格式，与本地来源统一渲染/跳转/去重。
 */

import type { KnowledgeSource } from "@/types/chat";
import { isHealthRelated } from "@/lib/providers/NutriHealthProvider";

const TAVILY_API_URL = "https://api.tavily.com/search";
/** 本地 BM25 top1 分数低于此值视为知识库覆盖不足 */
const MIN_LOCAL_SCORE = 5;
/** 搜索超时（毫秒）：失败/超时不阻塞对话主流程 */
const TIMEOUT_MS = 6000;
/** 联网搜索结果条数 */
const MAX_RESULTS = 4;

/** Tavily 搜索结果项 */
interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

/** 是否已配置 Tavily（未配置时整体功能降级） */
export function tavilyEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TAVILY_API_KEY;
}

/** Tavily 结果 → KnowledgeSource（网络来源统一标记 domain=web、证据等级 C） */
function toSource(r: TavilyResult, i: number): KnowledgeSource | null {
  if (!r.url || !r.content) return null;
  let host = "";
  try {
    host = new URL(r.url).hostname.replace(/^www\./, "");
  } catch {
    // url 非法则丢弃
    return null;
  }
  return {
    chunk_id: `web-${i}-${host}`,
    content: r.content,
    score: Math.round((r.score ?? 0) * 10000) / 10000,
    domain: "web",
    section: host,
    source: host,
    title: r.title || host,
    evidence_level: "C",
    document_id: r.url,
    url: r.url,
  };
}

/** 调用 Tavily 搜索（失败/超时返回空数组，不影响主流程） */
async function searchWeb(query: string): Promise<KnowledgeSource[]> {
  const apiKey = process.env.NEXT_PUBLIC_TAVILY_API_KEY || "";
  if (!apiKey) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: MAX_RESULTS,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: TavilyResult[] = Array.isArray(data?.results)
      ? data.results
      : [];
    return results
      .map(toSource)
      .filter((s): s is KnowledgeSource => s !== null);
  } catch {
    // 网络/超时/解析失败：静默降级
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 知识库不足时联网搜索兜底
 *
 * @param query 用户提问
 * @param localSources 本地 BM25 检索结果（按分数降序）
 */
export async function searchWebIfNeeded(
  query: string,
  localSources: KnowledgeSource[],
): Promise<KnowledgeSource[]> {
  if (!tavilyEnabled()) return [];
  if (!isHealthRelated(query)) return [];
  const topScore = localSources[0]?.score ?? 0;
  if (localSources.length > 0 && topScore >= MIN_LOCAL_SCORE) return [];
  return searchWeb(query);
}
