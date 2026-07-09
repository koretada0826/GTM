// 多段ウォーターフォール検証 + 信頼度スコア（設計書 08 精度向上戦略）
// MOCK_MODE では決定的に判定。実検証API（メール/電話）は最終フェーズで差し替え。
//
// このファイルの役割：リードのメールや電話が「本物として使えそうか」を確かめ、
// その企業情報がどれだけ信頼できるかを点数（0〜100）で出します。
// ウォーターフォール検証＝いくつかの検証手段を順番に試し、確度が十分になった時点で打ち切る方式
//（滝が上から下へ流れるように段階的に確認する、の意味）。

import type { Lead, LeadVerification, VerificationResult } from "@/lib/domain/types";

// 文字列から 0以上1未満の数値を作る関数。同じ文字列なら常に同じ値（＝決定的）。
function hash(str: string): number {
  let h = 2166136261; // 初期値
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i); // 1文字ずつ混ぜる
    h = Math.imul(h, 16777619); // 定数を掛けて撹拌
  }
  return (h >>> 0) / 4294967296; // 0〜1の範囲に正規化して返す
}

// メール検証で使う手段の名前（段階的に試す順番）。mx/smtp はメール配送の仕組みの用語。
const EMAIL_PROVIDERS = ["syntax", "mx", "smtp-A", "smtp-B"];
// 電話検証で使う手段の名前。carrier=通信事業者, line-type=回線種別。
const PHONE_PROVIDERS = ["format", "carrier", "line-type"];

// 点数を「有効/注意/無効/不明」の4段階の判定に変換する。
function resultFromScore(score: number): VerificationResult {
  if (score >= 80) return "valid"; // 80以上＝有効
  if (score >= 55) return "risky"; // 55以上＝注意
  if (score > 0) return "invalid"; // それ以下（0超）＝無効
  return "unknown"; // 0＝不明
}

// メール検証：ウォーターフォール（確度が閾値超で確定、以降スキップ）
// 閾値＝これを超えたら十分とみなす基準値。
function verifyEmail(email: string): LeadVerification[] {
  const out: LeadVerification[] = []; // 各段階の結果をためる
  const base = hash(email); // メールから決定的な基準値を得る
  let score = 40 + Math.floor(base * 60); // 40-99（開始スコア）
  // catch-all っぽいドメインは減点（決定的）
  // catch-all＝どんな宛先でも受け取ってしまう設定で、実在確認がしにくいため信頼度を下げる
  if (base < 0.15) score -= 30;
  for (const provider of EMAIL_PROVIDERS) { // 手段を順番に試す
    out.push({ field: "email", provider, result: resultFromScore(score), score: Math.max(0, score) });
    if (score >= 82) break; // 閾値超えたら以降の段はスキップ
    score += 6; // 次段でさらに裏取り（点数を少し上げる）
  }
  return out;
}

// 電話検証。メール検証と同じ考え方で、段階的に確認して結果一覧を返す。
function verifyPhone(phone: string): LeadVerification[] {
  const out: LeadVerification[] = [];
  const base = hash(phone);
  let score = 45 + Math.floor(base * 55); // 開始スコア（45-99）
  for (const provider of PHONE_PROVIDERS) {
    out.push({ field: "phone", provider, result: resultFromScore(score), score: Math.max(0, score) });
    if (score >= 80) break; // 閾値超えたら打ち切り
    score += 8; // 次段で加点
  }
  return out;
}

// 指定した項目（メール or 電話）の中で最も高いスコアを返す。なければ0。
function fieldScore(vs: LeadVerification[], field: "email" | "phone"): number {
  const rel = vs.filter((v) => v.field === field); // その項目の結果だけ抽出
  if (!rel.length) return 0;
  return Math.max(...rel.map((v) => v.score)); // 最高点を採用
}

// verifyLead の戻り値の形。検証済みリードと、そのとき課金したクレジット数。
export interface VerifyOutcome {
  lead: Lead; // 検証結果と信頼度を反映したリード
  creditsUsed: number; // 成功した検証のみ課金（＝成果があった分だけのクレジット）
}

// リード1件を検証し、信頼度スコアを確定。成功分のみ課金対象を返す。
export function verifyLead(lead: Lead): VerifyOutcome {
  const verifications: LeadVerification[] = []; // 全検証結果をためる
  let credits = 0; // 課金するクレジット数

  if (lead.email) { // メールがあれば検証する
    const vs = verifyEmail(lead.email);
    verifications.push(...vs);
    if (fieldScore(vs, "email") >= 55) credits += 1; // マッチ成功時のみ課金
  }
  if (lead.phone) { // 電話があれば検証する
    const vs = verifyPhone(lead.phone);
    verifications.push(...vs);
    if (fieldScore(vs, "phone") >= 55) credits += 1; // 成功時のみ課金
  }

  const emailS = fieldScore(verifications, "email"); // メールの最終スコア
  const phoneS = fieldScore(verifications, "phone"); // 電話の最終スコア

  // 総合信頼度：fitScore(0.3) + emailスコア(0.45) + phoneスコア(0.25) の加重
  // ＝3つの点数にそれぞれ重み付けして合算し、総合的な信頼度を出す
  const confidence = Math.round(
    lead.fitScore * 0.3 +
      emailS * 0.45 +
      phoneS * 0.25
  );

  return {
    // 元のリードに検証結果と信頼度を上書きした新しいリードを返す（信頼度は0〜100に丸める）
    lead: { ...lead, verifications, confidence: Math.max(0, Math.min(100, confidence)) },
    creditsUsed: credits,
  };
}

// 信頼度の点数を「高い/普通/低い」の3段階ラベルに変換する（画面表示などに使う）。
export function confidenceTier(score: number): "high" | "mid" | "low" {
  if (score >= 80) return "high"; // 80以上＝高い
  if (score >= 50) return "mid"; // 50以上＝普通
  return "low"; // それ未満＝低い
}
