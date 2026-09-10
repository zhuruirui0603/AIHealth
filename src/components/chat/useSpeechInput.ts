"use client";

/**
 * 语音输入 Hook（Web Speech API）
 *
 * 使用浏览器原生 SpeechRecognition 实现实时语音转文字。
 * 支持 Chrome / Edge，不支持时通过 modal 提示用户。
 */

import { useCallback, useRef, useState } from "react";

export function useSpeechInput(modal: {
  warning: (config: { title: string; content: string }) => void;
}) {
  const [recording, setRecording] = useState(false);
  const speechRef = useRef<any>(null);

  const toggleRecording = useCallback(
    (onResult: (text: string) => void) => {
      if (recording) {
        speechRef.current?.stop();
        return;
      }
      const SR =
        (typeof window !== "undefined" &&
          ((window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition)) ||
        null;
      if (!SR) {
        modal.warning({
          title: "暂不支持语音输入",
          content: "当前浏览器不支持 Web Speech API，请使用 Chrome 或 Edge 浏览器。",
        });
        return;
      }
      const rec = new SR();
      rec.lang = "zh-CN";
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = "";
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t;
          else interim += t;
        }
        onResult(finalText + interim);
      };
      rec.onerror = () => setRecording(false);
      rec.onend = () => setRecording(false);
      rec.start();
      speechRef.current = rec;
      setRecording(true);
    },
    [recording, modal],
  );

  return { recording, toggleRecording };
}
