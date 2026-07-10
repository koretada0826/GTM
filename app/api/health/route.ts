import { NextResponse } from "next/server";

// このAPI（GET /api/health）は「サーバーが生きているか」を確認する窓口です。
// ロードバランサや監視ツールが定期的に叩き、応答が返れば正常と判断します。
export async function GET() {
  return NextResponse.json({ status: "ok", time: Date.now() });
}
