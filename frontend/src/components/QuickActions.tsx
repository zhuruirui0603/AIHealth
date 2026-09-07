"use client";

interface QuickActionsProps {
  onAction: (message: string) => void;
  disabled: boolean;
}

const QUICK_ACTIONS = [
  { icon: "🥗", label: "今天吃什么", message: "我今天不知道吃什么，帮我推荐一下适合我的早餐和午餐？" },
  { icon: "🍱", label: "外卖怎么选", message: "黄焖鸡米饭、麻辣烫、轻食沙拉，这三个外卖哪个比较适合我？" },
  { icon: "🏃", label: "运动怎么吃", message: "晚上8点去健身，现在5点半应该吃什么？" },
  { icon: "🧊", label: "食品安全吗", message: "昨天炒的鸡肉一直放冰箱，今天还能吃吗？" },
  { icon: "🩺", label: "最近身体有什么变化", message: "最近每天下午三四点都特别饿，是不是跟饮食有关？" },
  { icon: "👴", label: "帮父母看看", message: "我妈妈68岁，最近吃饭比较少，怎么帮她调整饮食？" },
];

export default function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.message)}
          disabled={disabled}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-lg">{action.icon}</span>
          <span className="font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
