/**
 * 健康小目标统计（纯函数，不依赖 Dexie）
 *
 * 输入为某目标的打卡日期 key 集合（"YYYY-MM-DD"）。
 */

import { addDaysKey, lastNDays, weekDates } from "./dateUtils";

/** 每日目标连续打卡天数：
 *  锚点 = 今日已打卡 ? 今日 : 昨日；两者都未打卡 → 0；
 *  否则从锚点向前逐日计数连续打卡天数。 */
export function computeDailyStreak(checked: Set<string>, today: string): number {
  const anchor = checked.has(today) ? today : addDaysKey(today, -1);
  if (!checked.has(anchor)) return 0;
  let streak = 0;
  let cursor = anchor;
  while (checked.has(cursor)) {
    streak += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
}

/** 每周目标进度：本周（周一 ~ 周日）去重打卡天数 */
export function computeWeekProgress(
  checked: Set<string>,
  today: string,
): { weekCount: number; days: string[] } {
  const days = weekDates(today);
  const weekCount = days.filter((d) => checked.has(d)).length;
  return { weekCount, days };
}

/** 近 7 天日期 key（旧 → 新，含今天），用于点阵展示 */
export function last7DayKeys(today: string): string[] {
  return lastNDays(7, today);
}
