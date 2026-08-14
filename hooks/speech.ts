'use client';

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined'
  );
}

export function speakText(text: string): void {
  if (!isSpeechSynthesisSupported()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;

  window.speechSynthesis.cancel();
}
