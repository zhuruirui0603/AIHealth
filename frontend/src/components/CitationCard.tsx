"use client";

import { useState } from "react";
import type { KnowledgeSource } from "@/types/chat";

interface CitationCardProps {
  source: KnowledgeSource;
  index: number;
}

const DOMAIN_LABELS: Record<string, string> = {
  nutrition: "营养",
  food_safety: "食品安全",
  exercise: "运动",
  medical: "医学基础",
};

export default function CitationCard({ source, index }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (source.url) {
      window.open(source.url, "_blank", "noopener,noreferrer");
    } else {
      setExpanded(!expanded);
    }
  };

  const hasUrl = source.url && source.url.trim().length > 0;

  return (
    <div
      onClick={handleClick}
      className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs transition-colors ${
        hasUrl
          ? "cursor-pointer hover:border-primary-400 hover:bg-primary-50"
          : "cursor-pointer hover:border-gray-300 hover:bg-gray-100"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="font-medium text-primary-600">[{index}]</span>
        <span className="flex-1 truncate font-medium text-gray-700">{source.title}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600">
          {DOMAIN_LABELS[source.domain] || source.domain}
        </span>
        {source.evidence_level && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
            {source.evidence_level}
          </span>
        )}
        {hasUrl ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-gray-400">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`flex-shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
      <p className={`text-gray-500 ${expanded ? "" : "line-clamp-2"}`}>
        {source.content}
      </p>
      {expanded && source.section && (
        <div className="mt-1.5 border-t border-gray-200 pt-1.5 text-[10px] text-gray-400">
          章节: {source.section}
        </div>
      )}
      {source.source && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
          <span>来源: {source.source}</span>
          {hasUrl && <span className="text-primary-500">· 点击查看原文</span>}
        </div>
      )}
    </div>
  );
}
