/**
 * NutriHealthProvider —— demo 模式 Provider
 *
 * 继承 DeepSeekChatProvider：
 * - transformParams：BM25 检索 → 构建 system prompt（画像 + RAG）→ 注入消息前部
 * - transformMessage：调用父类解析 DeepSeek 流式 chunk，并附加 sources 到返回消息
 *
 * 消息模型与 remote 模式对齐：{ content, role, sources?, conversationId?, error? }
 * ChatShell 统一从 message.sources 读取，Bubble footer 渲染引用卡片。
 */

import { DeepSeekChatProvider, XRequest } from "@ant-design/x-sdk";
import type { KnowledgeSource } from "@/types/chat";
import {
  BM25Searcher,
  type BundleChunk,
} from "@/lib/local/bm25";
import { type UserProfileData } from "@/lib/local/profile";
import { buildSystemPromptWithRag } from "@/lib/local/promptBuilder";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const TOP_K = 5;

/** demo 模式消息模型（与 NutriChatMessage 对齐） */
export interface NutriLocalMessage {
  content: string;
  role: "user" | "assistant";
  sources?: KnowledgeSource[];
  error?: string;
}

export interface NutriProviderOptions {
  apiKey: string;
  /** 用户画像（动态，由调用方传入） */
  profile: UserProfileData;
  /** 检索器（从 knowledge-bundle.json 构建），不传则不做 RAG */
  searcher?: BM25Searcher;
  /** 模型参数 */
  model?: string;
  temperature?: number;
}

/**
 * 创建 NutriHealthProvider 实例（demo 模式）
 *
 * 用法：
 *   const searcher = useMemo(() => new BM25Searcher(bundleChunks), []);
 *   const { provider } = useMemo(
 *     () => createNutriProvider({ apiKey, searcher }),
 *     [apiKey, searcher],
 *   );
 */
export function createNutriProvider(
  opts: NutriProviderOptions,
): DeepSeekChatProvider {
  const {
    apiKey,
    profile,
    searcher,
    model = "deepseek-chat",
    temperature = 0.7,
  } = opts;

  // XRequest 配置（manual: true —— 由 useXChat 触发请求）
  const request = XRequest(DEEPSEEK_API_URL, {
    manual: true,
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { model, stream: true, temperature },
  });

  // 检索结果暂存（transformParams 写入，transformMessage 读出）
  let pendingSources: KnowledgeSource[] = [];

  // 自定义 Provider：继承 DeepSeekChatProvider
  class NutriProvider extends DeepSeekChatProvider {
    transformParams(requestParams: any, options: any) {
      // 1. 父类 transformParams 拿到标准格式（含 this.getMessages() 历史）
      const base = super.transformParams(requestParams, options);

      // 2. BM25 检索
      const query =
        typeof requestParams === "string"
          ? requestParams
          : (requestParams?.message ?? requestParams?.content ?? "");
      const sources = searcher ? searcher.search(query, TOP_K) : [];
      pendingSources = sources;

      // 3. 构建 system prompt（画像 + RAG 上下文）
      const systemPrompt = buildSystemPromptWithRag(profile, sources);

      // 4. 注入消息前部
      return {
        ...base,
        messages: [
          { role: "system", content: systemPrompt },
          ...(base.messages || []),
        ],
      };
    }

    /** 覆盖：ChatShell 传 { message: string }，需转为 DeepSeek 标准的 user 消息 */
    transformLocalMessage(requestParams: any): NutriLocalMessage[] {
      const text =
        typeof requestParams === "string"
          ? requestParams
          : (requestParams?.message ?? requestParams?.content ?? "");
      return [{ content: text, role: "user" }];
    }

    transformMessage(info: any): NutriLocalMessage {
      // 父类处理 DeepSeek 流式累加（delta.content / [DONE] / reasoning_content）
      const base = super.transformMessage(info) as NutriLocalMessage;
      // 附加 RAG sources（流式过程中每次都带，最终 success 状态时也带）
      if (pendingSources.length > 0 && !base.sources) {
        base.sources = pendingSources;
      }
      return base;
    }
  }

  return new NutriProvider({ request });
}

/** 从 knowledge-bundle.json 构建 BM25 检索器 */
export function createSearcher(chunks: BundleChunk[]): BM25Searcher {
  return new BM25Searcher(chunks);
}
