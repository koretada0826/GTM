// アプリ全体の設定値と、数値を見やすく整える小さな道具をまとめたファイル。
// 設定は「環境変数」（実行環境ごとに外から与える値。process.env で読める）から取り込みます。
// これにより、コードを書き換えずに動作を切り替えられます。

import type { Market } from "@/lib/domain/types";

// モックモードかどうか。環境変数が "false" のときだけ本番、それ以外は既定でモック（お試し）動作。
export const MOCK_MODE = process.env.MOCK_MODE !== "false"; // 既定はモック
// 既定の対象市場。環境変数が "GLOBAL" ならグローバル、それ以外は日本（JP）。
export const MARKET_DEFAULT: Market =
  (process.env.MARKET_DEFAULT as Market) === "GLOBAL" ? "GLOBAL" : "JP";

// 数値を日本円の表記（例: ￥1,234）に整えて文字列で返す。
export function formatJpy(n: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
}

// 数値を3桁区切り（例: 1,234,567）に整えて文字列で返す。
export function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
