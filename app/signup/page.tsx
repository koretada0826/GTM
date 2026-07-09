// この画面は「新規登録ページ」です。名前とメールアドレスを入力してアカウントを作ります。
// 見た目はログインページと共通の AuthShell 部品を使い、表示する文言だけを登録用に差し替えています。

import { AuthShell } from "@/app/login/page";

// /signup を開いたときに表示される中身。共通部品に登録用の文言を渡している（showName で名前欄を表示）。
export default function SignupPage() {
  return (
    <AuthShell
      title="無料ではじめる"
      subtitle="1,000 クレジット付き。クレジットカード不要。"
      cta="無料で登録"
      alt={{ text: "すでにアカウントがある場合", href: "/login", label: "ログイン" }}
      showName
    />
  );
}
