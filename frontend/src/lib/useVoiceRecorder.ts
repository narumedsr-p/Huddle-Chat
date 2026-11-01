import { useEffect, useRef, useState } from "react";

function releaseMic(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export function useVoiceRecorder(onRecorded: (audio: Blob) => void) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const onRecordedRef = useRef(onRecorded);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (!recorder) return;
      recorder.onstop = null;
      releaseMic(recorder.stream);
    };
  }, []);

  async function start() {
    if (startingRef.current || recorderRef.current) return;
    startingRef.current = true;

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        releaseMic(stream);
        return;
      }

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      recorder.onstop = () => {
        releaseMic(recorder.stream);
        recorderRef.current = null;
        setRecording(false);
        onRecordedRef.current(new Blob(chunks, { type: recorder.mimeType }));
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      if (stream) releaseMic(stream);
      console.error(err);
    } finally {
      startingRef.current = false;
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return { recording, start, stop };
}
