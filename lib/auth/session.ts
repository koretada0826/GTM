// モック認証：cookie にユーザーIDを保持するだけの簡易セッション。
// 外部キー不要で動く。最終フェーズで Supabase Auth に差し替え（設計書04）。
//
// このファイルの役割：ログイン状態の管理（ログイン・ログアウト・今のログインユーザーの取得）です。
// cookie（クッキー）＝ブラウザに保存される小さなデータ。ここではユーザーIDを覚えさせておき、
// 次のアクセス時に「誰がログイン中か」を思い出すために使います。
// モック認証＝本格的な認証の代わりに使う簡易版。将来 Supabase Auth（認証サービス）に置き換え予定。

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { createUser, getUser, listWorkspaces, createWorkspace } from "@/lib/data/store";
import type { User } from "@/lib/domain/types";

// cookie に保存するときの名前（キー）。この名前で保存・取得する。
const COOKIE = "gtm_session";

// 署名に使う秘密鍵。改ざん防止の要。
// 本番では必ず環境変数 AUTH_SECRET を設定する（未設定なら開発用の固定値でフォールバック）。
const SECRET = process.env.AUTH_SECRET || "gtm-dev-insecure-secret-change-me";

// ---- 署名付きトークンの仕組み（cookie の偽装を防ぐ）----
// 以前は cookie に「userId をそのまま」保存していたため、値を書き換えれば他人になりすませた。
// そこで「userId + その HMAC 署名」をセットで保存し、読み取り時に署名を検証する。
// 署名は SECRET を知らないと作れないので、値を書き換えると検証に失敗し、なりすませない。

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

// userId から「userId.署名」というトークンを作る
function createToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

// トークンを検証し、正しければ userId を、改ざんされていれば null を返す
function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = sign(userId);
  // 署名の比較はタイミング攻撃を避けるため timingSafeEqual を使う
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

// 今ログインしているユーザーを返す。ログインしていなければ null。
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies(); // cookie を扱う入れ物を取得
  const token = store.get(COOKIE)?.value; // 保存された署名付きトークンを読み出す
  const uid = verifyToken(token); // 署名を検証して userId を取り出す（改ざんなら null）
  if (!uid) return null; // トークンが無効なら未ログイン扱い
  return getUser(uid) ?? null; // IDからユーザー情報を探して返す
}

// ログイン処理。メール（と任意で名前）を受け取り、ユーザーを用意して署名付き cookie に記録する。
export async function signIn(email: string, name?: string): Promise<User> {
  // ユーザーを作成（名前が無ければメールの@より前を仮の名前にする）
  const user = createUser(email, name || email.split("@")[0]);
  // 初回ログイン時にデフォルトワークスペースを用意
  if (listWorkspaces(user.id).length === 0) {
    createWorkspace(user.id, "マイワークスペース", "JP", "free");
  }
  const store = await cookies();
  store.set(COOKIE, createToken(user.id), { // 「userId.署名」を cookie に保存
    httpOnly: true, // JavaScriptから読めないようにする（盗み見・XSS対策）
    sameSite: "lax", // 別サイトからの不正な送信をある程度防ぐ設定
    secure: process.env.NODE_ENV === "production", // 本番はHTTPS通信のみ送信
    path: "/", // サイト全体で有効
    maxAge: 60 * 60 * 24 * 30, // 有効期限30日（秒数で指定）
  });
  return user;
}

// ログアウト処理。保存していたセッション cookie を削除する。
export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
