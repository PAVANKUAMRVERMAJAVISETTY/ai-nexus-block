# AI NEXUS BLOCK — PHASE 10

## MULTIMODAL + VOICE

### A. Storage
- [ ] Private nexus-user-attachments bucket
- [ ] Ownership/RLS policies
- [ ] user_id/conversation_id storage path
- [ ] MIME validation
- [ ] 10 MB/file limit
- [ ] attachment count limit

### B. Upload
- [ ] services/media/index.ts implementation
- [ ] POST /api/media/upload
- [ ] authenticated ownership
- [ ] attachment metadata response

### C. AI Types
- [ ] AIAttachment type
- [ ] AIRequest.attachments
- [ ] AI message metadata support

### D. Multimodal Providers
- [ ] Gemini vision payload
- [ ] OpenAI vision payload
- [ ] verify current Claude status before changing
- [ ] text-only fallback for Groq
- [ ] text-only fallback for Mistral
- [ ] text-only fallback for Ollama

### E. Voice Input
- [ ] MediaRecorder hook
- [ ] microphone UI
- [ ] POST /api/ai/transcribe
- [ ] transcription integration into conversation

### F. Voice Output
- [ ] speechSynthesis integration
- [ ] play/stop control
- [ ] graceful browser unsupported state

### G. Assistant UI
- [ ] Paperclip
- [ ] image preview
- [ ] document preview
- [ ] remove attachment
- [ ] recording state
- [ ] recording timer
- [ ] stop/cancel recording
- [ ] assistant TTS control

### H. Tests
- [ ] media-upload.test.ts
- [ ] multimodal-provider.test.ts
- [ ] fallback-degradation.test.ts
- [ ] voice-transcribe.test.ts
- [ ] assistant attachment rendering
- [ ] TypeScript
- [ ] full test suite
- [ ] production build
- [ ] live runtime verification
