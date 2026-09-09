"use client";

/**
 * 设置弹窗：API key 输入 + 引导
 *
 * - 未配置 key 时发送消息 → 弹出此弹窗
 * - 侧栏底部加"设置"按钮也可打开
 */

import { useEffect, useState } from "react";
import { Input, Modal, Typography } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import { getApiKey, setApiKey } from "@/lib/local/settings";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (key: string) => void;
}

export default function SettingsModal({
  open,
  onClose,
  onSaved,
}: SettingsModalProps) {
  const [key, setKey] = useState("");

  useEffect(() => {
    if (open) {
      setKey(getApiKey());
    }
  }, [open]);

  const handleOk = () => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    onSaved?.(trimmed);
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          <KeyOutlined style={{ marginRight: 8 }} />
          DeepSeek API Key 设置
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      okButtonProps={{ disabled: !key.trim() }}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Demo 模式下，浏览器直连 DeepSeek API，key 存储在 localStorage（不打包进产物）。
        请在
        <Typography.Link
          href="https://platform.deepseek.com/api_keys"
          target="_blank"
          rel="noopener noreferrer"
        >
          {" "}
          DeepSeek 控制台{" "}
        </Typography.Link>
        获取 API Key。
      </Typography.Paragraph>
      <Input.Password
        autoFocus
        placeholder="sk-..."
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onPressEnter={handleOk}
      />
      <Typography.Paragraph
        type="warning"
        style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}
      >
        ⚠ 浏览器携带 API key 是 demo 定位下的取舍，对外演示后请及时更换 key。
      </Typography.Paragraph>
    </Modal>
  );
}
