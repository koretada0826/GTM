"use client";

// このファイルは「レイアウトを含む最上位でエラーが起きたとき」の最終防衛ラインの画面です。
// 通常の error.tsx で受け止められない深いエラーでも、真っ白にせず案内を表示します。
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ja">
      <body style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#f7f5f2", color: "#1a1a1a" }}>
        <div style={{ textAlign: "center", padding: "24px" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>問題が発生しました</h1>
          <p style={{ fontSize: "14px", color: "#4b4b4b", marginBottom: "16px" }}>
            一時的なエラーが発生しました。もう一度お試しください。
          </p>
          <button
            onClick={() => reset()}
            style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "9999px", padding: "12px 24px", fontSize: "14px", cursor: "pointer" }}
          >
            再試行する
          </button>
        </div>
      </body>
    </html>
  );
}
