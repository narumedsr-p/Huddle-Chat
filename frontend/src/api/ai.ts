import { apiFetch } from "./client";

export function speechToText(audio: Blob): Promise<{ text: string }> {
  const body = new FormData();
  body.append("audio", audio);
  return apiFetch<{ text: string }>("/ai/speech-to-text", { method: "POST", body });
}
