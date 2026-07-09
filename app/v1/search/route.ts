import { NextResponse } from "next/server";
import { bearerFrom, resolveApiKey } from "@/lib/auth/apikey";
import { getWorkspace, getWallet, saveApiKey } from "@/lib/data/store";
import { createPlan } from "@/lib/agent/planner";
import { createJob, runSearchJob } from "@/lib/agent/runner";

/*
 * このAPI（POST /v1/search）は、外部プログラム向けに公開された検索用の窓口です。
 * 認証はログインではなく「APIキー」で行います（HTTPヘッダーの Bearer トークン＝
 * "Bearer 鍵文字列" 形式で送る合言葉）。
 * 受け取るもの: 指示文(prompt)・（任意で）対象市場(market)・取得上限件数(max_results)。
 * 返すもの: 作成したジョブのID(job_id)と状態(status)。
 */
// 公開REST API：検索ジョブを作成して実行（差別化ポイント：origamiには公開APIが無い）
// POST /v1/search  { prompt, market?, max_results? }
export async function POST(req: Request) {
  // 認証：ヘッダーのBearerトークンからAPIキーを解決。無効なら 401（認証が必要）
  const key = resolveApiKey(bearerFrom(req));
  if (!key) return NextResponse.json({ error: "invalid api key" }, { status: 401 });

  // APIキーに紐づくワークスペースを取得する
  const ws = getWorkspace(key.workspaceId);
  if (!ws) return NextResponse.json({ error: "workspace not found" }, { status: 404 });

  // このキーの「最終利用日時」を更新して保存する（利用状況の記録用）
  key.lastUsedAt = Date.now();
  saveApiKey(key);

  // リクエスト本文(JSON)を読み取る。壊れていても落ちないよう、失敗時は空オブジェクト扱いにする
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    market?: "JP" | "GLOBAL";
    max_results?: number;
  };
  // 入力チェック：指示文が空なら 400（リクエストが不正）
  if (!body.prompt?.trim())
    return NextResponse.json({ error: "prompt required" }, { status: 400 });

  // クレジット残高チェック：残高が無ければ 402（支払いが必要）
  const wallet = getWallet(ws.id);
  if (wallet && wallet.balance <= 0)
    return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });

  // 指示文から検索プランを作成する（取得件数は最大40件に制限）
  const plan = createPlan(
    ws.id,
    "api",
    body.prompt,
    body.market ?? ws.market,
    Math.min(body.max_results ?? 24, 40)
  );
  // プランからジョブを作成する
  const job = createJob(plan);
  // API 経由は同期実行（完了まで待つ）
  // ※画面向けのSSEと違い、進捗通知は使わないので送信関数は空にしている
  await runSearchJob(job.id, () => {});

  // 作成したジョブのIDと状態を返す（結果は GET /v1/jobs/{id} で取得する）
  return NextResponse.json({ job_id: job.id, status: "created" });
}
