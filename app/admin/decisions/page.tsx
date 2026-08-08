import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'title', label: 'Decision Title', type: 'text', placeholder: 'Use Supabase for database', required: true },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'use-supabase-database', required: true },
  { name: 'context', label: 'Context', type: 'textarea', placeholder: 'Why is this decision needed?', required: true, full: true },
  { name: 'decision', label: 'Decision', type: 'textarea', placeholder: 'What was decided?', required: true, full: true },
  { name: 'rationale', label: 'Rationale', type: 'textarea', placeholder: 'Why this choice?', required: true, full: true },
  { name: 'alternatives', label: 'Alternatives Considered', type: 'textarea', placeholder: 'What else was considered?', full: true },
  { name: 'consequences', label: 'Consequences', type: 'textarea', placeholder: 'What are the impacts?', full: true },
  { name: 'status', label: 'Status', type: 'select', options: [
    { value: 'proposed', label: 'Proposed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'superseded', label: 'Superseded' },
  ], defaultValue: 'proposed' },
  { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'database, architecture', full: true },
  { name: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
  { name: 'published', label: 'Published', type: 'switch', defaultValue: true },
  { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
];

export default function AdminDecisionsPage() {
  return (
    <PageContainer>
      <PageHeader title="Engineering Decisions" description="Document architecture decision records." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Add Decision Record"
          description="Record an engineering decision with context and rationale."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
