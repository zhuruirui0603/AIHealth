"use client";

/**
 * 悬浮顶部导航栏（毛玻璃）
 */

import React from "react";
import { Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";

export interface ChatHeaderProps {
  onOpenSidebar: () => void;
}

export default function ChatHeader({ onOpenSidebar }: ChatHeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-20 glass-panel"
      style={{ height: "var(--navbar-height)" }}
    >
      <div className="flex h-full px-4">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            className="md:hidden"
            icon={<MenuOutlined />}
            onClick={onOpenSidebar}
            aria-label="打开侧边栏"
          />
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                boxShadow: "0 2px 8px rgba(8,145,178,0.3)",
              }}
              aria-hidden="true"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 6.5-7 11-7 11z" />
              </svg>
            </div>
            <div>
              <div
                className="text-base font-bold leading-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                健康助手
              </div>
              <div className="text-[11px] leading-tight" style={{ color: "var(--color-muted-foreground)" }}>
                今天有什么健康问题？
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
