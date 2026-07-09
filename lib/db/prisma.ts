// Prisma クライアント（シングルトン）。
// DATABASE_URL（クライアント用意の開発環境）に接続する。
// 接続情報が来るまではインメモリ store で稼働継続 → 接続後にこのクライアント経由へ切替える。
//
// このファイルの役割：データベースに接続するための道具（Prisma クライアント）を1つだけ用意します。
// Prisma＝データベースを扱いやすくするライブラリ。DATABASE_URL＝接続先を示す環境変数。
// シングルトン＝アプリ全体で1個だけ作って共有する仕組み（毎回新しく作ると接続が増えすぎるため）。
// インメモリ store＝データベースの代わりに、一時的にメモリ上でデータを持つ簡易保管庫。

import { PrismaClient } from "@prisma/client";

// 開発中の再読み込みで接続が増え続けないよう、グローバル領域に置き場所を用意する。
const g = globalThis as unknown as { __gtmPrisma?: PrismaClient };

// すでに作られていればそれを再利用し、無ければ新しく1つ作る（??は左が無いとき右を使う演算子）。
export const prisma: PrismaClient =
  g.__gtmPrisma ??
  new PrismaClient({
    // 開発環境では警告＋エラーを、本番ではエラーのみをログ出力する
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// 本番以外（開発など）では、作ったクライアントをグローバルに覚えさせて次回も使い回す
if (process.env.NODE_ENV !== "production") g.__gtmPrisma = prisma;

// DATABASE_URL が設定されているか（未設定ならインメモリ store を使用）
// ＝データベースに繋げる状態かどうかを true/false で返す。
export const DB_ENABLED = () => !!process.env.DATABASE_URL;
