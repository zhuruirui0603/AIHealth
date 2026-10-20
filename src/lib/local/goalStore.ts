/**
 * 健康小目标存储（demo 模式）
 *
 * 模块级 async CRUD，数据在 IndexedDB（Dexie v3 healthGoals / goalCheckIns 表）。
 * 打卡记录 id 为确定性 `${goalId}::${date}`，put() 幂等，天然防重复打卡。
 */

import { db, genId, type LocalGoalCheckIn, type LocalHealthGoal } from "./db";
import { todayKey } from "./dateUtils";
import {
  computeDailyStreak,
  computeWeekProgress,
  last7DayKeys,
} from "./goalStats";
import { formatGoalSection } from "./promptBuilder";

const nowISO = () => new Date().toISOString();

export interface GoalWithStats extends LocalHealthGoal {
  /** 每日目标：连续打卡天数 */
  streak: number;
  /** 每周目标：本周已打卡次数 */
  weekCount: number;
  /** 近 7 天点阵（旧 → 新） */
  last7: { date: string; done: boolean }[];
  /** 今天是否已打卡 */
  doneToday: boolean;
}

export interface CreateGoalInput {
  title: string;
  emoji?: string;
  frequency: "daily" | "weekly";
  targetPerWeek?: number;
  reminderTime?: string;
  wantBrowserNotification?: boolean;
}

/** 活跃目标列表（不含归档，按创建时间升序） */
export async function listGoals(): Promise<LocalHealthGoal[]> {
  const all = await db.healthGoals.toArray();
  return all
    .filter((g) => !g.archived)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

/** 全部目标（含归档，弹窗历史区用） */
export async function listAllGoals(): Promise<LocalHealthGoal[]> {
  const all = await db.healthGoals.toArray();
  return all.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

/** 创建目标 */
export async function createGoal(input: CreateGoalInput): Promise<LocalHealthGoal> {
  const ts = nowISO();
  const goal: LocalHealthGoal = {
    id: genId(),
    title: input.title,
    emoji: input.emoji,
    frequency: input.frequency,
    targetPerWeek:
      input.frequency === "weekly" ? input.targetPerWeek ?? 3 : undefined,
    reminderTime: input.reminderTime,
    wantBrowserNotification: input.wantBrowserNotification,
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.healthGoals.add(goal);
  return goal;
}

/** 更新目标字段 */
export async function updateGoal(
  id: string,
  patch: Partial<Pick<LocalHealthGoal, "title" | "emoji" | "frequency" | "targetPerWeek" | "reminderTime" | "wantBrowserNotification" | "archived">>,
): Promise<void> {
  await db.healthGoals.update(id, { ...patch, updatedAt: nowISO() });
}

/** 删除目标及其全部打卡记录（事务级联） */
export async function deleteGoal(id: string): Promise<void> {
  await db.transaction("rw", db.healthGoals, db.goalCheckIns, async () => {
    await db.goalCheckIns.where("goalId").equals(id).delete();
    await db.healthGoals.delete(id);
  });
}

/** 切换某目标某天（默认今天）的打卡状态，返回切换后是否已打卡 */
export async function toggleCheckIn(goalId: string, dateKey?: string): Promise<boolean> {
  const date = dateKey ?? todayKey();
  const id = `${goalId}::${date}`;
  const existing = await db.goalCheckIns.get(id);
  if (existing) {
    await db.goalCheckIns.delete(id);
    return false;
  }
  const record: LocalGoalCheckIn = {
    id,
    goalId,
    date,
    createdAt: nowISO(),
  };
  await db.goalCheckIns.put(record);
  return true;
}

/** 加载某目标的全部打卡日期 key 集合 */
async function loadCheckedDates(goalId: string): Promise<Set<string>> {
  const records = await db.goalCheckIns.where("goalId").equals(goalId).toArray();
  return new Set(records.map((r) => r.date));
}

/** 目标列表 + 统计（连续天数 / 本周进度 / 近 7 天点阵 / 今日是否已打卡） */
export async function getGoalWithStats(): Promise<GoalWithStats[]> {
  const goals = await listGoals();
  const today = todayKey();
  return Promise.all(
    goals.map(async (goal) => {
      const checked = await loadCheckedDates(goal.id);
      const last7 = last7DayKeys(today).map((date) => ({
        date,
        done: checked.has(date),
      }));
      if (goal.frequency === "weekly") {
        const { weekCount } = computeWeekProgress(checked, today);
        return {
          ...goal,
          streak: 0,
          weekCount,
          last7,
          doneToday: checked.has(today),
        };
      }
      return {
        ...goal,
        streak: computeDailyStreak(checked, today),
        weekCount: 0,
        last7,
        doneToday: checked.has(today),
      };
    }),
  );
}

/** 构建注入 system prompt 的「## 健康小目标」上下文段；无目标返回 "" */
export async function buildGoalContext(): Promise<string> {
  const goals = await getGoalWithStats();
  if (goals.length === 0) return "";
  return formatGoalSection(goals, todayKey());
}
