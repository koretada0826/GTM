// この画面は「公開API」ページです。外部のプログラムから検索を実行するためのAPIキーを発行・管理し、
// 使い方のサンプルコードも表示します。実際のキー発行フォームは ApiKeysPanel 部品が担当します。
// ※このファイルはサーバー側で動く部品。表示前に本人確認とデータ取得を行います。

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspace, getWallet, listApiKeys } from "@/lib/data/store";
import { AppShell } from "@/components/AppShell";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // URL から作業スペースのIDを取り出す。
  const user = await getCurrentUser();
  const ws = getWorkspace(id);
  // 存在しない・未ログイン・持ち主が違う場合は「見つかりません」を表示。
  if (!ws || !user || ws.ownerId !== user.id) notFound();
  const wallet = getWallet(ws.id); // クレジット残高（画面上部の表示に使う）。
  // ★クライアントへ渡すのは公開用の項目だけ（keyHash=鍵のハッシュは絶対に渡さない）
  const keys = listApiKeys(ws.id).map((k) => ({
    id: k.id,
    name: k.name,
    keyPreview: k.keyPreview,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
  }));

  return (
    <AppShell workspace={ws} balance={wallet?.balance ?? 0} active="/api-keys">
      <div className="scroll-thin h-full overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif-display text-3xl text-ink">公開 API</h1>
          <p className="mt-2 text-sm text-ink-soft">
            プログラムから検索を実行できます（origami にない差別化機能）。
            APIキーを発行し、<code className="rounded bg-cream-100 px-1">Authorization: Bearer</code> ヘッダで利用します。
          </p>

          {/* APIキーの発行・一覧を扱う部品を差し込む */}
          <div className="mt-6">
            <ApiKeysPanel workspaceId={ws.id} initialKeys={keys} />
          </div>

          {/* 使い方：ターミナルにそのまま貼り付けて試せるサンプルコマンド */}
          <h2 className="mt-10 font-serif-display text-xl text-ink">使い方</h2>
          <pre className="scroll-thin mt-3 overflow-x-auto rounded-2xl border border-line bg-ink p-4 text-xs leading-relaxed text-cream">
{`# 検索ジョブを作成
curl -X POST https://<your-domain>/v1/search \\
  -H "Authorization: Bearer gtm_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"東京の歯科医院で採用中","market":"JP","max_results":24}'
# => { "job_id": "job_...", "status": "created" }

# 結果を取得
curl https://<your-domain>/v1/jobs/job_... \\
  -H "Authorization: Bearer gtm_sk_..."`}
          </pre>
        </div>
      </div>
    </AppShell>
  );
}
