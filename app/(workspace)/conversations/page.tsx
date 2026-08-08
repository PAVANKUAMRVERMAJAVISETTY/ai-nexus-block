import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { MessageSquare } from 'lucide-react';

export default function ConversationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Conversations"
        description="Your AI assistant conversation history."
      />
      <div className="mt-8">
        <EmptyState
          icon={<MessageSquare className="h-10 w-10" />}
          title="No conversations yet"
          description="Start a conversation with the AI assistant to see it here."
        />
      </div>
    </PageContainer>
  );
}
