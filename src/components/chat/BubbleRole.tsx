"use client";

/**
 * Bubble role 配置：assistant / user 的渲染方式
 *
 * 必须保持模块级稳定引用（内联对象会导致重渲染、重置流式动画）
 */

import React from "react";
import { Actions, Bubble, Sources } from "@ant-design/x";
import { XMarkdown } from "@ant-design/x-markdown";
import { Button, Typography } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import type { BubbleExtra } from "./types";

export const bubbleRole = {
  assistant: {
    placement: "start" as const,
    contentRender: (content: string, info: { extraInfo?: BubbleExtra }) => (
      <div>
        <XMarkdown content={String(content ?? "")} />
        {info.extraInfo?.error ? (
          <Typography.Text
            type="danger"
            style={{ display: "block", marginTop: 8 }}
          >
            ⚠ {info.extraInfo.error}
          </Typography.Text>
        ) : null}
      </div>
    ),
    footer: (content: string, info: { extraInfo?: BubbleExtra }) => {
      const sources = info.extraInfo?.sources;
      const hasSources = !!sources?.length;

      // 按 document_id 去重：同一文档只展示一条引用来源
      const seen = new Set<string>();
      const deduped = (sources || []).filter((s) => {
        const id = s.document_id || s.title;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      if (!content && !hasSources) return null;

      const { onReload, messageId, isRequesting } = info.extraInfo ?? {};

      return (
        <div className="flex flex-col gap-2">
          <Actions
            items={[
              {
                key: "copy",
                actionRender: () => (
                  <Actions.Copy text={content} />
                ),
              },
              {
                key: "retry",
                label: "重新生成",
                actionRender: () => (
                  <Button
                    type="text"
                    size="small"
                    icon={<RedoOutlined />}
                    disabled={isRequesting || !onReload}
                    onClick={() => {
                      if (onReload && messageId != null) {
                        onReload(messageId);
                      }
                    }}
                  >
                    重新生成
                  </Button>
                ),
              },
            ]}
            variant="borderless"
          />
          {hasSources ? (
            <Sources
              title="参考来源"
              defaultExpanded
              items={deduped.map((s, i) => ({
                key: s.chunk_id ?? String(i),
                title: s.title,
                url: s.url,
                description: [s.source, s.domain, s.evidence_level]
                  .filter(Boolean)
                  .join(" · "),
              }))}
              onClick={(item) => {
                if (item.url) window.open(item.url, "_blank");
              }}
            />
          ) : null}
        </div>
      );
    },
  },
  user: { placement: "end" as const },
};
