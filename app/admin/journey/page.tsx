import { PageContainer, PageHeader } from '@/components/common';
import { AdminForm } from '@/components/common/admin-form';
import type { AdminFormField } from '@/components/common/admin-form';

const fields: AdminFormField[] = [
  { name: 'title', label: 'Entry Title', type: 'text', placeholder: 'Started AI Nexus Block', required: true },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'started-ai-nexus-block', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What happened?', required: true, full: true },
  { name: 'entry_date', label: 'Entry Date', type: 'text', placeholder: '2024-01', required: true },
  { name: 'milestone_type', label: 'Milestone Type', type: 'select', options: [
    { value: 'project', label: 'Project' },
    { value: 'learning', label: 'Learning' },
    { value: 'career', label: 'Career' },
    { value: 'achievement', label: 'Achievement' },
    { value: 'other', label: 'Other' },
  ], defaultValue: 'project' },
  { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'platform, ai', full: true },
  { name: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://...' },
  { name: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
  { name: 'published', label: 'Published', type: 'switch', defaultValue: true },
  { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
];

export default function AdminJourneyPage() {
  return (
    <PageContainer>
      <PageHeader title="Manage Journey" description="Add, edit, and delete journey entries." />
      <div className="mt-8 max-w-3xl">
        <AdminForm
          title="Add Journey Entry"
          description="Document a milestone in your engineering journey."
          fields={fields}
        />
      </div>
    </PageContainer>
  );
}
