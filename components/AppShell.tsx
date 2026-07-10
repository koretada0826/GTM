/**
 * AppShell（アプリ全体の共通の枠）
 * この部品は、ログイン後のアプリ画面の「外枠」を作ります。左端に画面切り替え用の縦メニュー、
 * 上部にワークスペース名やクレジット残高を表示するヘッダーを置き、
 * その中央（children）に各ページの中身をはめ込みます。すべての画面で共通のガワです。
 */

import Link from "next/link"; // ページ間を移動するためのリンク部品（Next.js）
import { Logo } from "./Logo"; // 自作のロゴ部品（左上や上部ヘッダーに表示）
import { logoutAction } from "@/app/actions/auth"; // ログアウト処理（サーバー側で実行される）
import type { Workspace } from "@/lib/domain/types"; // ワークスペース情報の「型（決まった形）」の定義

// 左端の縦メニュー（レール）の項目一覧。href=リンク先 / label=名前 / icon=アイコンの図形データ
const RAIL = [
  { href: "", label: "検索", icon: "M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" },
  { href: "/leads", label: "リスト", icon: "M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h10v2H4v-2Z" },
  { href: "/api-keys", label: "API", icon: "M7 14a5 5 0 1 1 4.9-6H21v4h-2v3h-3v-3h-1.1A5 5 0 0 1 7 14Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
  { href: "/billing", label: "課金", icon: "M3 6h18v12H3V6Zm2 2v2h14V8H5Zm0 4v4h14v-4H5Z" },
];

// workspace=対象のワークスペース情報 / balance=クレジット残高 / active=今開いているメニュー / children=中央に表示する各ページの中身
export function AppShell({
  workspace,
  balance,
  active = "",
  children,
}: {
  workspace: Workspace;
  balance: number;
  active?: string;
  children: React.ReactNode;
}) {
  const base = `/app/w/${workspace.id}`; // 各リンクの共通の先頭部分（このワークスペース用のURL）
  return (
    // 一番外側の枠。スマホ＝縦積み(flex-col)、PC(md以上)＝左メニュー＋右本体の横並び(flex-row)。高さは画面いっぱい。
    <div className="flex h-screen flex-col overflow-hidden bg-cream md:flex-row">
      {/* left rail（左端の縦メニュー）。スマホでは隠し、PC(md以上)でだけ表示する。代わりにスマホは下部タブバー。 */}
      <aside className="hidden w-20 flex-col items-center gap-1 border-r border-line bg-cream-100/60 py-3 md:flex">
        {/* 一番上のロゴマーク。クリックするとアプリのトップへ戻る */}
        <div className="mb-2">
          <Link href="/app" className="inline-flex h-8 w-8 items-center justify-center">
            {/* ロゴ図形（4枚の三角形を組み合わせた折り紙風マーク）をSVGで描く */}
            <svg viewBox="0 0 32 32" className="h-7 w-7">
              <path d="M16 3 L29 16 L16 12 Z" fill="#ff2e93" />
              <path d="M16 3 L3 16 L16 12 Z" fill="#ff77b8" />
              <path d="M16 12 L29 16 L16 29 Z" fill="#ff2e93" opacity="0.85" />
              <path d="M16 12 L3 16 L16 29 Z" fill="#ffa6cf" />
            </svg>
          </Link>
        </div>
        {/* メニュー項目の一覧を1つずつ取り出し、それぞれをボタンとして並べる */}
        {RAIL.map((r) => {
          // この項目が今開いている画面かどうか（href が空なら「検索」画面とみなす）
          const isActive = active === (r.href || "search");
          return (
            // メニュー1個ぶんのリンク。押すとその画面へ移動する。
            <Link
              key={r.label} // 各項目を見分けるための目印。
              href={base + r.href} // 飛び先URL（共通の先頭＋各項目のパス）。
              title={r.label} // マウスを乗せたときに出る説明文。
              // 今開いている画面なら白く目立たせ、そうでなければ控えめ色にする。
              // アイコンと文字ラベルを縦並び（flex-col）にして、何のボタンか一目で分かるようにする。
              className={`flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                isActive ? "bg-paper text-ink shadow-sm" : "text-muted hover:bg-paper/60 hover:text-ink"
              }`}
            >
              {/* この項目のアイコン図形を描く */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d={r.icon} />
              </svg>
              {/* アイコンの下に表示する日本語ラベル（検索／リスト／API／課金） */}
              <span className="text-[10px] leading-none">{r.label}</span>
            </Link>
          );
        })}
        {/* 一番下に配置するログアウトボタン。押すと logoutAction が実行される */}
        <form action={logoutAction} className="mt-auto">
          <button
            title="ログアウト"
            className="flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-xl text-muted hover:bg-paper/60 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M10 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7v-2h7V5h-7V3Zm-.6 5L6 11.4H14v1.2H6L9.4 16 8 17.4 2.6 12 8 6.6 9.4 8Z" />
            </svg>
            {/* アイコンの下に表示する日本語ラベル */}
            <span className="text-[10px] leading-none">ログアウト</span>
          </button>
        </form>
      </aside>

      {/* main（メニューの右側。上部ヘッダーとページ本体） */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* 上部ヘッダー: 左にロゴとワークスペース名、右にクレジット残高を表示 */}
        {/* スマホは余白・文字を詰めて崩れないようにする（gap-2 / px-3、狭い画面では一部を隠す）*/}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-cream/80 px-3 backdrop-blur sm:px-5">
          {/* ヘッダー左側：ロゴ → 区切りの「/」→ ワークスペース名 → 市場ラベル */}
          {/* ロゴをクリックすると公開トップページ("/")へ戻れる（宣伝ページ・料金などを見に行ける） */}
          {/* min-w-0＝縮小を許可（長い名前でヘッダーが崩れないように）。名前と区切りは狭い画面では隠す。*/}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Logo href="/" />
            <span className="hidden text-muted sm:inline">/</span>
            {/* ワークスペース名：長い場合は…で省略。狭い画面(sm未満)では非表示にして崩れを防ぐ */}
            <span className="hidden truncate text-sm text-ink sm:inline">{workspace.name}</span>
            {/* この作業スペースの対象市場を示す小さな丸バッジ（常に表示・縮まない） */}
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
              {workspace.market}
            </span>
          </div>
          {/* クレジット残高の表示。クリックすると課金ページへ移動する。狭い画面では「クレジット」の文字を省く */}
          <Link
            href={base + "/billing"}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-paper px-3 py-1.5 text-sm"
          >
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="tabular-nums font-medium text-ink">{balance.toLocaleString()}</span>
            <span className="hidden text-muted sm:inline">クレジット</span>
          </Link>
        </header>
        {/* ページ本体。ここに各画面の中身（children）がはめ込まれて表示される */}
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      {/* mobile bottom nav（スマホ専用の下部タブバー）。PC(md以上)では隠す。 */}
      {/* 左の縦メニューの代わり。画面下に横並びのタブとして検索/リスト/API/課金/ログアウトを置く。 */}
      <nav className="flex shrink-0 items-stretch justify-around border-t border-line bg-cream-100/90 backdrop-blur md:hidden">
        {RAIL.map((r) => {
          const isActive = active === (r.href || "search"); // 今開いている画面かどうか
          return (
            <Link
              key={r.label}
              href={base + r.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                isActive ? "text-brand" : "text-muted"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d={r.icon} />
              </svg>
              <span className="text-[10px] leading-none">{r.label}</span>
            </Link>
          );
        })}
        {/* ログアウトも下部タブの1つとして配置 */}
        <form action={logoutAction} className="flex flex-1">
          <button className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-muted">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M10 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7v-2h7V5h-7V3Zm-.6 5L6 11.4H14v1.2H6L9.4 16 8 17.4 2.6 12 8 6.6 9.4 8Z" />
            </svg>
            <span className="text-[10px] leading-none">ログアウト</span>
          </button>
        </form>
      </nav>
    </div>
  );
}
