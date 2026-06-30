import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "万年红·福主日课｜风水师专用择日工具",
  description: "助您快速筛选乔迁、嫁娶、开工、建房等日课方案",
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
