import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
  return (
    <PageContainer>
      <PageHeader title="Users" description="Manage user accounts and roles." />
      <div className="mt-8">
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No users yet"
          description="User accounts will appear here once authentication is implemented."
        />
      </div>
    </PageContainer>
  );
}
