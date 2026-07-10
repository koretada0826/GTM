import { getCurrentUser } from "@/lib/auth/session";
import { getJob, getWorkspace } from "@/lib/data/store";
import { runSearchJob } from "@/lib/agent/runner";
import type { JobEvent } from "@/lib/domain/types";

/*
 * このAPI（GET /api/jobs/[id]/stream）は、指定したジョブを実行しつつ、その進捗を
 * リアルタイムで少しずつ送り返す窓口です。
 * 受け取るもの: URLの中のジョブID。
 * 返すもの: SSE（Server-Sent Events＝サーバーから継続的に少しずつ届く通知の仕組み）による進捗イベント。
 * 画面側はこの通知を受け取って、検索の途中経過をその場で表示します。
 */
// SSE でジョブの進捗を配信しながら実行する
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // URLに含まれるジョブIDを取り出す
  const { id } = await params;
  // ログイン確認：未ログインなら 401（認証が必要）
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  // ジョブの存在確認と所有者確認：本人のワークスペースのジョブかどうかを調べる
  const job = getJob(id);
  if (!job) return new Response("not found", { status: 404 });
  const ws = getWorkspace(job.workspaceId);
  if (!ws || ws.ownerId !== user.id) return new Response("forbidden", { status: 403 });

  // 文字列をバイト列に変換する道具（送信データのエンコード用）
  const encoder = new TextEncoder();
  // 少しずつデータを流し込む「読み取り可能なストリーム」を用意する
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false; // ストリームが閉じたかどうか（閉じた後は書き込まない）
      // 1件の進捗イベントを SSE 形式（"data: 〜\n\n"）で送信する関数。
      // ★閉じた/切断済みの相手へ書くと例外になるため、closed フラグと try/catch で保護する。
      const send = (ev: JobEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        // ジョブを実行。req.signal でクライアント切断を runner に伝え、途中で中断できるようにする
        await runSearchJob(id, send, req.signal);
      } catch (e) {
        send({ type: "failed", message: (e as Error).message, at: Date.now() });
      } finally {
        // 最後に「終了」を知らせるイベントを送り、ストリームを閉じる（例外は握りつぶす）
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`));
            controller.close();
          } catch {
            /* すでに閉じている場合は無視 */
          }
        }
      }
    },
    // クライアント切断時に呼ばれる。ここで以後の送信を止める。
    cancel() {
      /* runner は signal.aborted を見て自ら止まる */
    },
  });

  // SSE として返すためのヘッダーを付けて、ストリームを応答する
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream", // SSE であることを示す種別
      "Cache-Control": "no-cache, no-transform", // 途中でキャッシュ・変換させない
      Connection: "keep-alive", // 接続を維持し続ける
    },
  });
}
