// この画面はアプリの入口（/app）です。画面そのものは表示せず、行き先を振り分けるだけの「交通整理」役です。
// ログイン確認をして、作業スペース（ワークスペース）が無ければ1つ自動で作り、
// 最初の作業スペースの画面へ自動的に移動させます。
// ※このファイルはサーバー側で動く部品。

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listWorkspaces, createWorkspace } from "@/lib/data/store";

export default async function AppIndex() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // 未ログインならログイン画面へ。
  let ws = listWorkspaces(user.id); // このユーザーの作業スペース一覧を取得。
  // 1つも無ければ、初回用に作業スペースを自動作成する。
  if (ws.length === 0) {
    createWorkspace(user.id, "マイワークスペース", "JP", "free");
    ws = listWorkspaces(user.id);
  }
  redirect(`/app/w/${ws[0].id}`); // 最初の作業スペースの画面へ移動。
}
