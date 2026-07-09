// この画面は「ログインページ」です。メールアドレスを入力してログインします（デモではパスワード不要）。
// 見た目の本体は下の AuthShell という共通部品で、ログインと新規登録の両ページで使い回しています。
// ※このファイルはサーバー側で表示を作る部品。フォーム送信は loginAction（サーバーアクション）が処理します。

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { loginAction } from "@/app/actions/auth";

// /login を開いたときに表示される中身。共通部品にログイン用の文言を渡している。
export default function LoginPage() {
  return (
    <AuthShell
      title="おかえりなさい"
      subtitle="メールアドレスでログイン（デモではパスワード不要）"
      cta="ログイン"
      alt={{ text: "アカウントがない場合", href: "/signup", label: "無料で登録" }}
      showName={false}
    />
  );
}

// ログイン画面と新規登録画面で共通に使う見た目の部品。
// title=大見出し、subtitle=説明文、cta=送信ボタンの文字、
// alt=もう一方の画面への案内リンク、showName=名前入力欄を出すかどうか。
export function AuthShell({
  title,
  subtitle,
  cta,
  alt,
  showName,
}: {
  title: string;
  subtitle: string;
  cta: string;
  alt: { text: string; href: string; label: string };
  showName: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm">
          <h1 className="font-serif-display text-3xl text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
          {/* 送信するとサーバーの loginAction が呼ばれてログイン処理が走る */}
          <form action={loginAction} className="mt-8 space-y-4">
            {/* 新規登録のときだけ名前入力欄を表示 */}
            {showName && (
              <div>
                <label className="mb-1 block text-sm text-ink-soft">お名前</label>
                <input
                  name="name"
                  type="text"
                  placeholder="山田 太郎"
                  className="w-full rounded-xl border border-line-strong bg-paper px-4 py-3 text-sm outline-none focus:border-brand"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm text-ink-soft">メールアドレス</label>
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="w-full rounded-xl border border-line-strong bg-paper px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {cta}
            </button>
          </form>
          {/* もう一方の画面（ログイン⇔新規登録）への案内リンク */}
          <p className="mt-6 text-center text-sm text-muted">
            {alt.text}は{" "}
            <Link href={alt.href} className="font-medium text-brand hover:underline">
              {alt.label}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
