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

/**
 * 营养健康领域关键词表
 *
 * 用于判断用户查询是否与营养健康相关。
 * 当查询不包含任何关键词时，跳过 RAG 检索（不展示"参考来源"卡片），
 * 避免对不相关问题（如"今天天气""帮我写诗"）展示不相关的知识库来源。
 */
const HEALTH_KEYWORDS = [
  // 营养/饮食
  "营养", "饮食", "食物", "吃", "喝", "蛋白", "碳水", "脂肪", "维生素",
  "矿物质", "膳食", "热量", "卡路里", "饥饿", "饱腹", "消化", "吸收",
  "代谢", "能量", "血糖", "胆固醇", "甘油三酯", "纤维", "谷物", "蔬菜",
  "水果", "肉", "鱼", "蛋", "奶", "豆", "盐", "糖", "油", "水", "饮酒",
  // 餐饮/食品
  "外卖", "快餐", "零食", "宵夜", "早餐", "午餐", "晚餐", "加餐", "食谱",
  "烹饪", "煮", "炒", "蒸", "烤", "煎", "食材", "剩菜", "储存", "保鲜",
  "过期", "变质", "中毒", "卫生", "安全",
  // 运动/健身
  "运动", "健身", "锻炼", "跑步", "有氧", "无氧", "力量", "拉伸", "恢复",
  "疲劳", "肌肉", "体重", "减肥", "增肌", "减脂", "塑形", "体能",
  // 健康/身体
  "健康", "身体", "睡眠", "免疫", "血压", "心脏", "肝", "肾", "胃",
  "肠", "骨骼", "关节", "皮肤", "头发", "牙齿", "眼睛", "大脑", "神经",
  "激素", "内分泌", "衰老", "抗氧化", "炎症", "疲劳", "压力", "焦虑",
  "老人", "儿童", "孕妇", "哺乳", "婴儿", "青少年", "更年期",
  // 疾病/症状（仅作关键词判断，不诊断）
  "糖尿病", "高血压", "低血糖", "贫血", "痛风", "骨质疏松", "便秘", "腹泻",
  "胃炎", "溃疡", "肥胖", "消瘦", "水肿", "缺钙", "缺铁", "缺锌",
  // 中医/食疗
  "食疗", "养生", "枸杞", "红枣", "蜂蜜", "中药", "气血", "体质",
];

/** 判断查询是否与营养健康相关（RAG 门控与免责声明展示共用） */
export function isHealthRelated(query: string): boolean {
  if (!query) return false;
  // 查询过短（单字）不做 RAG
  if (query.trim().length < 2) return false;
  return HEALTH_KEYWORDS.some((kw) => query.includes(kw));
}

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

      // 2. BM25 检索（仅当查询与营养健康相关时）+ 合并 UI 层预取的联网搜索结果
      const query =
        typeof requestParams === "string"
          ? requestParams
          : (requestParams?.message ?? requestParams?.content ?? "");
      const localSources =
        searcher && isHealthRelated(query) ? searcher.search(query, TOP_K) : [];
      // webSources 由 ChatShell 在提交前异步预取（知识库命中不足时联网兜底），
      // 经 requestParams 透传到此处（transformParams 是同步的，不能在此发请求）
      const webSources: KnowledgeSource[] = Array.isArray(
        requestParams?.webSources,
      )
        ? requestParams.webSources
        : [];
      const sources = [...localSources, ...webSources];
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
