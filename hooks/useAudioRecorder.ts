'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  elapsedMs: number;
  error: string | null;
}

export function useAudioRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    elapsedMs: 0,
    error: null,
  });

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setState((current) => ({
        ...current,
        error: 'Audio recording is not supported by this browser.',
      }));
      return;
    }

    try {
      setState({
        isRecording: false,
        elapsedMs: 0,
        error: null,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ];

      const mimeType =
        mimeCandidates.find((value) =>
          MediaRecorder.isTypeSupported(value),
        ) || '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();

      recorderRef.current = recorder;
      streamRef.current = stream;

      timerRef.current = window.setInterval(() => {
        const startTime = startTimeRef.current ?? Date.now();

        setState((current) => ({
          ...current,
          elapsedMs: Date.now() - startTime,
        }));
      }, 250);

      setState({
        isRecording: true,
        elapsedMs: 0,
        error: null,
      });
    } catch (error) {
      stopTracks();
      clearTimer();

      setState({
        isRecording: false,
        elapsedMs: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to start microphone recording.',
      });
    }
  }, [clearTimer, stopTracks]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;

      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        clearTimer();
        stopTracks();

        const mimeType =
          recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm';

        const blob = new Blob(chunksRef.current, {
          type: mimeType,
        });

        recorderRef.current = null;
        chunksRef.current = [];
        startTimeRef.current = null;

        setState({
          isRecording: false,
          elapsedMs: 0,
          error: null,
        });

        resolve(blob);
      };

      recorder.stop();
    });
  }, [clearTimer, stopTracks]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;

    clearTimer();

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    recorderRef.current = null;
    chunksRef.current = [];
    startTimeRef.current = null;

    stopTracks();

    setState({
      isRecording: false,
      elapsedMs: 0,
      error: null,
    });
  }, [clearTimer, stopTracks]);

  useEffect(() => {
    return () => {
      clearTimer();
      recorderRef.current?.stop();
      stopTracks();
    };
  }, [clearTimer, stopTracks]);

  return {
    ...state,
    start,
    stop,
    cancel,
  };
}
