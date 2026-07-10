import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, WEBHOOK_SECRET } from "@/lib/stripe/client";
import { setWorkspacePlan, grantMonthlyCredits, upsertSubscription, findWorkspaceByStripe } from "@/lib/data/store";
import type { Plan } from "@/lib/domain/types";

// Stripe Webhook 受信口。署名検証のため生のボディを使う。
// STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET 設定後に本番稼働。
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = WEBHOOK_SECRET();
  if (!stripe || !secret) {
    // ★本番で鍵未設定なら 500 で失敗させる（フェイルクローズ）。
    //   200を返す（フェイルオープン）と、実決済が起きているのに全イベントを素通りさせてしまう。
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }
    // 開発環境：Webhookは未接続（モック運用中）
    return NextResponse.json({ received: true, mock: true });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    // 署名検証失敗。詳細はレスポンスに出さず、汎用文言のみ返す（内部情報を漏らさない）
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // 契約成立：プランを設定するだけ（クレジット付与はしない）。
      // 付与は下の invoice.paid で1回だけ行う → 二重計上を防ぐ。
      const s = event.data.object as Stripe.Checkout.Session;
      const workspaceId = s.metadata?.workspaceId || s.client_reference_id || undefined;
      const plan = s.metadata?.plan as Plan | undefined;
      if (workspaceId && plan) {
        setWorkspacePlan(workspaceId, plan);
        upsertSubscription(workspaceId, {
          plan,
          status: "active",
          stripeCustomerId: (s.customer as string) ?? undefined,
          stripeSubscriptionId: (s.subscription as string) ?? undefined,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // プラン変更・解約：プランを切り替えるだけ（クレジットは足さない）
      const sub = event.data.object as Stripe.Subscription;
      // ★metadataが欠けても、サブスクID/顧客IDから逆引きして必ず反映する（解約漏れ防止）
      const workspaceId =
        sub.metadata?.workspaceId ||
        findWorkspaceByStripe(sub.id, sub.customer as string);
      const plan = sub.metadata?.plan as Plan | undefined;
      if (workspaceId) {
        const canceled = event.type === "customer.subscription.deleted" || sub.status === "canceled";
        upsertSubscription(workspaceId, {
          status: canceled ? "canceled" : "active",
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: (sub as unknown as { current_period_end?: number }).current_period_end
            ? (sub as unknown as { current_period_end: number }).current_period_end * 1000
            : undefined,
        });
        if (canceled) setWorkspacePlan(workspaceId, "free");
        else if (plan) setWorkspacePlan(workspaceId, plan);
      }
      break;
    }
    case "invoice.paid": {
      // 支払い成功 → ここでだけ当月クレジットを付与。
      // ★workspaceId/plan は invoice.metadata に自動では乗らないため、サブスク側から逆引きする。
      //   dedupeKey は invoice.id（無ければ event.id）で冪等化＝二重計上防止。
      const inv = event.data.object as Stripe.Invoice;
      const subId = (inv as unknown as { subscription?: string }).subscription;
      const custId = inv.customer as string | undefined;
      const workspaceId = inv.metadata?.workspaceId || findWorkspaceByStripe(subId, custId);
      // planは、逆引きした購読情報から取得（保存済みの契約プラン）
      const plan = (inv.metadata?.plan as Plan | undefined) ??
        (workspaceId ? (await import("@/lib/data/store")).getSubscription(workspaceId)?.plan : undefined);
      if (workspaceId && plan) {
        grantMonthlyCredits(workspaceId, plan, `invoice:${inv.id ?? event.id}`);
      }
      break;
    }
    case "invoice.payment_failed": {
      // 支払い失敗 → 契約を past_due（支払遅延）にする（機能制限の判断材料）
      const inv = event.data.object as Stripe.Invoice;
      const subId = (inv as unknown as { subscription?: string }).subscription;
      const workspaceId = inv.metadata?.workspaceId || findWorkspaceByStripe(subId, inv.customer as string);
      if (workspaceId) upsertSubscription(workspaceId, { status: "past_due" });
      break;
    }
    case "charge.refunded": {
      // 返金 → 契約を解約扱いにし、プランを free に戻す（付与済みクレジットの扱いは事業方針で別途）
      const ch = event.data.object as Stripe.Charge;
      const workspaceId = findWorkspaceByStripe(undefined, ch.customer as string);
      if (workspaceId) {
        upsertSubscription(workspaceId, { status: "canceled" });
        setWorkspacePlan(workspaceId, "free");
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
