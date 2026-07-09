// モックの「企業プール」生成器。
//
// このファイルの役割：
//   検索プランに対して、決定的（同じ条件なら毎回同じ）に“真の企業一覧”を作ります。
//   各コネクタは、このプールから自分が見つけられる企業だけを部分的に返します。
//   → 複数コネクタで重複が生まれ、後段の「名寄せ（統合）」の効果が分かるようになります。
//   実データ源に差し替える前の代役（MOCK）です。

import type { StructuredICP } from "@/lib/domain/types";

// プール内の1企業（“真の”フル情報）。
export interface PoolCompany {
  idx: number;
  companyName: string;
  domain: string;
  city: string;
  headcount: number;
  size: string;
  email: string;
  phone: string;
  funding: string;
  buyingSignal: string;
  techStack: string;
  fitScore: number;
}

// ---- 決定的乱数（seed から。毎回同じ結果にするため Math.random は使わない）----
function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const JP_PREFIX = ["株式会社", "有限会社", "合同会社", "", "", ""];
const JP_CORE = ["サンライズ", "みらい", "つなぐ", "青葉", "大和", "こだま", "光和", "アオゾラ", "ヒカリ", "結", "山本", "田中", "さくら", "宮本", "北斗", "陽和", "翔", "しらかば", "森本", "松風"];
const JP_SUFFIX = ["工業", "商事", "製作所", "システムズ", "クリニック", "歯科", "デンタル", "建設", "サービス", "テック", "メディカル", "興業", "物流", "食品"];
const JP_CITY = ["東京都渋谷区", "東京都新宿区", "大阪市北区", "名古屋市中区", "福岡市博多区", "横浜市西区", "札幌市中央区", "京都市下京区", "神戸市中央区", "仙台市青葉区"];
const GLOBAL_CORE = ["Northwind", "Brightline", "Cedar", "Vertex", "Harbor", "Lumen", "Quill", "Summit", "Meridian", "Atlas", "Ironwood", "Beacon", "Copper", "Delta", "Everest", "Foundry", "Granite", "Halcyon", "Juniper", "Kestrel"];
const GLOBAL_SUFFIX = ["Labs", "Health", "Systems", "Dental", "Group", "Works", "Tech", "Digital", "Partners", "HVAC", "Clinic", "Logistics", "Foods", "Solutions"];
const GLOBAL_CITY = ["Austin, TX", "Miami, FL", "Denver, CO", "Seattle, WA", "Chicago, IL", "Boston, MA", "Atlanta, GA", "Phoenix, AZ", "Portland, OR", "Nashville, TN"];
const FUNDING = ["—", "Seed", "Series A $8M", "Series B $30M", "Series A ¥5億", "Bootstrapped", "Series C $80M"];

function domainFrom(name: string, i: number): string {
  const ascii = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12);
  const base = ascii.length >= 3 ? ascii : `company${i}`;
  return `${base}${i}.example.com`;
}

function buyingSignalFor(icp: StructuredICP, rng: () => number): string {
  const jp = icp.market === "JP";
  const pool = icp.signals.length
    ? icp.signals
    : jp
      ? ["採用強化中", "新規開業", "広告出稿中"]
      : ["Hiring SDRs", "Recently funded", "Running ads"];
  const s = pick(rng, pool);
  const extra = jp ? ["（今月）", "（3名募集）", "（拠点拡大）", ""] : [" (this month)", " (3 roles)", " (new location)", ""];
  return `${s}${pick(rng, extra)}`;
}

// 検索プランに対する“真の企業プール”を決定的に生成する。
export function generateCompanyPool(icp: StructuredICP, planId: string, size: number): PoolCompany[] {
  const jp = icp.market === "JP";
  const rng = mulberry32(seedFrom(planId + icp.industry + icp.location + size));
  const out: PoolCompany[] = [];
  for (let i = 0; i < size; i++) {
    const name = jp
      ? `${pick(rng, JP_PREFIX)}${pick(rng, JP_CORE)}${pick(rng, JP_SUFFIX)}`
      : `${pick(rng, GLOBAL_CORE)} ${pick(rng, GLOBAL_SUFFIX)}`;
    const domain = domainFrom(name, i + 1);
    const city = jp ? pick(rng, JP_CITY) : pick(rng, GLOBAL_CITY);
    const headcount = 5 + Math.floor(rng() * 480);
    const base = 98 - Math.floor((i / Math.max(size, 1)) * 42);
    const fitScore = Math.max(52, Math.min(99, base + Math.floor(rng() * 6 - 3)));
    const emailUser = jp ? "info" : pick(rng, ["hello", "info", "sales", "contact"]);
    const phone = jp
      ? `0${3 + Math.floor(rng() * 6)}-${1000 + Math.floor(rng() * 8999)}-${1000 + Math.floor(rng() * 8999)}`
      : `+1 ${200 + Math.floor(rng() * 799)}-${100 + Math.floor(rng() * 899)}-${1000 + Math.floor(rng() * 8999)}`;
    out.push({
      idx: i,
      companyName: name,
      domain,
      city,
      headcount,
      size: headcount < 20 ? "1-20" : headcount < 100 ? "20-100" : "100-500",
      email: `${emailUser}@${domain}`,
      phone,
      funding: pick(rng, FUNDING),
      buyingSignal: buyingSignalFor(icp, rng),
      techStack: jp ? pick(rng, ["予約システム", "ECカート", "MAツール", "—"]) : pick(rng, ["Shopify", "HubSpot", "Segment", "—"]),
      fitScore,
    });
  }
  return out.sort((a, b) => b.fitScore - a.fitScore);
}

// 会社名やドメインから安定した0..1の値を作る（コネクタごとの担当割り振りに使う）
export function stableFraction(key: string): number {
  return seedFrom(key) / 4294967296;
}
