// この部品は「タイピング演出」です。渡された文字列を、人がキーボードで打っているように
// 1文字ずつ表示します。画面にその部分が見えたタイミングで1回だけ再生します。
// ※「"use client"」= ブラウザ側で動く部品（スクロール検知やアニメーションのため）。
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * 画面内に入ったら、テキストを1文字ずつ「PCで入力しているように」表示する。
 * 1回だけ再生（ループしない）。reduced motion では全文を静的表示。
 */
// 利用者が「動きを減らす」設定（reduced motion）にしているかを調べる小さな関数。
// true のときはアニメーションをやめて、文章を最初から全部表示する。
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

// 句読点や感嘆符などの「区切り文字」を見分けるためのパターン。
// これらの直後は少し長く止めて、人が打っているような間（ま）を作る。
const PUNCT = /[、。，．,.！？!?]/;

// text = 表示したい文章、className = 見た目の指定、
// startDelay = 表示を始めるまでの待ち時間、speed = 1文字ごとの間隔（小さいほど速い）。
export function TypingReveal({
  text,
  className = "",
  startDelay = 0,
  speed = 30,
}: {
  text: string;
  className?: string;
  startDelay?: number;
  speed?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null); // 表示場所を指す目印。
  const [inView, setInView] = useState(false); // その部分が画面に見えているか。
  const reduced = useReducedMotion(); // 動きを減らす設定かどうか。
  const [shown, setShown] = useState(""); // 今まさに表示している途中の文字列。
  const [done, setDone] = useState(false); // 全部打ち終わったか。

  // ここは「その部分が画面に見えたか」を監視する処理。
  // IntersectionObserver = 要素が画面内に入ったことを教えてくれるブラウザの仕組み。
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          ob.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [inView]);

  // 「画面に見えていて」かつ「動きを減らす設定でない」ときだけアニメーションを実行する。
  const enabled = inView && !reduced;

  // ここが「1文字ずつ増やしていく」本体の処理。
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false; // 途中で中断されたかの目印。
    const timers: ReturnType<typeof setTimeout>[] = []; // 予約したタイマーの控え（後片付け用）。
    let i = 0; // 何文字目まで表示したか。
    // step を呼ぶたびに1文字進め、次の文字を少し後に予約する（この繰り返しで少しずつ増える）。
    const step = () => {
      if (cancelled) return;
      i += 1;
      setShown(text.slice(0, i)); // 先頭から i 文字目までを表示。
      if (i >= text.length) {
        setDone(true); // 最後まで来たら「完了」にして終了。
        return;
      }
      // 直前の文字が区切り文字なら長めに（120ミリ秒）、それ以外は speed に少し揺らぎを足して待つ。
      const ch = text[i - 1];
      const t = setTimeout(step, PUNCT.test(ch) ? 120 : speed + Math.random() * 18);
      timers.push(t);
    };
    // startDelay ぶん待ってから最初の1文字を表示し始める。
    const t0 = setTimeout(step, startDelay);
    timers.push(t0);
    // 部品が消えたり作り直されるときは、中断して予約したタイマーを全部片付ける。
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [enabled, text, speed, startDelay]);

  // 動きを減らす設定なら全文、そうでなければ途中まで表示している文字列を使う。
  const visible = reduced ? text : shown;

  return (
    <span ref={ref} className={className}>
      {/* 実際に見える部分。打っている途中の文字列を表示する */}
      <span aria-hidden="true">
        {visible}
        {/* 打っている最中だけ、点滅するカーソル（縦棒）を末尾に表示する */}
        {enabled && !done && (
          <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-caret bg-ink-soft align-baseline" />
        )}
      </span>
      {/* 読み上げソフト用に全文を隠して置いておく（sr-only = 目には見えない） */}
      <span className="sr-only">{text}</span>
    </span>
  );
}
