// APIキー（外部プログラムからこのサービスを使うための鍵）の発行・照合を行うファイル。
// 大事な考え方：生の鍵はそのまま保存せず、ハッシュ化（元に戻せない変換）した値だけを保存する。
// こうすると、万一保存データが漏れても本物の鍵は分からず、安全性が高まる。
// ハッシュ＝入力を一方向に変換した固定長の文字列。同じ入力なら必ず同じ結果になる。

import { createHash, randomBytes } from "crypto";
import { id, saveApiKey, findApiKeyByHash } from "@/lib/data/store";
import type { ApiKey, Workspace } from "@/lib/domain/types";

// 生の鍵文字列を SHA-256 でハッシュ化して16進数文字列で返す（照合や保存に使う）。
export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// 新規APIキー発行。生キーは発行時のみ返す（保存はハッシュのみ）。
export function issueApiKey(workspaceId: string, name: string): { apiKey: ApiKey; raw: string } {
  // ランダムな生キーを作る（"gtm_sk_" は接頭辞、その後ろに推測困難な48文字を付ける）
  const raw = "gtm_sk_" + randomBytes(24).toString("hex");
  const apiKey: ApiKey = {
    id: id("key"),
    workspaceId,
    name: name || "API Key", // 名前が空なら既定名
    keyPreview: raw.slice(0, 12) + "…", // 表示用に先頭12文字だけ見せる（全体は見せない）
    keyHash: hashKey(raw), // 保存するのはハッシュ値だけ
    createdAt: Date.now(),
  };
  saveApiKey(apiKey); // ハッシュ入りのキー情報を保存
  return { apiKey, raw }; // 生キー(raw)はこの瞬間だけ返す（あとで再取得は不可）
}

// 受け取った生キーが有効かを照合する。ハッシュ化して一致する登録済みキーを探して返す。
export function resolveApiKey(raw: string | null): ApiKey | undefined {
  if (!raw) return undefined; // キーが無ければ該当なし
  return findApiKeyByHash(hashKey(raw)); // ハッシュで突き合わせて探す
}

// HTTPリクエストの Authorization ヘッダーから "Bearer 〈鍵〉" 形式の鍵部分を取り出す。
// Bearer トークン＝リクエストヘッダーに鍵を添えて本人確認する一般的な方式。
export function bearerFrom(req: Request): string | null {
  const h = req.headers.get("authorization") || ""; // ヘッダー値を取得（無ければ空文字）
  const m = h.match(/^Bearer\s+(.+)$/i); // "Bearer " に続く部分を抜き出す
  return m ? m[1] : null; // 抜き出せた鍵を返す。無ければ null
}

export type { Workspace };
