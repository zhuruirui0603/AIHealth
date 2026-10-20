"use client";

/**
 * 健康小目标提醒调度器（纯前端限制：仅页面打开时生效）
 *
 * - 挂载 5 秒后首查，之后每 30 秒检查一次活跃目标的提醒时间
 * - localStorage 记录每个目标"当天已提醒"，跨刷新去重
 * - 先写去重记录再触发通知（防止写入失败导致重复弹）
 * - 应用内 antd notification 始终弹；浏览器 Notification 仅在已授权时叠加
 * - 页面重新可见时立即补查一次（长时间挂后台的场景）
 */

import { useCallback, useEffect, useRef } from "react";
import { App, Button } from "antd";
import { getGoalWithStats, toggleCheckIn } from "@/lib/local/goalStore";
import { nowHHMM, todayKey } from "@/lib/local/dateUtils";

const LAST_REMINDED_KEY = "nutrihealth_goal_last_reminded";

type RemindedMap = Record<string, string>; // goalId -> 已提醒日期 key

function readRemindedMap(): RemindedMap {
  try {
    const raw = localStorage.getItem(LAST_REMINDED_KEY);
    return raw ? (JSON.parse(raw) as RemindedMap) : {};
  } catch {
    return {};
  }
}

function writeRemindedMap(map: RemindedMap): void {
  try {
    localStorage.setItem(LAST_REMINDED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** 返回手动触发一次检查的函数（GoalsModal onChanged 用于保存目标后立即补查） */
export function useGoalReminders(): () => void {
  const { notification } = App.useApp();
  const notificationRef = useRef(notification);
  notificationRef.current = notification;

  const tick = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const goals = (await getGoalWithStats()).filter((g) => g.reminderTime);
      if (goals.length === 0) return;

      const today = todayKey();
      const now = nowHHMM();
      const map = readRemindedMap();
      let changed = false;

      for (const goal of goals) {
        if (map[goal.id] === today) continue; // 今天已提醒过
        if (now < (goal.reminderTime as string)) continue; // 未到提醒时间
        // 每周目标已达标则不再提醒
        if (
          goal.frequency === "weekly" &&
          goal.weekCount >= (goal.targetPerWeek ?? 3)
        ) {
          map[goal.id] = today;
          changed = true;
          continue;
        }

        // 先写去重，再触发（crash-safe）
        map[goal.id] = today;
        changed = true;

        const key = `goal-${goal.id}-${today}`;
        notificationRef.current.open({
          key,
          message: "健康小提醒",
          description: goal.emoji ? `${goal.emoji} ${goal.title}` : goal.title,
          duration: 0,
          btn: (
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                await toggleCheckIn(goal.id).catch(() => {});
                notificationRef.current.destroy(key);
              }}
            >
              打卡
            </Button>
          ),
        });

        // 浏览器系统通知（仅用户已授权时叠加；权限请求只在 GoalsModal 中发起）
        if (
          goal.wantBrowserNotification &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("健康小提醒", { body: goal.title, tag: key });
          } catch {
            // 系统通知失败不影响应用内提醒
          }
        }
      }

      if (changed) writeRemindedMap(map);
    } catch {
      // IndexedDB 不可用等异常静默
    }
  }, []);

  useEffect(() => {
    // 首查延迟 5 秒，避免与"到期小回访"通知同屏挤在一起
    const first = setTimeout(() => tick(), 5000);
    const timer = setInterval(() => tick(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);

  return tick;
}
