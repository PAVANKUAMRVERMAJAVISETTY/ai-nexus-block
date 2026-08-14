'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bot,
  Send,
  Wrench,
  Code2,
  GitCompare,
  Map,
  BookOpen,
  Loader2,
  Sparkles,
  User as UserIcon,
  Plus,
  Paperclip,
  Mic,
  Square,
  X,
  Volume2,
  VolumeX,
  FileText,
  Image as ImageIcon,
  Music as MusicIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { defaultAIProvider, type AIProviderId } from '@/config/ai';
import { assistantIdentity } from '@/config/ide';
import { toast } from 'sonner';
import type { AIAttachment } from '@/types/ai';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { speakText, stopSpeaking, isSpeechSynthesisSupported } from '@/hooks/speech';

const modes = [
  { id: 'recommend_stack', label: 'Recommend Stack', icon: Wrench, prompt: 'Suggest a modern tech stack for a real-time web application.' },
  { id: 'debug_problem', label: 'Debug Code', icon: Code2, prompt: 'How do I fix memory leaks and unhandled promise rejections in Node.js?' },
  { id: 'compare_tools', label: 'Compare Tools', icon: GitCompare, prompt: 'Compare Next.js App Router vs Vite React SPA for SaaS platforms.' },
  { id: 'plan_project', label: 'Plan Project', icon: Map, prompt: 'Create an architectural roadmap for building an AI knowledge base.' },
  { id: 'learn_concept', label: 'Learn Concept', icon: BookOpen, prompt: 'Explain Supabase SSR auth and Row Level Security policies with code examples.' },
] as const;

type ModeId = typeof modes[number]['id'];

interface PendingAttachment {
  file: File;
  previewUrl?: string;
}

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: AIAttachment[];
}

const ACCEPTED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'audio/webm',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/m4a',
];

