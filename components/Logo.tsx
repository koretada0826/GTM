import Link from "next/link";

// この部品はサービスの「ロゴ」です。ピンクの図形マークと「GTM」という文字を並べ、
// クリックすると指定した場所（既定はトップページ）へ移動するリンクになっています。
// GTM ロゴ（origami の hummingbird 相当のピンクのマーク + セリフのワードマーク）
// ※ href = 飛び先。light = true にすると文字色を白にする（暗い背景用）。
export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      {/* 図形のマーク部分（SVGという図形描画の仕組みで4枚の三角形を組み合わせている） */}
      <span className="inline-flex h-7 w-7 items-center justify-center">
        <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
          {/* 折り紙風の鶴を想起させる幾何マーク */}
          <path d="M16 3 L29 16 L16 12 Z" fill="#ff2e93" />
          <path d="M16 3 L3 16 L16 12 Z" fill="#ff77b8" />
          <path d="M16 12 L29 16 L16 29 Z" fill="#ff2e93" opacity="0.85" />
          <path d="M16 12 L3 16 L16 29 Z" fill="#ffa6cf" />
        </svg>
      </span>
      {/* 文字部分（ワードマーク）。light の指定に応じて白 or 濃い色で表示 */}
      <span
        className={`font-serif-display text-[22px] leading-none ${
          light ? "text-white" : "text-ink"
        }`}
      >
        GTM
      </span>
    </Link>
  );
}
