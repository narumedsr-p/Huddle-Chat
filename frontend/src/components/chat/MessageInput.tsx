import { Loader2, Mic, Send } from "lucide-react";
import { useRef, useState } from "react";
import { api, ApiError } from "../../api";
import { useVoiceRecorder } from "../../lib/useVoiceRecorder";
import { Button } from "../ui/Button";

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping?: (typing: boolean) => void;
}

const TYPING_REPORT_THROTTLE_MS = 3000;

function microphoneError(err: unknown) {
  if (err instanceof DOMException && err.name === "NotAllowedError") {
    return "Microphone access was denied.";
  }
  if (err instanceof DOMException && err.name === "NotFoundError") {
    return "No microphone was found.";
  }
  return "Couldn't start recording.";
}

export function MessageInput({ onSend, onTyping }: MessageInputProps) {
  const [text, setText] = useState("");
  const lastTypingSentAt = useRef(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const { recording, start, stop } = useVoiceRecorder(async (audio) => {
    setTranscribing(true);
    try {
      const { text: spoken } = await api.speechToText(audio);
      if (!spoken) {
        setVoiceError("No speech was detected.");
        return;
      }
      setText((current) => (current.trim() ? `${current.trimEnd()} ${spoken}` : spoken));
      reportTyping(true);
    } catch (err) {
      setVoiceError(err instanceof ApiError ? err.message : "Couldn't transcribe the recording.");
    } finally {
      setTranscribing(false);
    }
  });

  async function startRecording() {
    setVoiceError(null);
    try {
      await start();
    } catch (err) {
      setVoiceError(microphoneError(err));
    }
  }

  function reportTyping(isTyping: boolean) {
    if (!onTyping) return;
    if (!isTyping) {
      lastTypingSentAt.current = 0;
      onTyping(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingSentAt.current < TYPING_REPORT_THROTTLE_MS) return;
    lastTypingSentAt.current = now;
    onTyping(true);
  }

  function submit() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
    reportTyping(false);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-brown-100 bg-white/70 px-4 py-3">
      {voiceError && (
        <p role="alert" className="w-full text-xs font-medium text-red-500">
          {voiceError}
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          setVoiceError(null);
          reportTyping(next.trim().length > 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={
          recording ? "Listening…" : transcribing ? "Transcribing…" : "Type a message…"
        }
        rows={1}
        className="h-11 max-h-32 flex-1 resize-none rounded-2xl border border-brown-100 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brown-500 focus:ring-2 focus:ring-brown-300/50"
      />
      <Button
        type="button"
        variant={recording ? "danger" : "secondary"}
        onClick={recording ? stop : startRecording}
        disabled={transcribing}
        aria-label={recording ? "Stop voice input" : "Voice input"}
        aria-pressed={recording}
        title="Voice input"
        className="h-11 shrink-0"
      >
        {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button
        onClick={submit}
        disabled={!text.trim()}
        aria-label="Send message"
        className="h-11 shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