export default function AssistantPage() {
  const { profile, user } = useAuth();
  const searchParams = useSearchParams();
  const queryConvId = searchParams.get('id');

  const [selectedMode, setSelectedMode] = useState<ModeId>('recommend_stack');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(defaultAIProvider);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Phase 10 Multimodal & Voice States
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup object URLs and speech on unmount
  useEffect(() => {
    return () => {
      pendingAttachments.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      stopSpeaking();
    };
  }, []);

  // Toast recording errors if any occur
  useEffect(() => {
    if (recorder.error) {
      toast.error(recorder.error);
    }
  }, [recorder.error]);

  // Restore latest or query-specified active conversation on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      setLoadingInitial(true);
      try {
        let targetId = queryConvId;

        // If no URL ID provided, check for user's most recent conversation
        if (!targetId) {
          const listRes = await fetch('/api/conversations');
          const listData = await listRes.json();
          if (listRes.ok && listData.conversations && listData.conversations.length > 0) {
            targetId = listData.conversations[0].id;
          }
        }

        if (targetId && isMounted) {
          const detailRes = await fetch(`/api/conversations/${targetId}`);
          const detailData = await detailRes.json();
          if (detailRes.ok && detailData.conversation && isMounted) {
            setConversationId(detailData.conversation.id);
            setSelectedMode((detailData.conversation.mode as ModeId) || 'recommend_stack');
            setSelectedProvider((detailData.conversation.provider as AIProviderId) || defaultAIProvider);
            setMessages(
              (detailData.messages || []).map((m: any) => {
                const metadata = m.metadata;
                const attachments =
                  metadata &&
                  typeof metadata === 'object' &&
                  Array.isArray(metadata.attachments)
                    ? metadata.attachments
                    : undefined;

                return {
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  attachments,
                };
              })
            );
          }
        }
      } catch (err) {
        console.warn('Failed to restore AI conversation session:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    if (user) {
      restoreSession();
    } else {
      setLoadingInitial(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user, queryConvId]);

  const handleStartNewSession = () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    pendingAttachments.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setPendingAttachments([]);
    stopSpeaking();
    setSpeakingMessageId(null);
    toast.info('Started a new conversation session.');
  };

  const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles: PendingAttachment[] = [];
    let skippedInvalid = false;

    for (const file of files) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        skippedInvalid = true;
        continue;
      }

      const isImage = file.type.startsWith('image/');
      validFiles.push({
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }

    if (skippedInvalid) {
      toast.error('Unsupported file type.');
    }

    if (pendingAttachments.length + validFiles.length > 5) {
      toast.error('Maximum 5 attachments allowed.');
      const allowedCount = 5 - pendingAttachments.length;
      const truncated = validFiles.slice(0, Math.max(0, allowedCount));
      setPendingAttachments((prev) => [...prev, ...truncated]);
    } else {
      setPendingAttachments((prev) => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || input.trim();
    if (
      (!textToSend && pendingAttachments.length === 0) ||
      loading ||
      uploadingAttachments ||
      transcribing
    ) {
      return;
    }

    let uploadedAttachments: AIAttachment[] = [];

    // Step A: Upload attachments if any exist
    if (pendingAttachments.length > 0) {
      setUploadingAttachments(true);
      try {
        const formData = new FormData();
        if (conversationId) {
          formData.append('conversation_id', conversationId);
        }
        pendingAttachments.forEach((item) => {
          formData.append('file', item.file);
        });

        const uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'File upload failed.');
        }

        uploadedAttachments = uploadData.attachments || [];
      } catch (err: any) {
        toast.error(err.message || 'File upload failed.');
        setUploadingAttachments(false);
        return; // Retain files in pending state so user can retry
      } finally {
        setUploadingAttachments(false);
      }
    }

    // Step B: Add user message locally
    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overridePrompt) setInput('');

    // Clear pending attachments & revoke object URLs
    pendingAttachments.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setPendingAttachments([]);

    setLoading(true);

    // Step C: Send request to /api/ai
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          mode: selectedMode,
          provider: selectedProvider,
          conversation_id: conversationId,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get AI response.');
      }

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while contacting the AI assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (mode: typeof modes[number]) => {
    setSelectedMode(mode.id);
    handleSend(mode.prompt);
  };

  const handleStartRecording = async () => {
    try {
      await recorder.start();
    } catch {
      toast.error('Microphone access was denied.');
    }
  };

  const handleStopRecording = async () => {
    const blob = await recorder.stop();
    if (!blob) return;

    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append(
        'audio',
        new File([blob], 'voice-message.webm', { type: blob.type || 'audio/webm' })
      );

      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Voice transcription failed.');
      }

      if (data.text) {
        setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
      }
    } catch (err: any) {
      toast.error(err.message || 'Voice transcription failed.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleCancelRecording = () => {
    recorder.cancel();
  };

  const handleSpeakMessage = (messageKey: string | number, text: string) => {
    if (!isSpeechSynthesisSupported()) {
      toast.error('Speech synthesis is not supported by this browser.');
      return;
    }

    if (speakingMessageId === messageKey) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      stopSpeaking();
      setSpeakingMessageId(messageKey);
      speakText(text);
    }
  };

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome, ${profile?.display_name || user?.email?.split('@')[0] || 'Developer'}`}
        description="Get AI-powered recommendations, debug code, compare tools, and plan architectural roadmaps."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Mode Selector */}
        <div className="lg:col-span-1 space-y-6">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Assistant Mode
            </label>
            <div className="flex flex-col gap-2">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;
                return (
                  <Button
                    key={mode.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className="justify-start text-xs h-10 px-3"
                    onClick={() => setSelectedMode(mode.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {mode.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="lg:col-span-3">
          <Card className="flex h-[620px] flex-col border-border/40 bg-card">
            <CardHeader className="border-b border-border/40 py-3.5 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">{assistantIdentity.name}</CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Mode: <span className="font-semibold capitalize">{selectedMode.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {conversationId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleStartNewSession}
                    title="Start fresh conversation"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Session
                  </Button>
                )}
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingInitial ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Restoring conversation session...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground px-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                    <Bot className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">What are you building today?</h3>
                  <p className="mt-1 text-xs max-w-md text-muted-foreground">
                    Select a mode on the left or click a starter prompt below to initiate an AI session.
                  </p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
                    {modes.slice(0, 4).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleQuickPrompt(m)}
                        className="rounded-lg border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                          <m.icon className="h-3.5 w-3.5 text-primary" />
                          {m.label}
                        </p>
                        <p className="line-clamp-2 text-[11px] opacity-80">{m.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-1">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}

                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <div
                          className={`rounded-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'bg-muted/70 text-foreground border border-border/40'
                          }`}
                        >
                          {msg.content}

                          {/* Render user attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-primary-foreground/20">
                              {msg.attachments.map((att, attIdx) => {
                                const isImg = (att.mime_type || '').startsWith('image/');
                                const isAudio = (att.mime_type || '').startsWith('audio/');

                                return (
                                  <div
                                    key={att.id || attIdx}
                                    className="flex items-center gap-1.5 bg-black/20 rounded px-2 py-1 text-[11px]"
                                  >
                                    {isImg ? (
                                      <ImageIcon className="h-3.5 w-3.5" />
                                    ) : isAudio ? (
                                      <MusicIcon className="h-3.5 w-3.5" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5" />
                                    )}
                                    <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                                    {att.size && (
                                      <span className="opacity-75 text-[10px]">
                                        ({(att.size / 1024).toFixed(0)}KB)
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Speaker button for assistant messages */}
                        {msg.role === 'assistant' && msg.content && (
                          <div className="flex items-center justify-start">
                            <button
                              type="button"
                              onClick={() => handleSpeakMessage(msg.id || i, msg.content)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1 py-0.5 rounded transition-colors"
                              aria-label={speakingMessageId === (msg.id || i) ? 'Stop speaking' : 'Read response aloud'}
                              title={speakingMessageId === (msg.id || i) ? 'Stop speaking' : 'Read response aloud'}
                            >
                              {speakingMessageId === (msg.id || i) ? (
                                <>
                                  <VolumeX className="h-3.5 w-3.5 text-primary animate-pulse" />
                                  <span className="text-[10px] text-primary font-medium">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3.5 w-3.5" />
                                  <span className="text-[10px]">Read aloud</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-foreground mt-1 text-xs font-bold">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-3 justify-start items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-lg bg-muted/70 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2 border border-border/40">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        {assistantIdentity.shortName} is thinking...
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </CardContent>

            <div className="border-t border-border/40 p-3">
              {/* Attachment Preview Tray */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-muted/40 border border-border/40">
                  {pendingAttachments.map((item, idx) => {
                    const isImg = item.file.type.startsWith('image/');
                    const isDoc =
                      item.file.type.includes('pdf') ||
                      item.file.type.includes('text') ||
                      item.file.type.includes('json');
                    const isAudio = item.file.type.startsWith('audio/');

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-card border border-border/60 rounded px-2 py-1 text-xs"
                      >
                        {isImg && item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="h-6 w-6 object-cover rounded"
                          />
                        ) : isDoc ? (
                          <FileText className="h-4 w-4 text-blue-500" />
                        ) : isAudio ? (
                          <MusicIcon className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="truncate max-w-[120px] text-[11px] font-medium">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({(item.file.size / 1024).toFixed(0)}KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingAttachment(idx)}
                          className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                          aria-label="Remove attachment"
                          title="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES.join(',')}
                className="hidden"
                onChange={handleAttachmentSelection}
              />

              {recorder.isRecording ? (
                <div className="flex items-center justify-between bg-muted/60 p-2.5 rounded-lg border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-mono font-semibold text-red-500">
                      Recording {formatElapsedTime(recorder.elapsedMs)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelRecording}
                      aria-label="Cancel recording"
                      title="Cancel recording"
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleStopRecording}
                      disabled={transcribing}
                      aria-label="Stop recording"
                      title="Stop recording"
                      className="h-8 px-2.5 text-xs"
                    >
                      {transcribing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Square className="h-3.5 w-3.5 mr-1 fill-current" />
                      )}
                      {transcribing ? 'Transcribing...' : 'Stop'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Attach files"
                    title="Attach files"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || loadingInitial || uploadingAttachments || transcribing}
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Start voice recording"
                    title="Start voice recording"
                    onClick={handleStartRecording}
                    disabled={loading || loadingInitial || uploadingAttachments || transcribing}
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>

                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      uploadingAttachments
                        ? 'Uploading attachments...'
                        : transcribing
                        ? 'Transcribing voice audio...'
                        : `Ask ${assistantIdentity.name} in ${selectedMode.replace('_', ' ')} mode...`
                    }
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={loading || loadingInitial || uploadingAttachments || transcribing}
                    className="text-xs"
                  />

                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={
                      loading ||
                      loadingInitial ||
                      uploadingAttachments ||
                      transcribing ||
                      (!input.trim() && pendingAttachments.length === 0)
                    }
                    aria-label="Send message"
                    title="Send message"
                    className="h-9 w-9 shrink-0"
                  >
                    {loading || uploadingAttachments ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

