// Stripe クライアントとプラン設定。
// STRIPE_SECRET_KEY が未設定なら「モック」動作（キー投入で本番稼働）。
// 実装（Checkout / Portal / Webhook）は用意済みで、鍵は最後にクライアントが設定する。
//
// Stripe＝クレジットカード決済などを扱う外部サービス。
// このファイルは Stripe に接続するための窓口と、プランごとの価格設定をまとめています。
// 秘密鍵（STRIPE_SECRET_KEY）が用意されるまでは、実際の決済をしない「モック」で安全に動きます。
// （Checkout=決済画面, Portal=顧客の契約管理画面, Webhook=Stripeからの通知受け口）

import Stripe from "stripe";
import type { Plan } from "@/lib/domain/types";

// Stripe接続オブジェクトを1回だけ作って使い回すための保管場所（キャッシュ）。
let _stripe: Stripe | null = null;

// Stripe に接続するオブジェクトを返す。鍵が未設定なら null（＝モック動作）。
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY; // 秘密鍵を環境変数から取得
  if (!key) return null; // 未設定＝モック
  if (!_stripe) _stripe = new Stripe(key); // 初回だけ接続オブジェクトを作る
  return _stripe;
}

// Stripe が有効か（＝秘密鍵が設定済みか）を true/false で返す。!! は値の有無を真偽値に変換。
export const STRIPE_ENABLED = () => !!process.env.STRIPE_SECRET_KEY;

// プラン → Stripe Price ID を格納した環境変数名（値は最後に設定）
// ＝各プランの価格ID（Stripe側で決めた料金の識別子）が、どの環境変数に入っているかの対応表。
const PRICE_ENV: Partial<Record<Plan, string>> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  scale: "STRIPE_PRICE_SCALE",
};

// 指定プランに対応する Stripe の価格ID を返す。設定が無ければ undefined。
export function priceIdForPlan(plan: Plan): string | undefined {
  const envName = PRICE_ENV[plan]; // そのプランの環境変数名を調べる
  return envName ? process.env[envName] : undefined; // 環境変数から実際の価格IDを取り出す
}

// Webhook（Stripeからの通知）が本物かを検証するための秘密鍵を返す。
export const WEBHOOK_SECRET = () => process.env.STRIPE_WEBHOOK_SECRET;
