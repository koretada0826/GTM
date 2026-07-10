// この部品は「APIキー」を管理する画面です。APIキーとは、外部のプログラムがこのサービスを
// 利用するときの合言葉（パスワードのようなもの）です。ここで新しいキーを発行し、一覧を表示します。
// ※「"use client"」= ブラウザ側で動く部品（ボタン操作や入力に反応するため）。
"use client";

import { useState } from "react";

// 画面で扱う公開用のキー情報（keyHash=鍵のハッシュは含めない＝漏えい防止）
export interface PublicApiKey {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: number;
  lastUsedAt?: number;
}

// workspaceId = どの作業スペース用のキーか、initialKeys = 最初から表示しておく既存キーの一覧。
export function ApiKeysPanel({
  workspaceId,
  initialKeys,
}: {
  workspaceId: string;
  initialKeys: PublicApiKey[];
}) {
  // 画面上で変化する値を覚えておく箱（state）。
  const [keys, setKeys] = useState<PublicApiKey[]>(initialKeys); // 表示中のキー一覧。
  const [name, setName] = useState(""); // 入力欄に打ち込まれたキー名。
  const [freshKey, setFreshKey] = useState<string | null>(null); // 発行直後のキー（1回だけ全文表示）。

  // 「発行」ボタンを押したときの処理。サーバーに新しいキーの作成を頼む。
  const create = async () => {
    // fetch = サーバーに問い合わせる命令。ここでは新規キー作成を依頼している。
    const res = await fetch("/api/apikeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, name: name || "API Key" }),
    });
    // サーバーからの返事を受け取る。
    const data = await res.json();
    setFreshKey(data.raw); // 発行された生のキー文字列を保存し、画面に表示する。
    setKeys((k) => [data.apiKey, ...k]); // 一覧の先頭に新しいキーを追加。
    setName(""); // 入力欄を空に戻す。
  };

  // 「失効」ボタン：漏れたキーを無効化する。サーバーに削除（失効）を頼み、一覧からも消す。
  const revoke = async (keyId: string) => {
    await fetch("/api/apikeys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    setKeys((k) => k.filter((x) => x.id !== keyId));
  };

  return (
    <div>
      {/* キー名の入力欄と「発行」ボタン */}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="キー名（例：本番サーバー）"
          className="flex-1 rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button
          onClick={create}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white"
        >
          発行
        </button>
      </div>

      {/* 発行直後だけ、キーの全文を表示する枠（この画面を離れると二度と見られない） */}
      {freshKey && (
        <div className="mt-4 rounded-xl border border-brand/40 bg-brand-soft/40 p-4">
          <div className="text-sm font-medium text-ink">新しいAPIキー（この画面でのみ表示されます）</div>
          <code className="mt-2 block break-all rounded-lg bg-paper px-3 py-2 font-mono text-xs text-ink">
            {freshKey}
          </code>
          {/* クリックするとキー文字列をクリップボード（コピー置き場）に写す */}
          <button
            onClick={() => navigator.clipboard?.writeText(freshKey)}
            className="mt-2 text-xs font-medium text-brand hover:underline"
          >
            コピー
          </button>
        </div>
      )}

      {/* 発行済みAPIキーの一覧表（名前・キーの一部・作成日を表示） */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-paper">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-100/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">名前</th>
              <th className="px-4 py-2 font-medium">キー</th>
              <th className="px-4 py-2 font-medium">作成日</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {/* キーが1件も無いときの案内表示 */}
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  APIキーはまだありません
                </td>
              </tr>
            )}
            {/* 1件ずつ表の行にして並べる */}
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-line/70">
                <td className="px-4 py-2 text-ink">{k.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{k.keyPreview}</td>
                <td className="px-4 py-2 text-muted">
                  {new Date(k.createdAt).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-2 text-right">
                  {/* 漏れたキーを無効化する失効ボタン */}
                  <button
                    onClick={() => revoke(k.id)}
                    className="text-xs font-medium text-[#9a3b3b] hover:underline"
                  >
                    失効
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
