import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspace, getSubscription } from "@/lib/data/store";
import { getStripe } from "@/lib/stripe/client";

/*
 * このAPI（POST /api/stripe/portal）は、支払い方法の変更や解約などを行う
 * Stripeの「顧客ポータル」ページへの入口URLを返す窓口です。
 * 受け取るもの: ワークスペースID。返すもの: 顧客ポータルのURL。
 * ※Stripeの鍵や顧客情報が無い環境では、モック（お試し）URLを返します。
 */
// POST { workspaceId } → Stripe Billing Portal のURL（未設定時はモック）
export async function POST(req: Request) {
  // ログイン確認：未ログインなら 401（認証が必要）
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 本文から対象ワークスペースを読み取る
  const { workspaceId } = (await req.json()) as { workspaceId: string };
  // 所有者確認：そのワークスペースが本人のものかを確認する
  const ws = getWorkspace(workspaceId);
  if (!ws || ws.ownerId !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // ポータルから戻ってくる先の請求ページURLを組み立てる
  const origin = new URL(req.url).origin;
  const billingUrl = `${origin}/app/w/${workspaceId}/billing`;
  const stripe = getStripe();
  const sub = getSubscription(workspaceId);

  // Stripeが使えて、かつ顧客IDがあれば、本物の顧客ポータルセッションを作る
  if (stripe && sub?.stripeCustomerId) {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: billingUrl,
    });
    return NextResponse.json({ url: session.url, mode: "stripe" });
  }

  // 鍵未設定＝モック
  return NextResponse.json({ url: `${billingUrl}?portal=mock`, mode: "mock" });
}
