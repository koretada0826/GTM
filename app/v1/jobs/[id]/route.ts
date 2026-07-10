import { NextResponse } from "next/server";
import { bearerFrom, resolveApiKey } from "@/lib/auth/apikey";
import { getJob, listLeadsByJob } from "@/lib/data/store";
import { rateLimit } from "@/lib/ratelimit";

/*
 * このAPI（GET /v1/jobs/{id}）は、外部プログラム向けに公開された「ジョブ結果の取得」窓口です。
 * 認証はAPIキー（ヘッダーの Bearer トークン＝合言葉）で行います。
 * 受け取るもの: URL内のジョブID。
 * 返すもの: ジョブの状態・件数・消費クレジット・見つかったリード一覧。
 */
// 公開REST API：ジョブ結果取得
// GET /v1/jobs/{id}
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証：BearerトークンからAPIキーを解決。無効なら 401（認証が必要）
  const key = resolveApiKey(bearerFrom(req));
  if (!key) return NextResponse.json({ error: "invalid api key" }, { status: 401 });
  // レート制限：1つのAPIキーで1分あたり60回まで（列挙・スクレイピング抑止）
  if (!rateLimit(`v1jobs:${key.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  // URL内のジョブIDを取り出す
  const { id } = await params;
  // 所有者確認：ジョブが存在し、かつAPIキーと同じワークスペースのものかを確認する
  const job = getJob(id);
  if (!job || job.workspaceId !== key.workspaceId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  // 内部のリード情報を、公開API用のわかりやすいキー名に整えて並べ替える
  const leads = listLeadsByJob(id).map((l) => ({
    company: l.companyName,
    domain: l.domain,
    email: l.email,
    phone: l.phone,
    location: l.location,
    industry: l.category,
    headcount: l.headcount,
    funding: l.funding,
    buying_signal: l.buyingSignal,
    fit_score: l.fitScore,
    confidence: l.confidence,
    sources: l.sources.map((s) => ({ label: s.label, url: s.url })),
  }));

  // ジョブの概要と、整えたリード一覧をまとめて返す
  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    result_count: job.resultCount,
    credits_spent: job.creditsSpent,
    leads,
  });
}
