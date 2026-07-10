import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createPlan } from "@/lib/agent/planner";
import { getWorkspace, addMessage, createSession, getSession } from "@/lib/data/store";
import { MARKET_DEFAULT } from "@/lib/config";

/*
 * このAPI（POST /api/plan）は「検索プラン」を作るための窓口です。
 * 受け取るもの: ワークスペースID・ユーザーが入力した指示文(prompt)・（あれば）会話セッションID。
 * 返すもの: 会話セッションIDと、作成した検索プラン(plan)。
 * ※プランはまだ実行されず、あくまで「これから何を検索するか」の下書きです。
 */
export async function POST(req: Request) {
  // ログイン確認：ログインしていなければ 401（認証が必要）を返して終了する
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // リクエスト本文(JSON)を読み取り、必要な値を取り出す
  // ★壊れたJSON/空bodyで落ちないよう catch → 400（不正リクエスト）を返す
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { workspaceId, prompt } = body as { workspaceId: string; prompt: string; sessionId?: string };
  let sessionId = body.sessionId as string | undefined;

  // 所有者確認：指定されたワークスペースが存在し、かつログイン中の本人のものかを確認する
  const ws = getWorkspace(workspaceId);
  if (!ws || ws.ownerId !== user.id)
    return NextResponse.json({ error: "workspace not found" }, { status: 404 });
  // 入力チェック：指示文が空なら 400、長すぎ（2000文字超）も 400（巨大入力・コスト暴走対策）
  if (!prompt?.trim())
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  if (prompt.length > 2000)
    return NextResponse.json({ error: "prompt too long" }, { status: 400 });

  // ★sessionId 指定時は、そのセッションが本人のワークスペースのものかを検証（他人の会話への書き込み防止）
  if (sessionId) {
    const s = getSession(sessionId);
    if (!s || s.workspaceId !== workspaceId)
      return NextResponse.json({ error: "invalid session" }, { status: 400 });
  }

  // セッションIDが無い＝新しい会話。指示文の先頭40文字をタイトルにして新規セッションを作る
  if (!sessionId) {
    const s = createSession(workspaceId, prompt.slice(0, 40));
    sessionId = s.id;
  }

  // ユーザーの発言を会話履歴に記録する
  addMessage({ sessionId, role: "user", content: prompt, kind: "text" });
  // 指示文をもとに検索プランを作成する（市場はワークスペース設定、無ければ既定値）
  const plan = createPlan(workspaceId, sessionId, prompt, ws.market ?? MARKET_DEFAULT);
  // AI側の返信（プラン作成の案内）を会話履歴に記録する
  addMessage({
    sessionId,
    role: "assistant",
    content: "検索プランを作成しました。内容を確認して実行してください。",
    kind: "plan",
    data: { planId: plan.id },
  });

  // 会話セッションIDと作成したプランを返す
  return NextResponse.json({ sessionId, plan });
}
