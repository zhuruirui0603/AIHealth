/**
 * ChatShell 共享常量与工具函数
 */

/** 临时会话 key 前缀（新对话在首次回复完成前没有真实会话 id） */
export const TEMP_PREFIX = "local-new-";

export const newTempKey = () => `${TEMP_PREFIX}${Date.now()}`;

/** 空态快捷提问 */
export const QUICK_PROMPTS = [
  "我今天不知道吃什么，帮我推荐一下适合我的早餐和午餐？",
  "晚上8点去健身，现在5点半应该吃什么？",
  "昨天炒的鸡肉一直放冰箱，今天还能吃吗？",
  "最近每天下午三四点都特别饿，是不是跟饮食有关？"
];

/** 相对时间格式化 */
export function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  if (hour < 24) return `${hour}小时前`;
  if (day < 7) return `${day}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
