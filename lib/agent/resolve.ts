// 名寄せ（エンティティ・レゾリューション）＝重複した候補を1社にまとめる処理。
//
// このファイルの役割：
//   複数のコネクタが返した「候補」には、同じ会社がダブって含まれる。
//   それらを1社に統合し、各項目は“最も良い値”を採用、出典は全部まとめて残す。
//   ＝「リスト元の最適化」。取りこぼしを減らしつつ、重複を除いてキレイな1件にする。

import { id } from "@/lib/data/store";
import type { Lead, LeadSource } from "@/lib/domain/types";
import type { LeadCandidate } from "@/lib/connectors/types";

// ---- 正規化（表記ゆれを吸収して同一判定しやすくする）----
// ドメインを小文字化し www. や先頭のプロトコルを除去
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}
// 電話番号は数字だけにして比較（ハイフンや+の違いを吸収）
export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 8 ? digits : undefined;
}

// 候補の集合を、同一ドメインごとに1社へ統合する。
export function resolveCandidates(
  candidates: LeadCandidate[],
  workspaceId: string,
  jobId: string
): Lead[] {
  // ドメイン正規化をキーにグループ化
  const groups = new Map<string, LeadCandidate[]>();
  for (const c of candidates) {
    const key = normalizeDomain(c.domain);
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  const leads: Lead[] = [];
  for (const [, group] of groups) {
    // fitScore の高い候補を主（ベース）にする
    group.sort((a, b) => b.fitScore - a.fitScore);
    const primary = group[0];

    // 各項目は「最初に見つかった空でない値」を採用（＝最良値の採用）
    const firstDefined = <T>(getter: (c: LeadCandidate) => T | undefined): T | undefined => {
      for (const c of group) {
        const v = getter(c);
        if (v !== undefined && v !== "" && v !== null) return v;
      }
      return undefined;
    };

    // 出典は全コネクタ分をまとめる（同じコネクタは1つに）
    const sources: LeadSource[] = [];
    const seenSrc = new Set<string>();
    for (const c of group) {
      if (!seenSrc.has(c.source.connectorId)) {
        seenSrc.add(c.source.connectorId);
        sources.push(c.source);
      }
    }

    // シグナルは全候補の和集合（重複除去）
    const signalSet = new Set<string>();
    group.forEach((c) => c.signals.forEach((s) => signalSet.add(s)));

    // enrichment（補強情報）は全候補をマージ
    const enrichment: Record<string, string> = {};
    group.forEach((c) => Object.assign(enrichment, c.enrichment));

    leads.push({
      id: id("lead"),
      workspaceId,
      jobId,
      companyName: primary.companyName,
      domain: normalizeDomain(primary.domain),
      email: firstDefined((c) => c.email),
      phone: firstDefined((c) => c.phone),
      address: firstDefined((c) => c.address),
      location: primary.location,
      industry: primary.industry,
      category: primary.category,
      size: firstDefined((c) => c.size),
      headcount: firstDefined((c) => c.headcount),
      funding: firstDefined((c) => c.funding),
      signals: [...signalSet],
      buyingSignal: firstDefined((c) => c.buyingSignal),
      enrichment,
      // 複数ソースで裏取りできた会社は少しだけ加点（最大+4）＝出典が多いほど確度UP
      fitScore: Math.min(99, primary.fitScore + Math.min(4, sources.length - 1)),
      confidence: 0, // 検証後に確定
      verifications: [],
      sources,
      status: "new",
      fetchedAt: Math.max(...group.map((c) => c.fetchedAt)),
      createdAt: Date.now(),
    });
  }

  // 適合スコア順に並べる
  return leads.sort((a, b) => b.fitScore - a.fitScore);
}
