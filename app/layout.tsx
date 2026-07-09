// このファイルはアプリ全体の「土台（レイアウト）」です。すべてのページが、この中に差し込まれて表示されます。
// ここでは使うフォントの読み込み、ブラウザのタブに出る題名・説明文、ページ全体の枠組み（html/body）を用意します。
// ※このファイルはサーバー側で動く部品（初期表示を作る係。ユーザー操作には直接反応しない）。

import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// 本文用のフォント「Inter」を読み込む設定。
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// 見出し用の飾りフォント「Fraunces」を読み込む設定。
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

// metadata = ブラウザのタブや検索結果に表示される題名・説明文。
export const metadata: Metadata = {
  title: "GTM — Find your perfect customers in one prompt",
  description:
    "理想の顧客像を一言で。GTM の AI エージェントがリアルタイムでウェブを検索し、検証済みの営業リードを発掘します。",
};

// アプリ全体の枠を作る部品。children（＝各ページの中身）を受け取り、body の中に差し込む。
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${fraunces.variable} antialiased`}
    >
      <body className="min-h-screen bg-cream text-ink">{children}</body>
    </html>
  );
}
