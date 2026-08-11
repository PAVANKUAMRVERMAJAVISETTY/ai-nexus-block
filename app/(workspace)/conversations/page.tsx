'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AIConversation, AIMessage } from '@/types/ai';
import { defaultAIProvider, type AIProviderId } from '@/config/ai';

export default function ConversationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [activeConversation, setActiveConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Loading States
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);

  // Input for active conversation follow-up
  const [replyInput, setReplyInput] = useState('');

  // Modals state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [targetRenameConv, setTargetRenameConv] = useState<AIConversation | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetDeleteConv, setTargetDeleteConv] = useState<AIConversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mobile View state
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Fetch list of conversations on mount.
  // `fetchConversations` is intentionally omitted: it is redefined on every
  // render, so listing it as a dependency would refetch in a loop. The effect
  // is meant to run exactly once.
  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch single conversation messages when selectedId changes
  useEffect(() => {
    if (selectedId) {
      fetchConversationDetails(selectedId);
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [selectedId]);

  const fetchConversations = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversations');
      setConversations(data.conversations || []);

      // If initialId provided in query param and exists in list, select it
      if (initialId && data.conversations?.some((c: AIConversation) => c.id === initialId)) {
        setSelectedId(initialId);
        setMobileShowDetail(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to load conversations. Please try again.');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchConversationDetails = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversation messages');
      setActiveConversation(data.conversation);
      setMessages(data.messages || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading conversation details');
      setSelectedId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle follow-up message send in active conversation
  const handleSendReply = async () => {
    if (!replyInput.trim() || sending || !selectedId || !activeConversation) return;

    const userText = replyInput.trim();
    setReplyInput('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: selectedId,
      role: 'user',
      content: userText,
      tokens_used: 0,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          mode: activeConversation.mode,
          provider: activeConversation.provider || defaultAIProvider,
          conversation_id: selectedId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMsg: AIMessage = {
        id: crypto.randomUUID(),
        conversation_id: selectedId,
        role: 'assistant',
        content: data.content,
        tokens_used: data.tokens_used || 0,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update conversation in state to refresh timestamp
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, updated_at: new Date().toISOString() } : c))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle Rename
  const openRenameModal = (conv: AIConversation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetRenameConv(conv);
    setNewTitleInput(conv.title);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRenameConv || !newTitleInput.trim()) return;

    setRenaming(true);
    try {
      const res = await fetch(`/api/conversations/${targetRenameConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitleInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename conversation');

      // Update local state
      setConversations((prev) =>
        prev.map((c) => (c.id === targetRenameConv.id ? { ...c, title: newTitleInput.trim() } : c))
      );
      if (activeConversation?.id === targetRenameConv.id) {
        setActiveConversation((prev) => (prev ? { ...prev, title: newTitleInput.trim() } : null));
      }

      toast.success('Conversation renamed successfully');
      setRenameDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error renaming conversation');
    } finally {
      setRenaming(false);
    }
  };

  // Handle Delete
  const openDeleteModal = (conv: AIConversation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetDeleteConv(conv);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetDeleteConv) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${targetDeleteConv.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete conversation');

      // Update local state
      setConversations((prev) => prev.filter((c) => c.id !== targetDeleteConv.id));
      if (selectedId === targetDeleteConv.id) {
        setSelectedId(null);
        setActiveConversation(null);
        setMessages([]);
        setMobileShowDetail(false);
      }

      toast.success('Conversation deleted');
      setDeleteDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting conversation');
    } finally {
      setDeleting(false);
    }
  };

  // Filter conversations by Search Query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.provider.toLowerCase().includes(query) ||
        c.mode.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Group conversations by Date
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 6 * 86400000;

    const groups = {
      today: [] as AIConversation[],
      yesterday: [] as AIConversation[],
      previous7Days: [] as AIConversation[],
      older: [] as AIConversation[],
    };

    filteredConversations.forEach((conv) => {
      const time = new Date(conv.updated_at || conv.created_at).getTime();
      if (time >= startOfToday) {
        groups.today.push(conv);
      } else if (time >= startOfYesterday) {
        groups.yesterday.push(conv);
      } else if (time >= startOf7Days) {
        groups.previous7Days.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Conversations"
        description="Your saved AI conversations"
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-210px)] min-h-[580px]">
        {/* LEFT PANEL: Conversation History List */}
        <div
          className={`lg:col-span-5 flex flex-col space-y-4 border-r border-border/30 pr-0 lg:pr-4 ${
            mobileShowDetail ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header Controls: Search & New Conversation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <Button
              onClick={() => router.push('/assistant')}
              className="h-9 px-3 text-xs shrink-0 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </div>

          {/* Grouped List Content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            {loadingList ? (
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/30 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-dashed border-border/40 rounded-lg">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  {searchQuery ? 'No conversations found.' : 'No conversations yet.'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery
                    ? 'Try adjusting your search terms.'
                    : 'Start a conversation with AI Nexus Assistant.'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => router.push('/assistant')}
                  >
                    Start AI Session
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ConversationSection
                  title="Today"
                  items={groupedConversations.today}
                  selectedId={selectedId}
                  onSelect={selectConversation}
                  onRename={openRenameModal}
                  onDelete={openDeleteModal}
                />
                <ConversationSection
                  title="Yesterday"
                  items={groupedConversations.yesterday}
                  selectedId={selectedId}
                  onSelect={selectConversation}
                  onRename={openRenameModal}
                  onDelete={openDeleteModal}
                />
                <ConversationSection
                  title="Previous 7 Days"
                  items={groupedConversations.previous7Days}
                  selectedId={selectedId}
                  onSelect={selectConversation}
                  onRename={openRenameModal}
                  onDelete={openDeleteModal}
                />
                <ConversationSection
                  title="Older"
                  items={groupedConversations.older}
                  selectedId={selectedId}
                  onSelect={selectConversation}
                  onRename={openRenameModal}
                  onDelete={openDeleteModal}
                />
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Active Conversation View */}
        <div
          className={`lg:col-span-7 flex flex-col h-full ${
            !mobileShowDetail ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedId && activeConversation ? (
            <Card className="flex flex-col h-full border-border/40 bg-card">
              {/* Header Bar */}
              <CardHeader className="border-b border-border/40 py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8 text-muted-foreground"
                    onClick={() => setMobileShowDetail(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <CardTitle className="text-sm font-bold truncate">
                      {activeConversation.title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                        {activeConversation.provider}
                      </Badge>
                      <span>•</span>
                      <span className="capitalize">
                        {activeConversation.mode.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => openRenameModal(activeConversation)}
                    title="Rename conversation"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteModal(activeConversation)}
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              {/* Messages Body (Oldest First, Latest at Bottom) */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingDetail ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2" />
                    <p className="text-sm font-medium">No messages in this conversation yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-1">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'bg-muted/70 text-foreground border border-border/40'
                          }`}
                        >
                          {msg.content}
                          <div className="mt-1 text-[10px] opacity-60 text-right">
                            {formatRelativeTime(msg.created_at)}
                          </div>
                        </div>

                        {msg.role === 'user' && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-foreground mt-1 text-xs font-bold">
                            <UserIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}

                    {sending && (
                      <div className="flex gap-3 justify-start items-center">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-lg bg-muted/70 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2 border border-border/40">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          Generating AI response...
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                )}
              </CardContent>

              {/* Reply Input Footer */}
              <div className="border-t border-border/40 p-3">
                <div className="flex gap-2">
                  <Input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder={`Continue conversation in ${activeConversation.mode.replace('_', ' ')} mode...`}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                    disabled={sending || loadingDetail}
                    className="text-xs"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendReply}
                    disabled={sending || loadingDetail || !replyInput.trim()}
                    aria-label="Send message"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center h-full border-border/40 bg-card p-6 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Select a conversation</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Choose a saved session from the list on the left to view message history or start a fresh session.
              </p>
              <Button onClick={() => router.push('/assistant')} className="text-xs flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Start New AI Session
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* RENAME DIALOG */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Rename Conversation</DialogTitle>
              <DialogDescription className="text-xs">
                Enter a new title for this conversation session.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                placeholder="Conversation Title"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameDialogOpen(false)}
                disabled={renaming}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renaming || !newTitleInput.trim()}>
                {renaming ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Title
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              All messages in this conversation will also be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

// Subcomponent: Group Section Item List
function ConversationSection({
  title,
  items,
  selectedId,
  onSelect,
  onRename,
  onDelete,
}: {
  title: string;
  items: AIConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (conv: AIConversation, e?: React.MouseEvent) => void;
  onDelete: (conv: AIConversation, e?: React.MouseEvent) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {title}
      </h4>
      <div className="space-y-1">
        {items.map((conv) => {
          const isSelected = selectedId === conv.id;
          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                isSelected
                  ? 'border-primary/50 bg-primary/10 text-foreground font-medium'
                  : 'border-border/30 bg-card hover:bg-accent/40 text-foreground'
              }`}
            >
              <div className="truncate pr-2 space-y-1">
                <p className="font-semibold truncate">{conv.title}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="capitalize text-primary font-medium">{conv.provider}</span>
                  <span>•</span>
                  <span className="capitalize">{conv.mode.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(conv.updated_at || conv.created_at)}</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={(e) => onRename(conv, e)} className="text-xs cursor-pointer">
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => onDelete(conv, e)}
                    className="text-xs cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Relative time formatting helper
function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
