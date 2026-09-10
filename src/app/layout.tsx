import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "健康助手",
  description: "AI 营养健康决策助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
