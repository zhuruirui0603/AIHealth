"use client";

/**
 * 用户画像设置弹窗
 *
 * 用户可输入年龄、性别、身高、体重、目标等信息，
 * 保存到 localStorage，作为 system prompt 的画像上下文。
 */

import { useEffect, useState } from "react";
import { Input, InputNumber, Modal, Select, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import {
  type UserProfileData,
  getProfile,
  setProfile,
  defaultProfile,
} from "@/lib/local/profile";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: UserProfileData) => void;
}

export default function ProfileModal({
  open,
  onClose,
  onSaved,
}: ProfileModalProps) {
  const [profile, setProfileState] = useState<UserProfileData>(defaultProfile);

  useEffect(() => {
    if (open) {
      setProfileState(getProfile());
    }
  }, [open]);

  const update = <K extends keyof UserProfileData>(
    key: K,
    value: UserProfileData[K],
  ) => {
    setProfileState((prev) => ({ ...prev, [key]: value }));
  };

  const handleOk = () => {
    setProfile(profile);
    onSaved?.(profile);
    onClose();
  };

  const handleReset = () => {
    setProfileState(defaultProfile);
  };

  return (
    <Modal
      title={
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          个人信息设置
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      width={520}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div className="flex items-center justify-between">
          <Typography.Link onClick={handleReset}>恢复默认</Typography.Link>
          <div>
            <CancelBtn />
            <OkBtn />
          </div>
        </div>
      )}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2">
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            年龄
          </Typography.Text>
          <InputNumber
            className="mt-1 w-full"
            min={1}
            max={120}
            value={profile.age}
            onChange={(v) => update("age", v ?? 28)}
          />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            性别
          </Typography.Text>
          <Select
            className="mt-1 w-full"
            value={profile.sex}
            onChange={(v) => update("sex", v)}
            options={[
              { value: "male", label: "男" },
              { value: "female", label: "女" },
            ]}
          />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            身高 (cm)
          </Typography.Text>
          <InputNumber
            className="mt-1 w-full"
            min={80}
            max={250}
            value={profile.height}
            onChange={(v) => update("height", v ?? 175)}
          />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            体重 (kg)
          </Typography.Text>
          <InputNumber
            className="mt-1 w-full"
            min={20}
            max={300}
            value={profile.weight}
            onChange={(v) => update("weight", v ?? 78)}
          />
        </div>
        <div className="col-span-2">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            健康目标
          </Typography.Text>
          <Input
            className="mt-1"
            placeholder="如：减脂 + 增肌"
            value={profile.goal}
            onChange={(e) => update("goal", e.target.value)}
          />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            活动水平
          </Typography.Text>
          <Select
            className="mt-1 w-full"
            value={profile.activityLevel}
            onChange={(v) => update("activityLevel", v)}
            options={[
              { value: "sedentary", label: "久坐不动" },
              { value: "light", label: "轻度活动" },
              { value: "moderate", label: "中度活动" },
              { value: "active", label: "高度活动" },
              { value: "very_active", label: "运动员级别" },
            ]}
          />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            饮食偏好
          </Typography.Text>
          <Select
            className="mt-1 w-full"
            value={profile.dietPreference}
            onChange={(v) => update("dietPreference", v)}
            options={[
              { value: "杂食", label: "杂食" },
              { value: "素食", label: "素食" },
              { value: "纯素", label: "纯素" },
              { value: "低碳水", label: "低碳水" },
              { value: "低脂", label: "低脂" },
              { value: "高蛋白", label: "高蛋白" },
            ]}
          />
        </div>
        <div className="col-span-2">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            工作时间
          </Typography.Text>
          <Input
            className="mt-1"
            placeholder="如：9-18, 偶尔加班到21"
            value={profile.workSchedule}
            onChange={(e) => update("workSchedule", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            食物喜好
          </Typography.Text>
          <Input
            className="mt-1"
            placeholder="用逗号分隔，如：喜欢吃辣, 不喜欢香菜, 偏好米饭"
            value={profile.foodPreferences}
            onChange={(e) => update("foodPreferences", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            过敏
          </Typography.Text>
          <Input
            className="mt-1"
            placeholder="用逗号分隔，如：花生, 海鲜。无则填&quot;无&quot;"
            value={profile.allergies}
            onChange={(e) => update("allergies", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
