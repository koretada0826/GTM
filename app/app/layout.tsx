// このファイルはログイン後の「アプリ画面」全体の土台（レイアウト）です。
// アプリ内のどのページを開いても、まずここでログイン状態を確認します。
// ※このファイルはサーバー側で動く部品（表示前にログイン確認を行うため）。

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

// children = この土台の中に差し込まれる各アプリページの中身。
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser(); // 今ログインしている人を調べる。
  if (!user) redirect("/login"); // 未ログインならログイン画面へ追い返す。
  return <div className="min-h-screen bg-cream">{children}</div>;
}
