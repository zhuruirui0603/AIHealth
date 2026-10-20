"use client";

/**
 * 健康小目标弹窗
 *
 * 与 ProfileModal 的"草稿 + 保存"模式不同：打卡 / 提醒设置需要即时生效，
 * 因此每次操作直接写 IndexedDB，并通过 onChanged 通知父组件刷新。
 */

import { useCallback, useEffect, useState } from "react";
import {
  App,
  Button,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Switch,
  Tag,
  Typography,
} from "antd";
import { AimOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  createGoal,
  deleteGoal,
  getGoalWithStats,
  listAllGoals,
  toggleCheckIn,
  updateGoal,
  type GoalWithStats,
} from "@/lib/local/goalStore";
import type { LocalHealthGoal } from "@/lib/local/db";
import { todayKey } from "@/lib/local/dateUtils";

interface GoalsModalProps {
  open: boolean;
  onClose: () => void;
  /** 目标数据变化后通知父组件（如刷新提醒调度） */
  onChanged?: () => void;
}

/** 卡片样式（与 SourcesList 一致的设计语言） */
const cardStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "rgba(240,253,250,0.45)",
  padding: "10px 12px",
};

export default function GoalsModal({ open, onClose, onChanged }: GoalsModalProps) {
  const { message, notification } = App.useApp();
  const [goals, setGoals] = useState<GoalWithStats[]>([]);
  const [archived, setArchived] = useState<LocalHealthGoal[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // 添加表单
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [targetPerWeek, setTargetPerWeek] = useState<number>(3);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState("");
  const [browserNotify, setBrowserNotify] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [active, all] = await Promise.all([getGoalWithStats(), listAllGoals()]);
      setGoals(active);
      setArchived(all.filter((g) => g.archived));
    } catch {
      // IndexedDB 不可用时静默（如隐私模式）
    }
  }, []);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const notifyChanged = () => onChanged?.();

  /** 确保浏览器通知权限（denied 时警告并返回 false，但提醒时间仍会保存） */
  const ensureNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      message.info("当前浏览器不支持通知，将仅使用应用内提醒");
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
      notification.warning({
        message: "浏览器通知权限被拒绝",
        description: "仍会在页面内提醒你；如需系统通知请在浏览器设置中允许。",
      });
      return false;
    }
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      notification.warning({
        message: "未授权浏览器通知",
        description: "仍会在页面内提醒你。",
      });
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      message.warning("请先填写目标内容");
      return;
    }
    await createGoal({
      title: trimmed,
      emoji: emoji.trim() || undefined,
      frequency,
      targetPerWeek: frequency === "weekly" ? targetPerWeek : undefined,
      reminderTime: reminderOn && reminderTime ? reminderTime : undefined,
      wantBrowserNotification: reminderOn && browserNotify,
    });
    setTitle("");
    setEmoji("");
    setFrequency("daily");
    setTargetPerWeek(3);
    setReminderOn(false);
    setReminderTime("");
    setBrowserNotify(false);
    setShowAdd(false);
    await reload();
    notifyChanged();
  };

  const handleCheckIn = async (goal: GoalWithStats) => {
    await toggleCheckIn(goal.id);
    await reload();
    notifyChanged();
  };

  const handleReminderChange = async (goal: GoalWithStats, time: string) => {
    await updateGoal(goal.id, { reminderTime: time || undefined });
    await reload();
    notifyChanged();
  };

  const handleBrowserNotifyChange = async (
    goal: GoalWithStats,
    want: boolean,
  ) => {
    if (!want) {
      await updateGoal(goal.id, { wantBrowserNotification: false });
      await reload();
      return;
    }
    const granted = await ensureNotificationPermission();
    await updateGoal(goal.id, { wantBrowserNotification: granted });
    await reload();
    notifyChanged();
  };

  const handleArchive = async (goal: GoalWithStats) => {
    await updateGoal(goal.id, { archived: true });
    await reload();
    notifyChanged();
  };

  const handleDelete = async (goalId: string) => {
    await deleteGoal(goalId);
    await reload();
    notifyChanged();
  };

  const today = todayKey();

  const renderGoalCard = (goal: GoalWithStats) => (
    <div key={goal.id} style={cardStyle}>
      {/* 行 1：标题 + 类型 + 进度 */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 16 }}>{goal.emoji || "🎯"}</span>
        <span className="font-medium" style={{ fontSize: 14 }}>
          {goal.title}
        </span>
        <Tag color={goal.frequency === "weekly" ? "purple" : "cyan"} style={{ marginRight: 0 }}>
          {goal.frequency === "weekly" ? "每周" : "每日"}
        </Tag>
        <span className="ml-auto" style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7280)" }}>
          {goal.frequency === "weekly"
            ? `本周 ${goal.weekCount}/${goal.targetPerWeek ?? 3} 次`
            : goal.doneToday
              ? `连续 ${goal.streak} 天 ✓`
              : goal.streak > 0
                ? `连续 ${goal.streak} 天`
                : "未开始"}
        </span>
      </div>
      {/* 行 2：近 7 天点阵 */}
      <div className="mt-2 flex items-center gap-2">
        <span style={{ fontSize: 11, color: "var(--color-text-secondary, #6b7280)" }}>近 7 天</span>
        <div className="flex gap-1">
          {goal.last7.map((d) => (
            <span
              key={d.date}
              title={d.date}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: d.done
                  ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
                  : "var(--color-border, #e5e7eb)",
                outline: d.date === today ? "1.5px solid var(--color-primary)" : "none",
                outlineOffset: 1,
                display: "inline-block",
              }}
            />
          ))}
        </div>
      </div>
      {/* 行 3：打卡 + 提醒设置 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          size="small"
          type={goal.doneToday ? "default" : "primary"}
          ghost={!goal.doneToday}
          onClick={() => handleCheckIn(goal)}
        >
          {goal.doneToday ? "已打卡 ✓" : "今日打卡"}
        </Button>
        <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
          <Typography.Text type="secondary">提醒</Typography.Text>
          <Input
            type="time"
            size="small"
            style={{ width: 96 }}
            value={goal.reminderTime ?? ""}
            onChange={(e) => handleReminderChange(goal, e.target.value)}
          />
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
          <Typography.Text type="secondary">浏览器通知</Typography.Text>
          <Switch
            size="small"
            checked={!!goal.wantBrowserNotification}
            onChange={(v) => handleBrowserNotifyChange(goal, v)}
          />
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Typography.Link onClick={() => handleArchive(goal)} style={{ fontSize: 12 }}>
            归档
          </Typography.Link>
          <Popconfirm
            title="删除目标"
            description="打卡记录将一并删除，确定吗？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(goal.id)}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </span>
      </div>
    </div>
  );

  return (
    <Modal
      title={
        <span>
          <AimOutlined style={{ marginRight: 8 }} />
          健康小目标
        </span>
      }
      open={open}
      onCancel={onClose}
      width={560}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div className="flex items-center justify-between">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            提醒在页面打开时生效；关闭页面后将无法提醒
          </Typography.Text>
          <div>
            <CancelBtn />
            <OkBtn />
          </div>
        </div>
      )}
    >
      <div className="flex flex-col gap-3 py-2">
        {/* 添加目标 */}
        {showAdd ? (
          <div style={{ ...cardStyle, background: "rgba(255,255,255,0.6)" }}>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  style={{ width: 56, textAlign: "center" }}
                  placeholder="🎯"
                  value={emoji}
                  maxLength={2}
                  onChange={(e) => setEmoji(e.target.value)}
                />
                <Input
                  placeholder="如：每天喝水 1500ml"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onPressEnter={handleAdd}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Segmented
                  size="small"
                  value={frequency}
                  onChange={(v) => setFrequency(v as "daily" | "weekly")}
                  options={[
                    { value: "daily", label: "每日" },
                    { value: "weekly", label: "每周" },
                  ]}
                />
                {frequency === "weekly" && (
                  <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
                    <Typography.Text type="secondary">目标次数</Typography.Text>
                    <InputNumber
                      size="small"
                      min={1}
                      max={7}
                      value={targetPerWeek}
                      onChange={(v) => setTargetPerWeek(v ?? 3)}
                    />
                  </span>
                )}
                <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
                  <Typography.Text type="secondary">提醒</Typography.Text>
                  <Switch
                    size="small"
                    checked={reminderOn}
                    onChange={(v) => {
                      setReminderOn(v);
                      if (v && !reminderTime) setReminderTime("20:00");
                    }}
                  />
                </span>
                {reminderOn && (
                  <Input
                    type="time"
                    size="small"
                    style={{ width: 96 }}
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                  />
                )}
                {reminderOn && (
                  <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
                    <Typography.Text type="secondary">浏览器通知</Typography.Text>
                    <Switch
                      size="small"
                      checked={browserNotify}
                      onChange={(v) => {
                        setBrowserNotify(v);
                        if (v) ensureNotificationPermission();
                      }}
                    />
                  </span>
                )}
                <span className="ml-auto flex gap-2">
                  <Button size="small" onClick={() => setShowAdd(false)}>
                    取消
                  </Button>
                  <Button size="small" type="primary" onClick={handleAdd}>
                    保存
                  </Button>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => setShowAdd(true)}
          >
            添加目标
          </Button>
        )}

        {/* 活跃目标列表 */}
        {goals.length === 0 && !showAdd ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有健康小目标，添加一个开始坚持吧"
          />
        ) : (
          goals.map(renderGoalCard)
        )}

        {/* 已归档（折叠） */}
        {archived.length > 0 && (
          <div>
            <Typography.Link
              onClick={() => setShowArchived((v) => !v)}
              style={{ fontSize: 12 }}
            >
              {showArchived ? "收起已归档" : `已归档（${archived.length}）`}
            </Typography.Link>
            {showArchived && (
              <div className="mt-2 flex flex-col gap-2">
                {archived.map((g) => (
                  <div
                    key={g.id}
                    style={{ ...cardStyle, opacity: 0.6, padding: "8px 12px" }}
                    className="flex items-center gap-2"
                  >
                    <span>{g.emoji || "🎯"}</span>
                    <span style={{ fontSize: 13 }}>{g.title}</span>
                    <Tag style={{ marginRight: 0 }}>
                      {g.frequency === "weekly" ? "每周" : "每日"}
                    </Tag>
                    <span className="ml-auto">
                      <Popconfirm
                        title="彻底删除该目标？"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(g.id)}
                      >
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
