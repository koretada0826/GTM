"use client";

// このファイルは「ページ内で予期せぬエラーが起きたとき」に表示する画面です。
// アプリ全体が真っ白になって固まるのを防ぎ、利用者に分かりやすい案内と再試行ボタンを出します。
// ※内部のエラー詳細（スタックなど）は画面に出さず、汎用メッセージのみ表示します。
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <h1 className="font-serif-display text-3xl text-ink">問題が発生しました</h1>
      <p className="max-w-md text-sm text-ink-soft">
        一時的なエラーが発生しました。お手数ですが、もう一度お試しください。
      </p>
      <button
        onClick={() => reset()}
        className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white"
      >
        再試行する
      </button>
    </div>
  );
}
