/**
 * 本地时区日期工具（健康小目标 / 跟进专用）
 *
 * 全部使用本地时区计算，禁止用 toISOString().slice(0, 10) —— 那是 UTC 日期，
 * 在 UTC+8 晚上 8 点后会差一天。日期 key 统一为 "YYYY-MM-DD"（字典序即时间序）。
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → 本地 "YYYY-MM-DD" */
export function toLocalDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今天的本地日期 key */
export function todayKey(): string {
  return toLocalDateKey(new Date());
}

/** "YYYY-MM-DD" → 本地 Date（避免 UTC 解析偏移） */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 日期 key 加 n 天（n 可为负） */
export function addDaysKey(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toLocalDateKey(d);
}

/** 该日期所在周的周一（周一 ~ 周日为一周） */
export function isoWeekMonday(key: string): string {
  const d = parseDateKey(key);
  const day = d.getDay(); // 0=周日
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateKey(d);
}

/** 包含 key 的那一周（周一 ~ 周日）的 7 个日期 key */
export function weekDates(key: string): string[] {
  const monday = isoWeekMonday(key);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
}

/** 以 key 为终点（含）的近 n 天日期 key，旧 → 新 */
export function lastNDays(n: number, key: string = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDaysKey(key, -(n - 1 - i)));
}

/** 当前本地时间 "HH:mm" */
export function nowHHMM(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
